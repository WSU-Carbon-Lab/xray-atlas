import { TRPCClientError } from "@trpc/client";

/**
 * Headline shown when Atlas catalog data cannot reach Supabase/Postgres.
 * Matches the beam-dump server-error voice without implying a full page fault.
 */
export const DATABASE_UNAVAILABLE_TITLE = "Catalog database unreachable";

/**
 * Reader-facing explanation for transient database or API outages affecting catalog data.
 */
export const databaseUnavailableMessage =
  "Our catalog database is temporarily unreachable. Search, browse, and saved catalog data may be unavailable until connectivity is restored. Try again in a moment.";

const PRISMA_UNAVAILABLE_CODES = new Set([
  "P1001",
  "P1008",
  "P1011",
  "P1017",
  "P2010",
]);

const MESSAGE_UNAVAILABLE_PATTERNS: readonly RegExp[] = [
  /\bconnection timed out\b/i,
  /\bconnection timeout\b/i,
  /\btimeout expired\b/i,
  /\bcan't reach database\b/i,
  /\bcannot reach database\b/i,
  /\bconnection terminated\b/i,
  /\becircuitbreaker\b/i,
  /\btoo many authentication failures\b/i,
  /\bserver closed the connection\b/i,
  /\beconnrefused\b/i,
  /\beconnreset\b/i,
  /\betimedout\b/i,
  /\bfailed to fetch\b/i,
  /\bnetwork(?:\s+request)? failed\b/i,
  /\bload failed\b/i,
  /\bunexpected token\b/i,
  /\bunexpected end of json input\b/i,
  /\bfunction_invocation_failed\b/i,
  /\bservice unavailable\b/i,
  /\bbad gateway\b/i,
  /\bgateway timeout\b/i,
  /\b502\b/,
  /\b503\b/,
  /\b504\b/,
];

function readErrorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    const parts = [error.message];
    if (error.cause instanceof Error && error.cause.message) {
      parts.push(error.cause.message);
    }
    return parts.join(" ");
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

function readTrpcHttpStatus(error: unknown): number | null {
  if (!(error instanceof TRPCClientError)) {
    return null;
  }
  const data = error.data as { httpStatus?: number } | undefined;
  return typeof data?.httpStatus === "number" ? data.httpStatus : null;
}

function readTrpcCode(error: unknown): string | null {
  if (!(error instanceof TRPCClientError)) {
    return null;
  }
  const data = error.data as { code?: string } | undefined;
  return typeof data?.code === "string" ? data.code : null;
}

function messageLooksLikeDatabaseUnavailable(message: string): boolean {
  if (!message.trim()) {
    return false;
  }
  if (/\bprisma\b/i.test(message)) {
    for (const code of PRISMA_UNAVAILABLE_CODES) {
      if (message.includes(code)) {
        return true;
      }
    }
  }
  return MESSAGE_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(message));
}

function isFetchFailure(error: unknown, message: string): boolean {
  if (error instanceof TypeError && /fetch/i.test(message)) {
    return true;
  }
  return /\bfailed to fetch\b/i.test(message) || /\bload failed\b/i.test(message);
}

/**
 * Classifies whether `error` indicates Supabase/Postgres or the tRPC transport is unavailable,
 * as opposed to validation, authorization, or missing-resource failures.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  const message = readErrorMessage(error);
  const httpStatus = readTrpcHttpStatus(error);
  const trpcCode = readTrpcCode(error);

  if (httpStatus != null && httpStatus >= 502 && httpStatus <= 504) {
    return true;
  }

  if (trpcCode === "INTERNAL_SERVER_ERROR" && messageLooksLikeDatabaseUnavailable(message)) {
    return true;
  }

  if (isFetchFailure(error, message)) {
    return true;
  }

  if (messageLooksLikeDatabaseUnavailable(message)) {
    return true;
  }

  if (error instanceof TRPCClientError && trpcCode === "INTERNAL_SERVER_ERROR") {
    const lowered = message.toLowerCase();
    if (
      lowered.includes("database") ||
      lowered.includes("postgres") ||
      lowered.includes("supabase") ||
      lowered.includes("pooler")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the standard catalog database outage copy when `error` is classified as unavailable;
 * otherwise returns a sanitized generic load failure string.
 */
export function resolveDatabaseErrorMessage(error: unknown): string {
  if (isDatabaseUnavailableError(error)) {
    return databaseUnavailableMessage;
  }
  const message = readErrorMessage(error).trim();
  return message || "We could not load this data. Please try again in a moment.";
}
