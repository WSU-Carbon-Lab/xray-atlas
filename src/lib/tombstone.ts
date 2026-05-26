/**
 * Tombstone and erasure-scope contracts for compliance Phase 4 takedown prep (spec sections 4.4, 9).
 * Schema only in Wave 2 Track D; attribution repointing on `molecules` / `experiments` is a follow-up migration.
 */

/** Canonical `user_tombstone.erasure_scope` values from the compliance spec section 9.1. */
export const USER_ERASURE_SCOPES = [
  "personal_data",
  "account_deletion",
] as const;

/** Allowed values persisted on `next_auth.user_tombstone.erasure_scope`. */
export type UserErasureScope = (typeof USER_ERASURE_SCOPES)[number];

/**
 * Narrows a string to {@link UserErasureScope} when it matches a canonical scope literal.
 *
 * @param value - Candidate scope from API input or stored row data.
 */
export function isUserErasureScope(value: string): value is UserErasureScope {
  return (USER_ERASURE_SCOPES as readonly string[]).includes(value);
}

/**
 * Chooses the display name snapshot stored on a tombstone row for the given erasure scope.
 *
 * @param scope - Erasure intent; `account_deletion` may retain a non-identifying display label.
 * @param displayName - Live `user.name` at erasure time, if any.
 * @returns `null` for personal-data erasure; otherwise the trimmed display name or `null` when absent.
 */
export function preservedDisplayForErasureScope(
  scope: UserErasureScope,
  displayName: string | null | undefined,
): string | null {
  if (scope === "personal_data") {
    return null;
  }
  const trimmed = displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
