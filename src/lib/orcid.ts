/**
 * ORCID identifier validation and normalization shared by profile, admin, and auth flows.
 * Does not perform network calls; callers persist the normalized bare iD (no URL prefix).
 */
import { z } from "zod";

/** Bare ORCID iD format used as `next_auth.user.id` and in public `/users/<id>` routes. */
export const ORCID_USER_ID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/**
 * Validates a stored user primary key or route segment that must be a bare ORCID iD.
 */
export const orcidUserIdSchema = z
  .string()
  .regex(
    ORCID_USER_ID_REGEX,
    "Invalid ORCID iD format. Expected format: XXXX-XXXX-XXXX-XXXX",
  );

/**
 * Accepts a bare ORCID iD (`0000-0001-2345-6789`) or a full `orcid.org` / `sandbox.orcid.org` URL.
 * Use after {@link normalizeOrcidUserInput} when the value is non-empty.
 */
export const orcidIdSchema = z
  .string()
  .regex(
    ORCID_USER_ID_REGEX,
    "Invalid ORCID iD format. Expected format: XXXX-XXXX-XXXX-XXXX",
  )
  .or(
    z
      .string()
      .url()
      .refine((url) => url.includes("orcid.org"), "Must be a valid ORCID URL"),
  );

/**
 * Trims the input and strips common `http(s)://(sandbox.)orcid.org/` prefixes so callers can validate a single canonical form.
 *
 * @param raw - Raw user-entered ORCID or URL; may be empty after trim.
 * @returns The same string with leading/trailing whitespace removed and URL prefix removed when present; empty string if `raw` is only whitespace.
 */
export function normalizeOrcidUserInput(raw: string): string {
  let orcidId = raw.trim();
  if (orcidId.startsWith("https://")) {
    orcidId = orcidId
      .replace("https://orcid.org/", "")
      .replace("https://sandbox.orcid.org/", "");
  }
  if (orcidId.startsWith("http://")) {
    orcidId = orcidId
      .replace("http://orcid.org/", "")
      .replace("http://sandbox.orcid.org/", "");
  }
  return orcidId.trim();
}

/**
 * Parses non-empty user input as a bare ORCID iD or ORCID URL; throws a `ZodError` when the format is invalid.
 *
 * @param raw - Non-empty user input (callers use null/empty field for clear).
 * @returns Normalized bare ORCID iD suitable for `user.id`.
 */
export function parseOrcidForStorage(raw: string): string {
  const parsed = orcidIdSchema.safeParse(raw.trim());
  if (!parsed.success) {
    throw parsed.error;
  }
  return normalizeOrcidUserInput(parsed.data);
}

const LEGACY_USER_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns whether `segment` matches a legacy NextAuth user UUID used before the ORCID PK migration.
 */
export function isLegacyUserUuidSegment(segment: string): boolean {
  return LEGACY_USER_UUID_REGEX.test(segment);
}
