export const AppErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  EBAY_ERROR: "EBAY_ERROR",
  STRIPE_ERROR: "STRIPE_ERROR",
  SSRF_BLOCKED: "SSRF_BLOCKED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  [AppErrorCode.UNAUTHORIZED]: 401,
  [AppErrorCode.FORBIDDEN]: 403,
  [AppErrorCode.NOT_FOUND]: 404,
  [AppErrorCode.VALIDATION_ERROR]: 400,
  [AppErrorCode.QUOTA_EXCEEDED]: 402,
  [AppErrorCode.RATE_LIMITED]: 429,
  [AppErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [AppErrorCode.EBAY_ERROR]: 502,
  [AppErrorCode.STRIPE_ERROR]: 502,
  [AppErrorCode.SSRF_BLOCKED]: 400,
  [AppErrorCode.INTERNAL_ERROR]: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { status?: number; details?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? STATUS_BY_CODE[code];
    this.details = options?.details;
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(AppErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = "Forbidden") {
    return new AppError(AppErrorCode.FORBIDDEN, message);
  }

  static notFound(message = "Not found") {
    return new AppError(AppErrorCode.NOT_FOUND, message);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(AppErrorCode.VALIDATION_ERROR, message, { details });
  }

  static quotaExceeded(message = "Quota exceeded") {
    return new AppError(AppErrorCode.QUOTA_EXCEEDED, message);
  }

  static internal(message = "Internal server error", cause?: unknown) {
    return new AppError(AppErrorCode.INTERNAL_ERROR, message, { cause });
  }
}
