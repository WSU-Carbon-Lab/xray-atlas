/**
 * Canonical audit `eventType` values from compliance spec section 4.3, plus account link lifecycle events.
 */
export const AUDIT_EVENT_TYPES = [
  "user.create",
  "user.disable",
  "user.enable",
  "user.delete",
  "role.assign",
  "role.revoke",
  "authenticator.enroll",
  "authenticator.use",
  "authenticator.revoke",
  "session.create",
  "session.expire",
  "consent.accept",
  "takedown.execute",
  "account.link.complete",
  "account.unlink",
] as const;

/** Identifies a row in `next_auth.audit_event`. */
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

/** Returns whether `value` is a registered audit event type string. */
export function isAuditEventType(value: string): value is AuditEventType {
  return (AUDIT_EVENT_TYPES as readonly string[]).includes(value);
}
