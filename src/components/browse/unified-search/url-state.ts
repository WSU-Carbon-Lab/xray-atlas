/**
 * Pure URL codec for `FacetSelection` — no React dependencies.
 *
 * Serializes facet selection into `URLSearchParams` using comma-joined UUIDs
 * per field key (`edge`, `mol`, `instrument`, `contributor`), and parses it
 * back. A legacy single-value key (e.g. `?edge=<uuid>`) is treated as a
 * one-element array so existing shared links remain valid without redirects.
 *
 * Acquisition and verification use `experimentType`, `verified`, and
 * `verificationSource` via `writeNexafsCatalogFilterParams` /
 * `readNexafsCatalogFilterParams`.
 */

import {
  parseExperimentTypeParam,
  parseVerificationSourceParam,
  parseVerifiedOnlyParam,
} from "../nexafs-browse-experiment-utils";
import type { FacetField, FacetSelection, NexafsCatalogFilters } from "./types";

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

/**
 * Initializes catalog filters with no acquisition constraint and verification off.
 */
export function emptyNexafsCatalogFilters(): NexafsCatalogFilters {
  return {
    experimentType: undefined,
    verifiedOnly: false,
    verificationSource: "either",
  };
}

/**
 * Writes acquisition and verification keys into `sp`, deleting keys when inactive.
 *
 * Uses `experimentType` (Prisma enum), `verified` (`1` when active), and
 * `verificationSource` (only when verified and not `"either"`).
 *
 * @param sp - `URLSearchParams` instance mutated in place.
 * @param filters - Catalog filter state to serialize.
 */
export function writeNexafsCatalogFilterParams(
  sp: URLSearchParams,
  filters: NexafsCatalogFilters,
): void {
  if (filters.experimentType) {
    sp.set("experimentType", filters.experimentType);
  } else {
    sp.delete("experimentType");
  }
  if (filters.verifiedOnly) {
    sp.set("verified", "1");
    if (filters.verificationSource !== "either") {
      sp.set("verificationSource", filters.verificationSource);
    } else {
      sp.delete("verificationSource");
    }
  } else {
    sp.delete("verified");
    sp.delete("verificationSource");
  }
}

/**
 * Parses acquisition and verification filters from shareable URL params.
 *
 * Legacy links may set only `experimentType`, `verified=1`/`true`, or
 * `verificationSource` without `verified`; the latter implies verified-only.
 *
 * @param sp - `URLSearchParams` to read from.
 */
export function readNexafsCatalogFilterParams(
  sp: URLSearchParams,
): NexafsCatalogFilters {
  return {
    experimentType: parseExperimentTypeParam(sp.get("experimentType")),
    verifiedOnly: parseVerifiedOnlyParam(sp),
    verificationSource: parseVerificationSourceParam(
      sp.get("verificationSource"),
    ),
  };
}
