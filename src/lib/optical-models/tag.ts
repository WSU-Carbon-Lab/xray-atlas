/**
 * Short opaque tags for optical models (`/m/{tag}`).
 *
 * Tags share the alphabet and length of Atlas dataset ids (Crockford base32, 8 characters), so one
 * generator and one validator serve both. Collision checks belong to the persistence layer. This
 * module performs no I/O.
 */

import {
  generateAtlasDatasetId,
  normalizeAtlasDatasetId,
} from "~/lib/atlas-dataset-id";

/**
 * Random 8-character optical model tag in the Atlas dataset id alphabet.
 *
 * @returns A lowercase tag such as `k7m2xq4n`.
 */
export function generateOpticalModelTag(): string {
  return generateAtlasDatasetId();
}

/**
 * Lowercase form of a user- or URL-supplied optical model tag.
 *
 * @param raw - Path segment or query value, any case, surrounding whitespace allowed.
 * @returns The normalized tag, or `null` when `raw` is not a valid tag.
 */
export function normalizeOpticalModelTag(raw: string): string | null {
  return normalizeAtlasDatasetId(raw);
}
