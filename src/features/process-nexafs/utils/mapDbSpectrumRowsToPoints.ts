/**
 * Maps persisted spectrum rows (with optional polarization geometry) into `SpectrumPoint` values for plotting and tables. Browse views use these fields as stored at upload time (`od`, `massabsorption`, `rawabs`, `beta`, `delta`, `i0`) without recomputing normalization.
 */
import type { SpectrumPoint } from "~/components/plots/types";

export type DbSpectrumRowWithPolarization = {
  id?: string;
  polarizationid: string | null;
  energyev: number;
  rawabs: number;
  od: number | null;
  massabsorption: number | null;
  beta: number | null;
  delta?: number | null;
  i0: number | null;
  polarizations: { polardeg: unknown; azimuthdeg: unknown } | null;
};

export type AnnotatedSpectrumRow = {
  polarizationId: string | null;
  point: SpectrumPoint;
};

/**
 * Maps persisted spectrum rows into plot-ready points: `absorption` prefers stored
 * mass absorption (canonical hub) when finite, otherwise falls back to rawabs.
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
  if (r.delta != null && Number.isFinite(r.delta)) out.delta = r.delta;
  if (r.i0 != null && Number.isFinite(r.i0)) out.i0 = r.i0;
  if (Number.isFinite(r.rawabs)) out.rawabs = r.rawabs;
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
