/**
 * Browser-local dismissals for similar-dataset pairs the contributor marked
 * unique. Does not sync across devices; listing still omits pairs that fail
 * merge candidacy on the server.
 */

const STORAGE_KEY = "xray-atlas:dismissed-similar-pairs:v1";

interface DismissedSimilarPairsPayload {
  keys: string[];
}

function isDismissedSimilarPairsPayload(
  value: object,
): value is DismissedSimilarPairsPayload {
  if (!("keys" in value) || !Array.isArray(value.keys)) {
    return false;
  }
  return value.keys.every((entry) => typeof entry === "string");
}

/**
 * Builds a stable unordered pair key for local dismissal storage.
 *
 * @param aId - First experiment UUID.
 * @param bId - Second experiment UUID.
 */
export function similarPairDismissalKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
}

/**
 * Reads dismissed pair keys from `localStorage`.
 *
 * @returns A set of {@link similarPairDismissalKey} strings; empty on the
 *   server, parse failure, or missing storage.
 */
export function loadDismissedSimilarPairKeys(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: object = JSON.parse(raw) as object;
    if (!isDismissedSimilarPairsPayload(parsed)) {
      return new Set();
    }
    const keys = new Set<string>();
    for (const entry of parsed.keys) {
      if (entry.includes(":")) {
        keys.add(entry);
      }
    }
    return keys;
  } catch {
    return new Set();
  }
}

/**
 * Records that the contributor asserted the pair is unique, then returns the
 * updated dismissal set.
 *
 * @param aId - First experiment UUID.
 * @param bId - Second experiment UUID.
 */
export function persistDismissedSimilarPair(
  aId: string,
  bId: string,
): Set<string> {
  const next = loadDismissedSimilarPairKeys();
  next.add(similarPairDismissalKey(aId, bId));
  if (typeof window === "undefined") {
    return next;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        keys: [...next],
      } satisfies DismissedSimilarPairsPayload),
    );
  } catch {
    return next;
  }
  return next;
}
