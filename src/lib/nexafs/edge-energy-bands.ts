/**
 * Typical soft X-ray absorption-edge energy windows used to sanity-check
 * contribute edge labels against spectrum photon energies and to infer STXM
 * edges from scan ranges.
 *
 * Bands are library constants (not catalog/`edges` table columns). Unknown
 * edge labels skip hard validation so exotic edges remain selectable.
 */

/** Inclusive typical photon-energy window for one absorption edge. */
export interface TypicalEdgeEnergyBand {
  /** Catalog-style label used in contribute UI, e.g. `C(K)`. */
  label: string;
  /** Space-separated label used by STXM inference UI, e.g. `C K`. */
  stxmLabel: string;
  /** Inclusive lower bound of the typical band (eV). */
  minEv: number;
  /** Inclusive upper bound of the typical band (eV). */
  maxEv: number;
}

/** Finite min / mid / max photon energies derived from a spectrum. */
export interface SpectrumEnergyExtent {
  /** Lowest finite energy sample (eV). */
  minEv: number;
  /** Highest finite energy sample (eV). */
  maxEv: number;
  /** Midpoint of the span, `(minEv + maxEv) / 2` (eV). */
  midEv: number;
}

/** Result of comparing a selected edge label to a spectrum energy span. */
export type EdgeEnergyConsistencyResult =
  | {
      ok: true;
      expectedBand: TypicalEdgeEnergyBand | null;
      message: null;
    }
  | {
      ok: false;
      expectedBand: TypicalEdgeEnergyBand;
      message: string;
    };

/** Canonical soft X-ray edge windows (CXRO / X-ray Data Booklet binding energies ± NEXAFS span). */
export const TYPICAL_EDGE_ENERGY_BANDS: readonly TypicalEdgeEnergyBand[] = [
  { label: "C(K)", stxmLabel: "C K", minEv: 275, maxEv: 320 },
  { label: "N(K)", stxmLabel: "N K", minEv: 395, maxEv: 430 },
  { label: "O(K)", stxmLabel: "O K", minEv: 525, maxEv: 560 },
  { label: "F(K)", stxmLabel: "F K", minEv: 680, maxEv: 710 },
  { label: "Na(K)", stxmLabel: "Na K", minEv: 1040, maxEv: 1120 },
  { label: "Mg(K)", stxmLabel: "Mg K", minEv: 1280, maxEv: 1360 },
  { label: "Al(K)", stxmLabel: "Al K", minEv: 1530, maxEv: 1620 },
  { label: "Si(K)", stxmLabel: "Si K", minEv: 1810, maxEv: 1900 },
  { label: "P(K)", stxmLabel: "P K", minEv: 2110, maxEv: 2200 },
  { label: "S(K)", stxmLabel: "S K", minEv: 2450, maxEv: 2520 },
  { label: "Cl(K)", stxmLabel: "Cl K", minEv: 2790, maxEv: 2880 },
  { label: "Si(L2,3)", stxmLabel: "Si L2,3", minEv: 90, maxEv: 130 },
  { label: "P(L2,3)", stxmLabel: "P L2,3", minEv: 120, maxEv: 180 },
  { label: "S(L2,3)", stxmLabel: "S L2,3", minEv: 150, maxEv: 200 },
  { label: "Ca(L2,3)", stxmLabel: "Ca L2,3", minEv: 320, maxEv: 380 },
  { label: "Sc(L2,3)", stxmLabel: "Sc L2,3", minEv: 380, maxEv: 430 },
  { label: "Ti(L2,3)", stxmLabel: "Ti L2,3", minEv: 440, maxEv: 500 },
  { label: "V(L2,3)", stxmLabel: "V L2,3", minEv: 500, maxEv: 560 },
  { label: "Cr(L2,3)", stxmLabel: "Cr L2,3", minEv: 560, maxEv: 620 },
  { label: "Mn(L2,3)", stxmLabel: "Mn L2,3", minEv: 620, maxEv: 690 },
  { label: "Fe(L2,3)", stxmLabel: "Fe L2,3", minEv: 690, maxEv: 760 },
  { label: "Co(L2,3)", stxmLabel: "Co L2,3", minEv: 760, maxEv: 830 },
  { label: "Ni(L2,3)", stxmLabel: "Ni L2,3", minEv: 830, maxEv: 910 },
  { label: "Cu(L2,3)", stxmLabel: "Cu L2,3", minEv: 910, maxEv: 990 },
  { label: "Zn(L2,3)", stxmLabel: "Zn L2,3", minEv: 1000, maxEv: 1080 },
] as const;

/**
 * Ranks common soft X-ray K-edges ahead of other catalog edges (C, N, O, S, then rest).
 *
 * @param targetatom - Edge atom symbol from the edges catalog.
 * @param corestate - Core level token such as `K` or `L2,3`.
 * @returns Lower numbers sort first; `4` is the default bucket.
 */
export function edgeCatalogPriorityRank(
  targetatom: string,
  corestate: string,
): number {
  const atom = targetatom.trim().toUpperCase();
  const coreState = corestate.trim().toUpperCase();
  const isK = coreState === "K";
  if (isK && (atom === "C" || atom === "CARBON")) return 0;
  if (isK && (atom === "N" || atom === "NITROGEN")) return 1;
  if (isK && (atom === "O" || atom === "OXYGEN")) return 2;
  if (isK && (atom === "S" || atom === "SULFUR" || atom === "SULPHUR"))
    return 3;
  return 4;
}

/**
 * Scores how well a spectrum midpoint sits inside a typical edge band (higher is better).
 *
 * @param band - Typical inclusive window for the edge.
 * @param extent - Spectrum energy span.
 * @returns `1` when mid is at band center; decays to `0` at the band edges; negative when outside.
 */
export function edgeBandFeasibilityScore(
  band: Pick<TypicalEdgeEnergyBand, "minEv" | "maxEv">,
  extent: Pick<SpectrumEnergyExtent, "midEv" | "minEv" | "maxEv">,
): number {
  const center = (band.minEv + band.maxEv) / 2;
  const halfSpan = Math.max((band.maxEv - band.minEv) / 2, 1);
  const distance = Math.abs(extent.midEv - center);
  if (bandOverlapsSpectrum(band, extent)) {
    return Math.max(0, 1 - distance / halfSpan);
  }
  return -distance / halfSpan;
}

/**
 * Builds the catalog-style edge label `targetatom(corestate)` after trimming
 * both parts (e.g. `C` + `K` → `C(K)`).
 *
 * @param targetatom - Edge atom symbol from the edges catalog.
 * @param corestate - Core level token such as `K` or `L3`.
 * @returns Trimmed `atom(core)` label, or empty string when either part is blank.
 */
export function edgeLabelFromAtomCore(
  targetatom: string,
  corestate: string,
): string {
  const atom = targetatom.trim();
  const core = corestate.trim();
  if (!atom || !core) {
    return "";
  }
  return `${atom}(${core})`;
}

/**
 * Normalizes free-form edge labels to catalog style for band lookup.
 *
 * Accepts `C(K)`, `C K`, and case variants; returns `C(K)` when both atom and
 * core tokens are present, otherwise the trimmed original string.
 *
 * @param label - Edge label from UI, filename, or STXM inference.
 * @returns Lookup key used by {@link typicalBandForEdgeLabel}.
 */
export function normalizeEdgeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "";
  }
  const paren = /^([A-Za-z][A-Za-z0-9]*)\s*\(\s*([A-Za-z0-9]+)\s*\)$/.exec(
    trimmed,
  );
  if (paren?.[1] && paren[2]) {
    return `${paren[1]}(${paren[2]})`;
  }
  const spaced = /^([A-Za-z][A-Za-z0-9]*)\s+([A-Za-z0-9]+)$/.exec(trimmed);
  if (spaced?.[1] && spaced[2]) {
    return `${spaced[1]}(${spaced[2]})`;
  }
  return trimmed;
}

/**
 * Resolves the typical energy band for a catalog or STXM-style edge label.
 *
 * @param label - Edge label such as `N(K)` or `N K`.
 * @returns Matching band, or `null` when the label is unknown (no hard fail).
 */
export function typicalBandForEdgeLabel(
  label: string,
): TypicalEdgeEnergyBand | null {
  const key = normalizeEdgeLabel(label);
  if (!key) {
    return null;
  }
  const keyLower = key.toLowerCase();
  for (const band of TYPICAL_EDGE_ENERGY_BANDS) {
    if (
      band.label.toLowerCase() === keyLower ||
      normalizeEdgeLabel(band.stxmLabel).toLowerCase() === keyLower
    ) {
      return band;
    }
  }
  return null;
}

/**
 * Computes min / mid / max photon energies from spectrum points.
 *
 * @param points - Rows with finite `energy` values in eV; non-finite rows are skipped.
 * @returns Extent when at least one finite energy exists; otherwise `null`.
 */
export function spectrumEnergyExtent(
  points: ReadonlyArray<{ readonly energy: number }>,
): SpectrumEnergyExtent | null {
  let minEv = Number.POSITIVE_INFINITY;
  let maxEv = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const energy = point.energy;
    if (!Number.isFinite(energy)) {
      continue;
    }
    if (energy < minEv) {
      minEv = energy;
    }
    if (energy > maxEv) {
      maxEv = energy;
    }
  }
  if (!Number.isFinite(minEv) || !Number.isFinite(maxEv)) {
    return null;
  }
  return {
    minEv,
    maxEv,
    midEv: (minEv + maxEv) / 2,
  };
}

/**
 * Reports whether a typical edge band shares any energy with a spectrum span.
 *
 * @param band - Typical inclusive window for the selected edge.
 * @param extent - Spectrum min/max (mid unused for overlap).
 * @returns `true` when the closed intervals overlap.
 */
export function bandOverlapsSpectrum(
  band: Pick<TypicalEdgeEnergyBand, "minEv" | "maxEv">,
  extent: Pick<SpectrumEnergyExtent, "minEv" | "maxEv">,
): boolean {
  return band.minEv <= extent.maxEv && extent.minEv <= band.maxEv;
}

/**
 * Infers a typical edge band from a scan energy range midpoint (STXM path).
 *
 * @param energyMinEv - Inclusive lower scan energy (eV), or null/undefined when unknown.
 * @param energyMaxEv - Inclusive upper scan energy (eV), or null/undefined when unknown.
 * @returns Matching band plus midpoint when the mid falls in a known window; otherwise `null`.
 */
export function inferEdgeBandFromEnergyRange(
  energyMinEv: number | null | undefined,
  energyMaxEv: number | null | undefined,
): (TypicalEdgeEnergyBand & { energyMidEv: number }) | null {
  if (
    energyMinEv === null ||
    energyMaxEv === null ||
    energyMinEv === undefined ||
    energyMaxEv === undefined ||
    !Number.isFinite(energyMinEv) ||
    !Number.isFinite(energyMaxEv)
  ) {
    return null;
  }
  const energyMidEv = (energyMinEv + energyMaxEv) / 2;
  for (const band of TYPICAL_EDGE_ENERGY_BANDS) {
    if (energyMidEv >= band.minEv && energyMidEv <= band.maxEv) {
      return { ...band, energyMidEv };
    }
  }
  return null;
}

function formatEvRange(minEv: number, maxEv: number): string {
  return `~${Math.round(minEv)}–${Math.round(maxEv)} eV`;
}

/**
 * Compares a selected edge label to spectrum energies against typical bands.
 *
 * Unknown labels and missing/non-finite spectrum bounds do not fail (no hard
 * block). When a known band exists and the spectrum span does not overlap it,
 * returns a contribute-facing error message.
 *
 * @param args.edgeLabel - Selected edge as `C(K)` / `C K`, or empty when unset.
 * @param args.minEv - Spectrum minimum energy (eV).
 * @param args.maxEv - Spectrum maximum energy (eV).
 * @returns Consistency result with optional blocking `message`.
 */
export function evaluateEdgeEnergyConsistency(args: {
  edgeLabel: string | null | undefined;
  minEv: number | null | undefined;
  maxEv: number | null | undefined;
}): EdgeEnergyConsistencyResult {
  const band = args.edgeLabel
    ? typicalBandForEdgeLabel(args.edgeLabel)
    : null;
  if (!band) {
    return { ok: true, expectedBand: null, message: null };
  }
  if (
    args.minEv === null ||
    args.maxEv === null ||
    args.minEv === undefined ||
    args.maxEv === undefined ||
    !Number.isFinite(args.minEv) ||
    !Number.isFinite(args.maxEv)
  ) {
    return { ok: true, expectedBand: band, message: null };
  }
  const extent: SpectrumEnergyExtent = {
    minEv: args.minEv,
    maxEv: args.maxEv,
    midEv: (args.minEv + args.maxEv) / 2,
  };
  if (bandOverlapsSpectrum(band, extent)) {
    return { ok: true, expectedBand: band, message: null };
  }
  return {
    ok: false,
    expectedBand: band,
    message: `Selected edge ${band.label} does not match spectrum energies (${formatEvRange(extent.minEv, extent.maxEv)}; expected ${formatEvRange(band.minEv, band.maxEv)}).`,
  };
}

/**
 * Formats a short Edge picker hint for energy-compatible catalog rows.
 *
 * Prefer {@link edgeEnergyTypicalRangeHint} in sectioned pickers; this keeps the
 * legacy one-line copy for callers that still want an inline compatibility tag.
 *
 * @param band - Typical band for the edge.
 * @returns Hint such as `typical 275–320 eV · matches data`.
 */
export function edgeEnergyMatchHint(band: TypicalEdgeEnergyBand): string {
  return `typical ${Math.round(band.minEv)}–${Math.round(band.maxEv)} eV · matches data`;
}

/**
 * Formats a muted Edge picker hint when the band does not overlap the spectrum.
 *
 * Prefer section headers plus {@link edgeEnergyTypicalRangeHint} so the spectrum
 * span is not repeated on every out-of-range row.
 *
 * @param extent - Spectrum energy span used for the aside.
 * @returns Hint such as `outside spectrum (~280–320 eV)`.
 */
export function edgeEnergyMismatchHint(extent: SpectrumEnergyExtent): string {
  return `outside spectrum (${formatEvRange(extent.minEv, extent.maxEv)})`;
}

/**
 * Formats the CXRO typical window as quiet per-row secondary text.
 *
 * @param band - Typical inclusive window for the edge.
 * @returns Compact range such as `275–320 eV`.
 */
export function edgeEnergyTypicalRangeHint(
  band: Pick<TypicalEdgeEnergyBand, "minEv" | "maxEv">,
): string {
  return `${Math.round(band.minEv)}–${Math.round(band.maxEv)} eV`;
}

/**
 * Edge picker list sections ordered by showcase priority (Atlas + in-range first).
 *
 * - `in-atlas`: edge has measured spectrum data in Atlas and overlaps the upload span
 * - `matches`: CXRO-feasible (or unknown band) but not yet in Atlas catalog stats
 * - `outside`: known CXRO band does not overlap the spectrum span
 */
export type EdgePickerSectionId = "in-atlas" | "matches" | "outside";

/** Display order for {@link EdgePickerSectionId} sections in the Select edge modal. */
export const EDGE_PICKER_SECTION_ORDER = [
  "in-atlas",
  "matches",
  "outside",
] as const satisfies readonly EdgePickerSectionId[];

/** Quiet macOS-style section titles for the Select edge modal. */
export const EDGE_PICKER_SECTION_LABELS: Record<EdgePickerSectionId, string> = {
  "in-atlas": "In Atlas",
  matches: "Matches spectrum",
  outside: "Outside spectrum",
};

/**
 * Assigns an edge row to a picker section from catalog membership and feasibility.
 *
 * Unknown CXRO bands are treated as feasible (non-blocking), matching contribute
 * validation. When spectrum extent is unavailable, returns `null` so the UI can
 * render a flat list.
 *
 * @param args.compatible - `true` / `false` when spectrum bounds are known; `null` when unknown.
 * @param args.inAtlasCatalog - `true` when `edgeCatalogStats` includes this edge id.
 * @returns Section id, or `null` when sections should be omitted.
 */
export function classifyEdgePickerSection(args: {
  compatible: boolean | null;
  inAtlasCatalog: boolean;
}): EdgePickerSectionId | null {
  if (args.compatible === null) {
    return null;
  }
  if (args.compatible === false) {
    return "outside";
  }
  if (args.inAtlasCatalog) {
    return "in-atlas";
  }
  return "matches";
}

/**
 * Compares two ranked edge picker rows for secondary order within a section.
 *
 * Higher feasibility first, then catalog priority (C/N/O/S K), then stable index.
 *
 * @param a - Left ranked row.
 * @param b - Right ranked row.
 * @returns Negative when `a` sorts before `b`.
 */
export function compareEdgePickerRows(
  a: {
    feasibility: number;
    catalogPriority: number;
    index: number;
  },
  b: {
    feasibility: number;
    catalogPriority: number;
    index: number;
  },
): number {
  if (a.feasibility !== b.feasibility) {
    return b.feasibility - a.feasibility;
  }
  if (a.catalogPriority !== b.catalogPriority) {
    return a.catalogPriority - b.catalogPriority;
  }
  return a.index - b.index;
}
