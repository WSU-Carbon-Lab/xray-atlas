import type { Molecule } from "openchemlib";
import { Molecule as MoleculeCtor } from "openchemlib";

import type { DrawBondMark } from "../molecule-draw-types";
import { expandAllAbbreviatedAlkylLabels } from "./alkyl-label-expand";
import { cutChunkFragments, extractBookendRegion } from "./polymer-bookends";
import { smilesForStructureLookup } from "./polymer-export-smiles";

/** Role of a SMILES fragment used in component-wise structure lookup. */
export type StructureLookupComponentRole =
  | "full"
  | "repeat_unit"
  | "end_group"
  | "block";

/**
 * One searchable SMILES fragment derived from a drawn structure.
 *
 * `smiles` is normalized for PubChem (polymer attachment tokens removed).
 */
export interface StructureLookupComponent {
  role: StructureLookupComponentRole;
  smiles: string;
  label: string;
}

/**
 * Strips polymer attachment wildcards so PubChem SMILES search accepts the string.
 *
 * @param smiles - Raw fragment SMILES possibly containing `[<]`, `[>]`, `[*]`, or `[?:n]`.
 * @returns SMILES with attachment descriptors removed.
 */
export function normalizeComponentSmilesForPubchem(smiles: string): string {
  return smiles
    .replace(/\[\<\]/g, "")
    .replace(/\[\>\]/g, "")
    .replace(/\[\*\]/g, "")
    .replace(/\[\?\:\d+\]/g, "")
    .trim();
}

function addComponent(
  bucket: StructureLookupComponent[],
  seen: Set<string>,
  role: StructureLookupComponentRole,
  rawSmiles: string,
  label: string,
): void {
  const smiles = normalizeComponentSmilesForPubchem(rawSmiles);
  if (smiles.length === 0) {
    return;
  }
  const key = smiles.toLowerCase();
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  bucket.push({ role, smiles, label });
}

/**
 * Decomposes a drawn molecule into PubChem-searchable SMILES components.
 *
 * Expands abbreviated alkyl tails, emits the full structure, and when polymer
 * bookends or block cuts are present adds repeat-unit, end-group, and block
 * fragments instead of searching BigSMILES notation strings.
 *
 * @param mol - Drawn molecule; not mutated.
 * @param bookends - Optional repeat-unit bookend bond marks.
 * @param chunkMarks - Optional block-boundary cuts for multi-block polymers.
 * @returns Ordered, deduplicated components (full structure first when present).
 */
export function buildStructureLookupComponents(
  mol: Molecule,
  bookends?: { open: DrawBondMark | null; close: DrawBondMark | null },
  chunkMarks: readonly DrawBondMark[] = [],
): StructureLookupComponent[] {
  const copy = mol.getCompactCopy();
  copy.ensureHelperArrays(MoleculeCtor.cHelperNeighbours);
  expandAllAbbreviatedAlkylLabels(copy);

  const components: StructureLookupComponent[] = [];
  const seen = new Set<string>();

  const fullSmiles = smilesForStructureLookup(mol, bookends);
  addComponent(components, seen, "full", fullSmiles, "Full structure");

  if (
    bookends?.open !== null &&
    bookends?.open !== undefined &&
    bookends?.close !== null &&
    bookends?.close !== undefined
  ) {
    const extraction = extractBookendRegion(copy, bookends.open, bookends.close);
    if (extraction.ok) {
      addComponent(
        components,
        seen,
        "repeat_unit",
        extraction.repeatUnitSmiles,
        "Repeat unit",
      );
      if (extraction.leftEndSmiles) {
        addComponent(
          components,
          seen,
          "end_group",
          extraction.leftEndSmiles,
          "Left end group",
        );
      }
      if (extraction.rightEndSmiles) {
        addComponent(
          components,
          seen,
          "end_group",
          extraction.rightEndSmiles,
          "Right end group",
        );
      }
    }
  }

  if (chunkMarks.length > 0) {
    const chunks = cutChunkFragments(copy, [...chunkMarks]);
    if (chunks.ok) {
      chunks.fragments.forEach((fragment, index) => {
        addComponent(
          components,
          seen,
          "block",
          fragment.smiles,
          `Block ${index + 1}`,
        );
      });
    }
  }

  if (components.length === 0 && fullSmiles.length > 0) {
    addComponent(components, seen, "full", fullSmiles, "Full structure");
  }

  return components;
}

/**
 * Parses polymer attachment tokens from a registry SMILES string into components.
 *
 * Used when lookup is invoked with a SMILES string alone (no live molfile).
 *
 * @param smiles - Registry or drawn SMILES, possibly with `[<]` / `[>]` repeat markers.
 * @returns Deduped components suitable for PubChem SMILES search.
 */
export function structureLookupComponentsFromSmiles(
  smiles: string,
): StructureLookupComponent[] {
  const trimmed = smiles.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const components: StructureLookupComponent[] = [];
  const seen = new Set<string>();
  addComponent(components, seen, "full", trimmed, "Full structure");

  const repeatMatch = /\[<\](.*)\[\>\]/.exec(trimmed);
  if (repeatMatch?.[1]) {
    addComponent(components, seen, "repeat_unit", repeatMatch[1], "Repeat unit");
  }

  return components;
}
