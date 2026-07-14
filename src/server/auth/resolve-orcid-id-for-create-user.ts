import { isLegacyUserUuidSegment, parseOrcidForStorage } from "~/lib/orcid";

/**
 * Resolves the bare ORCID iD Auth.js should persist as `user.id` on first sign-in.
 *
 * Auth.js OAuth intentionally replaces `profile.id` with `crypto.randomUUID()` before
 * calling the adapter `createUser`, while keeping `profile.email` (lowercased). ORCID
 * `openid` does not supply an email, so the ORCID provider carries the bare iD in
 * `email`. This helper prefers a parseable `email`, then a non-UUID `id`.
 *
 * @param data - Adapter `createUser` payload fields that may carry the ORCID.
 * @returns Bare ORCID iD suitable for `next_auth.user.id`.
 * @throws {Error} `ORCID_SIGN_IN_MISSING_ID` when no ORCID-bearing field is present
 *   (including when Auth.js left only a random UUID in `id`).
 * @throws {Error} `ORCID_SIGN_IN_INVALID_ID` when a non-empty candidate is present but
 *   none parses as an ORCID iD.
 */
export function resolveOrcidIdForCreateUser(data: {
  id?: string | null;
  email?: string | null;
}): string {
  const candidates = [data.email, data.id];
  let sawOrcidShapedCandidate = false;
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) {
      continue;
    }
    const trimmed = candidate.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (isLegacyUserUuidSegment(trimmed)) {
      continue;
    }
    sawOrcidShapedCandidate = true;
    try {
      return parseOrcidForStorage(trimmed);
    } catch {
      continue;
    }
  }
  if (!sawOrcidShapedCandidate) {
    throw new Error("ORCID_SIGN_IN_MISSING_ID");
  }
  throw new Error("ORCID_SIGN_IN_INVALID_ID");
}
