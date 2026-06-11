import type { PubChemLookupResult } from "./lookup-form-helpers";

const CACHE_VERSION = "v1";
const CACHE_PREFIX = `xray-atlas:pubchem-cid:${CACHE_VERSION}:`;
const MAX_ENTRIES = 40;

type CacheEntry = {
  storedAt: number;
  data: PubChemLookupResult;
};

function readStore(): Record<string, CacheEntry> {
  if (typeof sessionStorage === "undefined") {
    return {};
  }
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}index`);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    return parsed as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, CacheEntry>): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      const sorted = [...keys].sort(
        (a, b) => (store[a]?.storedAt ?? 0) - (store[b]?.storedAt ?? 0),
      );
      for (const key of sorted.slice(0, keys.length - MAX_ENTRIES)) {
        delete store[key];
      }
    }
    sessionStorage.setItem(`${CACHE_PREFIX}index`, JSON.stringify(store));
  } catch {
    // Quota or private browsing: skip cache persistence.
  }
}

/**
 * Reads a cached PubChem compound detail payload for `cid` from the current tab session.
 *
 * @param cid - PubChem compound identifier.
 */
export function readPubChemCidCache(cid: string): PubChemLookupResult | null {
  const trimmed = cid.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const store = readStore();
  return store[trimmed]?.data ?? null;
}

/**
 * Stores PubChem compound detail in the tab session for repeat candidate picks.
 *
 * @param cid - PubChem compound identifier.
 * @param data - Normalized compound properties from the external router.
 */
export function writePubChemCidCache(
  cid: string,
  data: PubChemLookupResult,
): void {
  const trimmed = cid.trim();
  if (trimmed.length === 0) {
    return;
  }
  const store = readStore();
  store[trimmed] = { storedAt: Date.now(), data };
  writeStore(store);
}
