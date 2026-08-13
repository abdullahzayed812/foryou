import type { Server as SocketIOServer } from "socket.io";
import { verifyAccessToken } from "../modules/auth/jwt.js";
import { logger } from "./logger.js";

let io: SocketIOServer | null = null;

/**
 * Wires JWT-handshake auth and per-user rooms onto an already-constructed
 * Socket.IO server (server.ts owns the HTTP server + Redis adapter). `io`
 * stays module-local rather than exported directly so callers go through
 * `emitToUser`, which safely no-ops when there's no real server attached —
 * true in every test run, since `createApp()`'s Supertest harness never
 * constructs one (architecture doc §01/§12: sockets share the API's HTTP
 * server, which tests don't spin up).
 */
export function attachSocketServer(server: SocketIOServer): void {
  io = server;

  server.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  server.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
    logger.debug({ userId, socketId: socket.id }, "socket connected");
  });
}

/** Real-time push for a persisted notification — the REST list is always the source of truth, this is just the live nudge. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
