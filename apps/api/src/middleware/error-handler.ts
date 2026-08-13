import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ERROR_CODES, type ApiErrorBody } from "@foryou/shared";
import { AppError } from "../lib/http-errors.js";
import { logger } from "../lib/logger.js";
import { captureError } from "../lib/monitoring.js";

/**
 * Express 5 forwards rejected promises from async route handlers to error
 * middleware automatically, so route/controller code can just `throw` —
 * no need to wrap every handler in a try/catch or an `asyncHandler` helper.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, reqId: req.id }, "unhandled AppError");
      captureError(err, { reqId: req.id, path: req.path });
    }
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Validation failed",
        details: err.flatten(),
      },
    };
    res.status(422).json(body);
    return;
  }

  logger.error({ err, reqId: req.id }, "unexpected error");
  captureError(err, { reqId: req.id, path: req.path });
  const body: ApiErrorBody = {
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Something went wrong" },
  };
  res.status(500).json(body);
};
