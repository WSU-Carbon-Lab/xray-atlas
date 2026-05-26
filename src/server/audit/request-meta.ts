/**
 * Request-derived metadata attached to audit rows (source IP, user agent, session id).
 */
export interface AuditRequestMeta {
  sourceIp?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

/**
 * Extracts client IP and user agent from HTTP headers using the same forwarded-header
 * precedence as tRPC context construction.
 */
export function extractAuditRequestMeta(
  headers: Headers,
): AuditRequestMeta {
  return {
    sourceIp: getClientIpFromHeaders(headers),
    userAgent: headers.get("user-agent")?.trim() ?? null,
  };
}

/**
 * Builds audit request metadata from tRPC context fields when full `Headers` are unavailable.
 */
export function auditRequestMetaFromTrpcContext(meta: {
  clientIp: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}): AuditRequestMeta {
  return {
    sourceIp: meta.clientIp,
    userAgent: meta.userAgent ?? null,
    sessionId: meta.sessionId ?? null,
  };
}

function getClientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}
