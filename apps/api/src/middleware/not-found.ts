import type { Request, Response } from "express";
import { ERROR_CODES, type ApiErrorBody } from "@foryou/shared";

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `No route matches ${req.method} ${req.originalUrl}`,
    },
  };
  res.status(404).json(body);
}
