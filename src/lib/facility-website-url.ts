import { z } from "zod";

export const FACILITY_WEBSITE_URL_MAX_LENGTH = 2048;

const httpOrHttpsUrl = z
  .string()
  .url()
  .max(FACILITY_WEBSITE_URL_MAX_LENGTH)
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("http://"),
    { message: "URL must use http or https." },
  );

export const facilityWebsiteUrlInputSchema = z.union([
  z.literal(""),
  httpOrHttpsUrl,
]);

/**
 * Trims a candidate facility homepage URL and returns null when empty after trim.
 *
 * @param raw - User-entered URL string.
 * @returns Trimmed URL or null when unset.
 */
export function trimFacilityWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Parses and validates a facility homepage URL for tRPC and form submission.
 *
 * @param raw - User-entered URL string; empty string clears the stored URL.
 * @returns Validated absolute URL or null when cleared.
 * @throws ZodError when the value is non-empty but not a valid http(s) URL.
 */
export function parseFacilityWebsiteUrlInput(raw: string): string | null {
  const parsed = facilityWebsiteUrlInputSchema.parse(raw);
  if (parsed === "") {
    return null;
  }
  return parsed;
}

/**
 * Builds a Google favicon service URL for a public hostname (fallback when discovery fails).
 *
 * @param hostname - Host from a validated facility website URL.
 * @returns Absolute favicon URL suitable for `<img src>`.
 */
export function googleFaviconUrlForHostname(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
}
