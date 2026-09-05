import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";
import { env } from "../utils/env";

export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Express 4 does not forward rejections from async handlers; this does. */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, error: `No route for ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: "Request validation failed",
      message: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error({ error }, "unhandled error");
  res.status(500).json({
    success: false,
    error: env.nodeEnv === "production" ? "Internal server error" : message,
  });
};
