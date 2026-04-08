/**
 * ORCID identifier validation and normalization shared by profile and admin flows.
 * Does not perform network calls; callers persist the normalized bare iD (no URL prefix).
 */
import { z } from "zod";

/**
 * Accepts a bare ORCID iD (`0000-0001-2345-6789`) or a full `orcid.org` / `sandbox.orcid.org` URL.
 * Use after {@link normalizeOrcidUserInput} when the value is non-empty.
 */
export const orcidIdSchema = z
  .string()
  .regex(
    /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/,
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
 * @returns Normalized bare ORCID iD suitable for `user.orcid`.
 */
export function parseOrcidForStorage(raw: string): string {
  const parsed = orcidIdSchema.safeParse(raw.trim());
  if (!parsed.success) {
    throw parsed.error;
  }
  return normalizeOrcidUserInput(parsed.data);
}
