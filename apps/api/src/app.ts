import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { allowedOrigins } from "./config/env.js";
import { requestContext } from "./middleware/request-context.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { apiRouter } from "./routes/index.js";
import { registerEventSubscribers } from "./bootstrap/events.js";
import { maintenanceMode } from "./middleware/maintenance-mode.js";

export function createApp(): Express {
  registerEventSubscribers();
  const app = express();

  app.set("trust proxy", 1); // behind Nginx (architecture doc §12)

  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Coarse global baseline — per-route limits (auth, OTP, offers, withdrawals)
  // are layered on top of this using the Redis-backed store, see §08/§09.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(healthRouter);
  app.use("/api/v1", maintenanceMode, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
