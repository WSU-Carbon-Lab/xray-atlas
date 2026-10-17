/**
 * In-process cache for the wiki optical-constants showcase load.
 *
 * The optical-constants article awaits this payload before the MDX document
 * finishes. The load reads the showcase experiment and its spectrum rows.
 * This module stores that result so a later render reuses the caption and
 * spectrum curves. It does not recompute beta, delta, or any plotted channel.
 */

import {
  loadWikiOpticalConstantsExample,
  type WikiOpticalConstantsExampleResult,
} from "~/lib/wiki-optical-constants-example-data";

const CACHE_TTL_MS = 120_000;

interface ShowcaseCacheEntry {
  readonly storedAtMs: number;
  readonly result: WikiOpticalConstantsExampleResult;
}

let entry: ShowcaseCacheEntry | null = null;
let pending: Promise<WikiOpticalConstantsExampleResult> | null = null;

/**
 * Loads the wiki optical-constants showcase, reusing a result stored within the last 120 seconds.
 *
 * Concurrent callers share one in-flight load. A thrown load is not stored.
 * A successful `ok: false` result is stored so a missing showcase is not re-read on every request.
 *
 * @returns The same discriminated result as `loadWikiOpticalConstantsExample`, including spectrum curves when `ok` is true.
 */
export async function loadCachedWikiOpticalConstantsExample(): Promise<WikiOpticalConstantsExampleResult> {
  const now = Date.now();
  if (entry !== null && now - entry.storedAtMs < CACHE_TTL_MS) {
    return entry.result;
  }
  if (pending !== null) {
    return pending;
  }
  const load = loadWikiOpticalConstantsExample()
    .then((result) => {
      entry = { storedAtMs: Date.now(), result };
      return result;
    })
    .finally(() => {
      pending = null;
    });
  pending = load;
  return load;
}
