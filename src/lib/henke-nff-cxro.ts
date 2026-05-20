/**
 * Shared parsing and interpolation for LBL CXRO Henke optical-constants `.nff` tables
 * (`https://henke.lbl.gov/optical_constants/sf/<element>.nff`).
 *
 * Used by server bare-atom absorption (`~/server/utils/cxro`), offline bundle generation
 * (`tests/kk-calc-validation/tools/gen_henke_element_f2_bundle.py` must match column semantics),
 * and compliance tests against the bundled KK Henke tables in `~/features/kk-calc`.
 */

export const HENKE_LBL_OPTICAL_CONSTANTS_SF_BASE =
  "https://henke.lbl.gov/optical_constants/sf" as const;

/**
 * Builds the canonical `.nff` URL for one element symbol (CXRO expects a lowercase stem).
 *
 * @param elementSymbol One or two-letter element symbol (e.g. `"C"`, `"Fe"`).
 * @returns Absolute URL to the ASCII `.nff` table for that element.
 * @throws RangeError When `elementSymbol` is empty after trimming.
 */
export function henkeLblElementNffUrl(elementSymbol: string): string {
  const trimmed = elementSymbol.trim();
  if (!trimmed) {
    throw new RangeError("elementSymbol must be non-empty");
  }
  return `${HENKE_LBL_OPTICAL_CONSTANTS_SF_BASE}/${trimmed.toLowerCase()}.nff`;
}

export interface HenkeLblNffParseResult {
  readonly energiesEv: readonly number[];
  readonly f2: readonly number[];
}

/**
 * Parses CXRO/LBL Henke `.nff` text: whitespace columns `E(eV)`, `f1`, `f2`; skips blank lines,
 * `#` comments, and a leading `E(` / `Energy` header row when present.
 *
 * @param text Raw response body from a `.nff` URL.
 * @returns Strictly ascending `energiesEv` with parallel `f2` samples (Henke imaginary ASF column).
 * @throws Error When no numeric data rows are parsed.
 */
export function parseHenkeLblNffText(text: string): HenkeLblNffParseResult {
  const energiesEv: number[] = [];
  const f2: number[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    if (/^E\s*\(/i.test(line) || /^Energy/i.test(line)) {
      continue;
    }
    const parts = line.split(/\s+/).filter((p) => p.length > 0);
    if (parts.length < 3) {
      continue;
    }
    const energyToken = parts[0]!;
    if (!/^[-+]?\d/.test(energyToken)) {
      continue;
    }
    const energy = Number.parseFloat(energyToken);
    const f2Val = Number.parseFloat(parts[2]!);
    if (!Number.isFinite(energy) || !Number.isFinite(f2Val)) {
      continue;
    }
    energiesEv.push(energy);
    f2.push(f2Val);
  }

  if (energiesEv.length === 0) {
    throw new Error("parseHenkeLblNffText: no data rows parsed");
  }

  return { energiesEv, f2 };
}

/**
 * Linearly interpolates sorted Henke `(E, f_2)` samples at one photon energy `xq` (eV), with
 * flat extrapolation outside `[E[0], E[n-1]]`.
 *
 * @param energiesEv Strictly non-decreasing photon energies in eV (typically strictly increasing).
 * @param f2 Parallel imaginary ASF samples (Henke column).
 * @param xq Query energy in eV.
 * @returns Interpolated `f_2` at `xq`.
 * @throws RangeError When arrays are empty or length-mismatched.
 */
export function linearInterpHenkeF2Sorted(
  energiesEv: readonly number[],
  f2: readonly number[],
  xq: number,
): number {
  const n = energiesEv.length;
  if (n === 0 || f2.length !== n) {
    throw new RangeError("linearInterpHenkeF2Sorted: energies and f2 must be same-length non-empty");
  }
  if (xq <= energiesEv[0]!) {
    return f2[0]!;
  }
  if (xq >= energiesEv[n - 1]!) {
    return f2[n - 1]!;
  }
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (energiesEv[mid]! <= xq) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const x0 = energiesEv[lo]!;
  const x1 = energiesEv[hi]!;
  const y0 = f2[lo]!;
  const y1 = f2[hi]!;
  if (x1 === x0) {
    return y0;
  }
  const t = (xq - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}
