import type { Molecule } from "openchemlib";

import type { DrawBondMark } from "../molecule-draw-types";
import { canonicalSmilesOf } from "./molecule-graph-editing";
import { extractBookendRegion } from "./polymer-bookends";

/**
 * Builds registry SMILES from a drawn molecule, preferring repeat-unit semantics
 * when both polymer bookends are set.
 *
 * When bookends bracket a repeat unit, returns the `[<]…[>]` repeat-unit SMILES
 * from {@link extractBookendRegion} instead of the full-molecule SMILES that would
 * include spurious terminal carbons at dangling bookend attachment points.
 *
 * @param mol - Drawn molecule; not mutated.
 * @param bookends - Optional opening and closing bookend bond marks.
 * @returns SMILES suitable for registry persistence and lookup.
 */
export function smilesForRegistryExport(
  mol: Molecule,
  bookends?: { open: DrawBondMark | null; close: DrawBondMark | null },
): string {
  if (
    bookends?.open !== null &&
    bookends?.open !== undefined &&
    bookends?.close !== null &&
    bookends?.close !== undefined
  ) {
    const extraction = extractBookendRegion(mol, bookends.open, bookends.close);
    if (extraction.ok) {
      return extraction.repeatUnitSmiles;
    }
  }
  return canonicalSmilesOf(mol);
}
