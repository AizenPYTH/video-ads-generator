import { ZodError } from "zod";
import { AppError, AppErrorCode } from "./app-error";

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function toErrorResponse(error: unknown): {
  body: ErrorResponse;
  status: number;
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: AppErrorCode.VALIDATION_ERROR,
          message: "Validation failed",
          details: error.flatten(),
        },
      },
    };
  }

  if (error instanceof Error) {
    const isDev = process.env.NODE_ENV === "development";
    return {
      status: 500,
      body: {
        error: {
          code: AppErrorCode.INTERNAL_ERROR,
          message: isDev ? error.message : "Internal server error",
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: AppErrorCode.INTERNAL_ERROR,
        message: "Internal server error",
      },
    },
  };
}

export function jsonErrorResponse(error: unknown): Response {
  const { body, status } = toErrorResponse(error);
  return Response.json(body, { status });
}
