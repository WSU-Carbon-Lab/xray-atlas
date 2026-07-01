import { parseChemicalFormula } from "~/features/kk-calc/kkcalc-stoichiometry";
import { resolveHenkeKkMergeDomainFromPrePostWindows } from "~/features/kk-calc/resolve-henke-kk-merge-domain";
import {
  parseStoredNormalizationRanges,
  unifiedNormalizationWindowsForBasis,
} from "~/lib/nexafs-normalization-ranges";
import type { DatasetState } from "../types";

/**
 * Resolves the Henke tail merge window for upload-time KK from dataset normalization
 * regions and the selected molecule formula, matching the contribute plot preview rail.
 */
export function resolveHenkeMergeDomainForUploadDataset(
  dataset: DatasetState,
  chemicalFormula: string | undefined,
): readonly [number, number] | undefined {
  const formula = chemicalFormula?.trim();
  if (!formula) {
    return undefined;
  }
  let composition;
  try {
    composition = parseChemicalFormula(formula);
  } catch {
    return undefined;
  }
  const ranges = parseStoredNormalizationRanges(dataset.normalizationRegions);
  const win = unifiedNormalizationWindowsForBasis(
    dataset.normalizationScope,
    ranges,
    "beta",
  );
  if (!win?.pre || !win.post) {
    return undefined;
  }
  return resolveHenkeKkMergeDomainFromPrePostWindows({
    pre: win.pre,
    post: win.post,
    composition,
  });
}
