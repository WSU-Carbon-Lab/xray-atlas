/**
 * Pure URL codec for `FacetSelection` — no React dependencies.
 *
 * Serializes selection state into `URLSearchParams` using comma-joined UUIDs
 * per field key (`edge`, `mol`, `instrument`, `contributor`), and parses it
 * back. A legacy single-value key (e.g. `?edge=<uuid>`) is treated as a
 * one-element array so existing shared links remain valid without redirects.
 */

import type { FacetField, FacetSelection } from "./types";

const FACET_FIELDS: readonly FacetField[] = [
  "edge",
  "mol",
  "instrument",
  "contributor",
] as const;

/**
 * Initializes an empty `FacetSelection` with one empty array per field.
 *
 * Use as the default value when there is no URL state to parse.
 */
export function emptyFacetSelection(): FacetSelection {
  return { edge: [], mol: [], instrument: [], contributor: [] };
}

/**
 * Writes the facet selection into `sp`, setting or deleting keys as needed.
 *
 * Sets `field=id1,id2,...` for non-empty selections; deletes the key for
 * empty fields so the URL stays clean. Callers are responsible for pushing
 * the updated `URLSearchParams` to the router.
 *
 * @param sp - `URLSearchParams` instance mutated in place.
 * @param sel - Selection state to serialize.
 */
export function writeFacetParams(
  sp: URLSearchParams,
  sel: FacetSelection,
): void {
  for (const f of FACET_FIELDS) {
    const ids = sel[f];
    if (ids.length > 0) {
      sp.set(f, ids.join(","));
    } else {
      sp.delete(f);
    }
  }
}

/**
 * Parses facet selection from `URLSearchParams`, returning empty arrays for
 * absent or empty-string keys.
 *
 * A legacy single-value key (e.g. `?edge=<uuid>`) is normalized to a
 * one-element array, preserving backward compatibility with pre-unified URLs.
 * Empty segments from malformed comma strings (e.g. `edge=a,,b`) are filtered
 * out.
 *
 * @param sp - `URLSearchParams` to read from.
 * @returns Selection with one array per field; never contains `null` entries.
 */
export function readFacetParams(sp: URLSearchParams): FacetSelection {
  const out = emptyFacetSelection();
  for (const f of FACET_FIELDS) {
    const raw = sp.get(f);
    out[f] = raw ? raw.split(",").filter(Boolean) : [];
  }
  return out;
}
