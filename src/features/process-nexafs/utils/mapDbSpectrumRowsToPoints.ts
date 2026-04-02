/**
 * Maps persisted spectrum rows (with optional polarization geometry) into `SpectrumPoint` values used by plotting and normalization helpers.
 */
import type { SpectrumPoint } from "~/components/plots/types";

export type DbSpectrumRowWithPolarization = {
  polarizationid: string | null;
  energyev: number;
  rawabs: number;
  od: number | null;
  massabsorption: number | null;
  beta: number | null;
  i0: number | null;
  polarizations: { polardeg: unknown; azimuthdeg: unknown } | null;
};

export type AnnotatedSpectrumRow = {
  polarizationId: string | null;
  point: SpectrumPoint;
};

/**
 * Converts database spectrum rows into plot-ready points: `absorption` prefers `massabsorption` when finite, otherwise `rawabs`, matching upload merge semantics used in browse views.
 *
 * @param rows Ordered spectrum rows from Prisma (ascending energy). Each row may include joined `polarizations` for theta/phi.
 * @returns The same length as `rows`; theta/phi are omitted when polarization is missing or non-finite.
 */
function rowToPoint(r: DbSpectrumRowWithPolarization): SpectrumPoint {
  const thetaRaw =
    r.polarizations != null ? Number(r.polarizations.polardeg) : Number.NaN;
  const phiRaw =
    r.polarizations != null ? Number(r.polarizations.azimuthdeg) : Number.NaN;
  const absorption =
    r.massabsorption != null && Number.isFinite(r.massabsorption)
      ? r.massabsorption
      : r.rawabs;
  const out: SpectrumPoint = {
    energy: r.energyev,
    absorption,
  };
  if (Number.isFinite(thetaRaw)) out.theta = thetaRaw;
  if (Number.isFinite(phiRaw)) out.phi = phiRaw;
  if (r.od != null && Number.isFinite(r.od)) out.od = r.od;
  if (r.massabsorption != null && Number.isFinite(r.massabsorption)) {
    out.massabsorption = r.massabsorption;
  }
  if (r.beta != null && Number.isFinite(r.beta)) out.beta = r.beta;
  if (r.i0 != null && Number.isFinite(r.i0)) out.i0 = r.i0;
  return out;
}

/**
 * Maps database rows to plot points only (no polarization id retained).
 */
export function mapDbSpectrumRowsToPoints(
  rows: DbSpectrumRowWithPolarization[],
): SpectrumPoint[] {
  return rows.map(rowToPoint);
}

/**
 * Maps database rows to `{ polarizationId, point }` pairs for hierarchical browse tables grouped by polarization, then theta, then phi.
 */
export function mapDbSpectrumRowsToAnnotated(
  rows: DbSpectrumRowWithPolarization[],
): AnnotatedSpectrumRow[] {
  return rows.map((r) => ({
    polarizationId: r.polarizationid,
    point: rowToPoint(r),
  }));
}
