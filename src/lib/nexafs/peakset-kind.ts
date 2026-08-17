/**
 * Maps contribute / plot `peakKind` values onto `peaksets.transition` for
 * persistence without a dedicated kind column. Does not own free-text bond
 * chemistry UI; collaborators must treat `transition` as the kind id store for
 * assignable and legacy peak kinds.
 */

import {
  NEXAFS_PEAK_KIND_OPTIONS,
  type NexafsPeakKindId,
} from "~/components/plots/spectrum/peakKindOptions";

const ASSIGNABLE_KIND_IDS: ReadonlySet<string> = new Set(
  NEXAFS_PEAK_KIND_OPTIONS.map((row) => row.id),
);

const LEGACY_KIND_IDS: ReadonlySet<string> = new Set([
  "rydberg",
  "shake-up",
  "shake-off",
  "multielectron",
  "quadrupole",
  "other",
]);

/** Plot / contribute peak fields that map onto one `peaksets` write row. */
export interface PeaksetWritePeak {
  energy: number;
  intensity?: number | null;
  peakKind?: string | null;
  bond?: string | null;
  transition?: string | null;
}

/** Prisma-shaped peakset row fields used when projecting to plot peaks. */
export interface PeaksetReadRow {
  id: string;
  energyev: number;
  intensity: number | null;
  transition: string | null;
  bond?: string | null;
}

/** Payload for `peaksets.createMany` / replace writes. */
export interface PeaksetWriteRow {
  energyev: number;
  intensity: number | null;
  bond: string | null;
  transition: string | null;
}

/**
 * Stores a contribute/plot peak kind as a `peaksets.transition` value.
 *
 * @param peakKind - Assignable id (`pi-star` / `sigma-star`), legacy id, or null/empty.
 * @returns Trimmed kind string for persistence, or `null` when unset.
 */
export function peakKindToTransition(
  peakKind: string | null | undefined,
): string | null {
  if (peakKind == null) return null;
  const trimmed = peakKind.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Reads a stored `peaksets.transition` value back as a plot `peakKind`.
 *
 * Preserves assignable ids, known legacy ids, and any other non-empty stored
 * string so historical free-text transition labels remain visible until edited.
 *
 * @param transition - Value from `peaksets.transition`.
 * @returns Kind string for plot annotations, or `null` when unset.
 */
export function transitionToPeakKind(
  transition: string | null | undefined,
): string | null {
  if (transition == null) return null;
  const trimmed = transition.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * True when `kind` is an assignable NEXAFS peak kind id.
 *
 * @param kind - Candidate kind string.
 */
export function isAssignablePeakKind(kind: string): kind is NexafsPeakKindId {
  return ASSIGNABLE_KIND_IDS.has(kind);
}

/**
 * True when `kind` is a known legacy peak kind id retained for display.
 *
 * @param kind - Candidate kind string.
 */
export function isLegacyPeakKind(kind: string): boolean {
  return LEGACY_KIND_IDS.has(kind);
}

/**
 * Projects a `peaksets` row into plot `Peak` fields (`energy`, `amplitude`, `peakKind`).
 *
 * @param row - Persisted peakset row including `transition`.
 */
export function peaksetRowToPlotPeak(row: PeaksetReadRow): {
  id: string;
  energy: number;
  amplitude?: number;
  peakKind: string | null;
} {
  return {
    id: row.id,
    energy: row.energyev,
    amplitude: row.intensity ?? undefined,
    peakKind: transitionToPeakKind(row.transition),
  };
}

/**
 * Builds a `peaksets` write payload from contribute/plot peak fields.
 *
 * Prefers `peakKind` for `transition`; falls back to an explicit `transition`
 * string when `peakKind` is unset. Leaves `bond` as provided for compatibility.
 *
 * @param peak - Peak energy, optional intensity, and kind fields.
 */
export function plotPeakToPeaksetWrite(peak: PeaksetWritePeak): PeaksetWriteRow {
  const fromKind = peakKindToTransition(peak.peakKind);
  const fromTransition =
    peak.transition == null || peak.transition.trim() === ""
      ? null
      : peak.transition.trim();
  const bond =
    peak.bond == null || peak.bond.trim() === "" ? null : peak.bond.trim();
  return {
    energyev: peak.energy,
    intensity:
      peak.intensity === undefined || peak.intensity === null
        ? null
        : peak.intensity,
    bond,
    transition: fromKind ?? fromTransition,
  };
}
