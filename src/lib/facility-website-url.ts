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

/**
 * Extracts the hostname from a validated facility website URL for favicon preview.
 *
 * @param websiteUrl - Absolute http(s) facility homepage URL.
 * @returns Hostname when parseable, otherwise null.
 */
export function facilityWebsiteHostname(
  websiteUrl: string | null | undefined,
): string | null {
  const trimmed = websiteUrl ? trimFacilityWebsiteUrl(websiteUrl) : null;
  if (!trimmed) return null;
  try {
    return new URL(trimmed).hostname;
  } catch {
    return null;
  }
}

/**
 * Builds a client-side favicon preview URL for a draft or saved facility website.
 * Uses the persisted favicon when the draft matches the saved URL; otherwise falls back
 * to Google's favicon service for the draft hostname.
 *
 * @param draftWebsiteUrl - Current editor value.
 * @param savedWebsiteUrl - Persisted facility homepage URL.
 * @param savedFaviconUrl - Persisted favicon URL from the server.
 * @returns Preview URL suitable for `<img src>`, or null when no preview is available.
 */
export function facilityFaviconPreviewUrl(
  draftWebsiteUrl: string,
  savedWebsiteUrl: string | null,
  savedFaviconUrl: string | null,
): string | null {
  const draftTrimmed = trimFacilityWebsiteUrl(draftWebsiteUrl);
  if (!draftTrimmed) return null;

  const savedTrimmed = savedWebsiteUrl
    ? trimFacilityWebsiteUrl(savedWebsiteUrl)
    : null;
  const savedFaviconTrimmed = savedFaviconUrl?.trim() ?? "";

  if (
    savedTrimmed &&
    draftTrimmed === savedTrimmed &&
    savedFaviconTrimmed.length > 0
  ) {
    return savedFaviconTrimmed;
  }

  const hostname = facilityWebsiteHostname(draftTrimmed);
  return hostname ? googleFaviconUrlForHostname(hostname) : null;
}
