/**
 * Opaque Atlas dataset ids for short citation URLs (`/d/{id}`).
 *
 * Ids are Crockford base32 (no i/l/o/u), 8 characters (~40 bits). They are
 * assigned once per experiment and stay stable for Zenodo related identifiers
 * and future DataCite suffixes (`10.prefix/xrayatlas.{id}`). They are not
 * derived from molecule names so synonym renames cannot break links.
 */

const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

const ATLAS_DATASET_ID_RE = /^[0-9a-hjkmnp-tv-z]{8}$/;

/**
 * True when `value` is a canonical 8-character Atlas dataset id.
 *
 * @param value - Candidate id (case-insensitive).
 */
export function isAtlasDatasetId(value: string | null | undefined): boolean {
  if (!value) return false;
  return ATLAS_DATASET_ID_RE.test(value.trim().toLowerCase());
}

/**
 * Normalizes a user- or URL-supplied Atlas dataset id to lowercase form.
 *
 * @param value - Raw path segment or query value.
 * @returns Normalized id, or `null` when invalid.
 */
export function normalizeAtlasDatasetId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isAtlasDatasetId(normalized) ? normalized : null;
}

/**
 * Generates a new random 8-character Atlas dataset id.
 *
 * Collision checks belong to the persistence layer (`ensureAtlasDatasetId`).
 */
export function generateAtlasDatasetId(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let n =
    BigInt(bytes[0]!) |
    (BigInt(bytes[1]!) << 8n) |
    (BigInt(bytes[2]!) << 16n) |
    (BigInt(bytes[3]!) << 24n) |
    (BigInt(bytes[4]!) << 32n);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out = CROCKFORD[Number(n & 31n)]! + out;
    n >>= 5n;
  }
  return out;
}

/**
 * Builds the relative Atlas dataset citation path.
 *
 * @param atlasDatasetId - Normalized 8-character id.
 * @returns Path like `/d/k7m2xq4n`.
 */
export function atlasDatasetPath(atlasDatasetId: string): string {
  const id = normalizeAtlasDatasetId(atlasDatasetId);
  if (!id) {
    throw new Error(`Invalid Atlas dataset id: ${atlasDatasetId}`);
  }
  return `/d/${id}`;
}
