import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { API_URL } from "@/lib/api-url";
import { notificationsQueryKey, unreadCountQueryKey } from "./hooks";
import type { Notification } from "./types";

// Socket.IO shares the API's HTTP server at its root, not under /api/v1 (architecture doc §01/§12).
const SOCKET_ORIGIN = new URL(API_URL, window.location.origin).origin;

let socket: Socket | null = null;

/** Connects once per authenticated session; every notification push just invalidates the REST queries — the list stays the single source of truth. */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      socket?.disconnect();
      socket = null;
      return;
    }

    socket = io(SOCKET_ORIGIN, { auth: { token: accessToken }, transports: ["websocket"] });
    socket.on("notification:new", (_payload: Notification) => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [status, accessToken, queryClient]);
}
