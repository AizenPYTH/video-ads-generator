import { AppError, AppErrorCode } from "@/lib/errors/app-error";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "metadata",
]);

const PRIVATE_IPV4_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
];

const PRIVATE_IPV6_PATTERNS = [
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
];

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isPrivateIp(hostname: string): boolean {
  if (PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(hostname))) {
    return true;
  }

  const normalized = hostname.replace(/^\[|\]$/g, "");
  return PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(lower)) {
    return true;
  }

  if (lower.endsWith(".localhost") || lower.endsWith(".local")) {
    return true;
  }

  if (isPrivateIp(lower)) {
    return true;
  }

  return false;
}

export interface ValidatedUrl {
  href: string;
  hostname: string;
  protocol: string;
}

export function validateUrl(input: string): ValidatedUrl {
  let parsed: URL;

  try {
    parsed = new URL(input.trim());
  } catch {
    throw new AppError(AppErrorCode.VALIDATION_ERROR, "Invalid URL format");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new AppError(
      AppErrorCode.VALIDATION_ERROR,
      "Only HTTP and HTTPS URLs are allowed",
    );
  }

  if (!parsed.hostname) {
    throw new AppError(AppErrorCode.VALIDATION_ERROR, "URL must have a hostname");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new AppError(
      AppErrorCode.SSRF_BLOCKED,
      "URL points to a blocked or private address",
    );
  }

  if (parsed.username || parsed.password) {
    throw new AppError(
      AppErrorCode.VALIDATION_ERROR,
      "URLs with embedded credentials are not allowed",
    );
  }

  return {
    href: parsed.href,
    hostname: parsed.hostname,
    protocol: parsed.protocol,
  };
}

export function isAllowedUrl(input: string): boolean {
  try {
    validateUrl(input);
    return true;
  } catch {
    return false;
  }
}
