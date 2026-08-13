import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

/**
 * Attaches `req.id` + `req.log` (a child logger carrying that id) to every
 * request, and logs one structured line per request/response — this is the
 * id that also gets echoed into Sentry breadcrumbs and Loki log lines
 * (architecture doc §13) so an incident is traceable across all three.
 */
export const requestContext = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = typeof existing === "string" ? existing : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
