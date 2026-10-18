/**
 * Builds the Collaboration comparison chart from one near-edge energy grid.
 *
 * `peaks` draws optical density and marks each film's π* maximum in three
 * windows below 289 eV. `vacuum` and `materials` draw the isotropic RSoXS
 * contrast function of Collins and Gann, `c(E) = |Δn|² / E⁴`, on a logarithmic
 * axis. Vacuum uses `δ = β = 0`. Pass two series to `materials` for one binary
 * contrast. `n = 1 - δ + iβ`.
 */
import {
  buildLinearScale,
  buildTracePath,
  niceTicks,
  SPECTRUM_PAD,
  type XY,
} from "../snapshot/svg-paths";
import type {
  HomeSpectrumMarker,
  HomeSpectrumTab,
  HomeSpectrumTick,
  HomeSpectrumTrace,
  HomeSpectrumYTick,
} from "../snapshot/types";

const PAD = SPECTRUM_PAD;

export interface CollaborationSeries {
  key: string;
  label: string;
  /** Position on the shared grey-to-red trace ramp, in [0, 1]. */
  ramp: number;
  /** Optical density on the shared grid. Same length for every series. */
  od: readonly number[];
  /** Imaginary part of the refractive decrement, `β`, on the same grid. */
  beta: readonly number[];
  /** Real refractive decrement, `δ`, on the same grid. `n = 1 - δ + iβ`. */
  delta: readonly number[];
}

interface CollaborationChartInput {
  width: number;
  height: number;
  energyMinEv: number;
  energyMaxEv: number;
  series: readonly CollaborationSeries[];
  /**
   * `overlay` is optical density. `peaks` marks three π* maxima per film.
   * `vacuum` and `materials` are `c(E) = |Δn|² / E⁴` on a log axis.
   */
  mode?: "overlay" | "peaks" | "vacuum" | "materials";
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 1000 || abs < 0.01) {
    return value.toExponential(1).replace(/\.0e/, "e").replace("e+", "e");
  }
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  const text = value.toFixed(digits);
  if (!text.includes(".")) return text;
  return text.replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Tick values on a small positive contrast scale.
 *
 * {@link niceTicks} rounds to six decimals, which collapses `|n - 1|²` near
 * `10⁻⁶` onto one label. This keeps the unrounded 1-2-5 step.
 */
function contrastTicks(
  domain: readonly [number, number],
  target: number,
): number[] {
  const [a, b] = domain;
  const raw = (b - a) / Math.max(1, target);
  if (!(raw > 0) || !Number.isFinite(raw)) return [];
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (
    let t = Math.ceil(a / step - 1e-8) * step;
    t <= b + step * 1e-6;
    t += step
  ) {
    ticks.push(t);
  }
  return ticks;
}

function yTicks(
  domain: readonly [number, number],
  height: number,
): HomeSpectrumYTick[] {
  const sy = buildLinearScale(domain, [height - PAD.b, PAD.t]);
  const values =
    domain[1] - domain[0] < 0.01
      ? contrastTicks(domain, 4)
      : niceTicks(domain, 4);
  return values.map((value) => ({
    y: Number(sy(value).toFixed(1)),
    label: formatTick(value),
  }));
}

/**
 * Logarithmic y ticks for a domain stored as `log10` of the contrast.
 *
 * Major ticks are the decades `10^n`, labeled with a superscript exponent.
 * Minor ticks are the mantissas 2 through 9 in each decade, unlabeled. A span
 * narrower than 0.8 decades also labels the mantissas 2 and 5 so the axis is
 * not a single number.
 */
function logYTicks(
  logDomain: readonly [number, number],
  height: number,
): HomeSpectrumYTick[] {
  const sy = buildLinearScale(logDomain, [height - PAD.b, PAD.t]);
  const lo = 10 ** logDomain[0];
  const hi = 10 ** logDomain[1];
  const labelMantissas =
    logDomain[1] - logDomain[0] >= 0.8 ? new Set([1]) : new Set([1, 2, 5]);
  const ticks: HomeSpectrumYTick[] = [];
  for (
    let exp = Math.floor(Math.log10(lo));
    exp <= Math.ceil(Math.log10(hi));
    exp += 1
  ) {
    for (let mantissa = 1; mantissa <= 9; mantissa += 1) {
      const value = mantissa * 10 ** exp;
      if (value < lo || value > hi) continue;
      const major = labelMantissas.has(mantissa);
      ticks.push({
        y: Number(sy(Math.log10(value)).toFixed(1)),
        label: major ? (mantissa === 1 ? "10" : String(mantissa)) : "",
        minor: !major,
        exponent: major ? exp : undefined,
      });
    }
  }
  return ticks;
}

function extent(
  columns: readonly (readonly number[])[],
): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const column of columns) {
    for (const value of column) {
      if (!Number.isFinite(value)) continue;
      lo = Math.min(lo, value);
      hi = Math.max(hi, value);
    }
  }
  if (!Number.isFinite(lo) || !(hi > lo)) return null;
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

function energyAt(
  index: number,
  count: number,
  energyMinEv: number,
  energyMaxEv: number,
): number {
  return energyMinEv + ((energyMaxEv - energyMinEv) * index) / (count - 1);
}

/**
 * Tallest local maximum of `od` on `[lo, hi]` eV.
 *
 * A sample counts when it is at least as high as both neighbors and stands
 * 0.05 optical-density units above the lowest sample within eight points.
 * Returns `null` when the window has no such maximum.
 */
function bestPeakIndex(
  od: readonly number[],
  atEnergy: (index: number) => number,
  lo: number,
  hi: number,
): number | null {
  let best = -1;
  let bestValue = -Infinity;
  for (let index = 1; index < od.length - 1; index += 1) {
    const energy = atEnergy(index);
    if (energy < lo) continue;
    if (energy > hi) break;
    const value = od[index] ?? Number.NaN;
    if (!Number.isFinite(value)) continue;
    const left = od[index - 1] ?? value;
    const right = od[index + 1] ?? value;
    if (value < left || value < right) continue;
    let baseline = value;
    for (let neighbor = index - 8; neighbor <= index + 8; neighbor += 1) {
      if (neighbor < 0 || neighbor >= od.length || neighbor === index) continue;
      const sample = od[neighbor];
      if (sample != null && sample < baseline) baseline = sample;
    }
    if (value - baseline < 0.05 || value <= bestValue) continue;
    bestValue = value;
    best = index;
  }
  return best >= 0 ? best : null;
}

/**
 * The three carbon K-edge π* windows that separate these films.
 * Each bound is inclusive. A film is marked only when it has a local maximum there.
 */
const PI_STAR_WINDOWS: readonly (readonly [number, number])[] = [
  [284.2, 285.7],
  [285.9, 286.85],
  [287.1, 288.2],
];

function formatEnergy(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

interface PlottedCurve {
  key: string;
  label: string;
  ramp: number;
  values: readonly number[];
}

/**
 * Isotropic RSoXS contrast `c(E) = ((Δδ)² + (Δβ)²) / E⁴`.
 *
 * `energyEv` is the photon energy in eV, the spectral variable Collins and
 * Gann write as `ω` in J. Polym. Sci. 2022, 60, 1199, Equation 9
 * (DOI 10.1002/pol.20210414). Vacuum contrast passes the material `δ` and `β`
 * because vacuum has `δ = β = 0`. Returns `NaN` when `energyEv` is not positive.
 */
function scatteringContrast(
  delta: number,
  beta: number,
  energyEv: number,
): number {
  if (!(energyEv > 0)) return Number.NaN;
  return (delta * delta + beta * beta) / energyEv ** 4;
}

function vacuumContrast(
  item: CollaborationSeries,
  atEnergy: (index: number) => number,
): number[] {
  return item.beta.map((beta, index) => {
    const delta = item.delta[index] ?? 0;
    return scatteringContrast(delta, beta, atEnergy(index));
  });
}

function materialsContrast(
  series: readonly CollaborationSeries[],
  atEnergy: (index: number) => number,
): PlottedCurve[] {
  const curves: PlottedCurve[] = [];
  const ramps = [0.22, 0.58, 1];
  let pair = 0;
  for (let left = 0; left < series.length; left += 1) {
    for (let right = left + 1; right < series.length; right += 1) {
      const a = series[left];
      const b = series[right];
      if (!a || !b) continue;
      curves.push({
        key: `${a.key}-${b.key}`,
        label: `${a.label} − ${b.label}`,
        ramp: ramps[pair] ?? 1,
        values: a.beta.map((beta, index) => {
          const dBeta = beta - (b.beta[index] ?? 0);
          const dDelta = (a.delta[index] ?? 0) - (b.delta[index] ?? 0);
          return scatteringContrast(dDelta, dBeta, atEnergy(index));
        }),
      });
      pair += 1;
    }
  }
  return curves;
}

/**
 * Draws one comparison tab in the home spectrum viewBox.
 *
 * `series` share `energyMinEv` to `energyMaxEv`. For vacuum, `beta` and
 * `delta` share one grid and `od` is unused. Otherwise `beta` and `delta`
 * match `od`. Vacuum and materials traces are the contrast
 * function `c(E) = |Δn|² / E⁴` drawn with `log10` on the vertical axis.
 * Vacuum draws no peak labels. π* marks are each film's own
 * maximum in {@link PI_STAR_WINDOWS}. Returns `null` when the series cannot
 * form a finite vertical scale, and when `materials` is requested with fewer
 * than two series.
 */
export function buildCollaborationTab(
  input: CollaborationChartInput,
): { tab: HomeSpectrumTab; xTicks: readonly HomeSpectrumTick[] } | null {
  const { width, height, energyMinEv, energyMaxEv, series } = input;
  const mode = input.mode ?? "overlay";
  if (series.length === 0 || !(energyMaxEv > energyMinEv)) return null;
  if (mode === "materials" && series.length < 2) return null;
  const count =
    mode === "vacuum"
      ? (series[0]?.beta.length ?? 0)
      : (series[0]?.od.length ?? 0);
  if (
    count < 2 ||
    series.some((item) =>
      mode === "vacuum"
        ? item.beta.length !== count || item.delta.length !== count
        : item.od.length !== count ||
          item.beta.length !== count ||
          item.delta.length !== count,
    )
  ) {
    return null;
  }
  const atEnergy = (index: number): number =>
    energyAt(index, count, energyMinEv, energyMaxEv);
  const curves: PlottedCurve[] =
    mode === "vacuum"
      ? series.map((item) => ({
          key: item.key,
          label: item.label,
          ramp: item.ramp,
          values: vacuumContrast(item, atEnergy),
        }))
      : mode === "materials"
        ? materialsContrast(series, atEnergy)
        : series.map((item) => ({
            key: item.key,
            label: item.label,
            ramp: item.ramp,
            values: item.od,
          }));
  const useLog = mode === "vacuum" || mode === "materials";
  const plotted = curves.map((curve) =>
    useLog
      ? curve.values.map((value) =>
          value > 0 ? Math.log10(value) : Number.NaN,
        )
      : curve.values,
  );
  const domain = extent(plotted);
  if (!domain) return null;
  const sx = buildLinearScale(
    [energyMinEv, energyMaxEv],
    [PAD.l, width - PAD.r],
  );
  const sy = buildLinearScale(domain, [height - PAD.b, PAD.t]);
  const traces: HomeSpectrumTrace[] = curves.map((curve, curveIndex) => {
    const samples = plotted[curveIndex] ?? [];
    const xy: XY[] = samples.flatMap((value, index) =>
      Number.isFinite(value) ? [{ x: sx(atEnergy(index)), y: sy(value) }] : [],
    );
    return {
      key: curve.key,
      label: curve.label,
      d: buildTracePath(xy),
      tone: { ramp: curve.ramp },
    };
  });
  const markers: HomeSpectrumMarker[] =
    mode === "peaks"
      ? series.flatMap((item) =>
          PI_STAR_WINDOWS.flatMap(([lo, hi]) => {
            const index = bestPeakIndex(item.od, atEnergy, lo, hi);
            if (index == null) return [];
            return [
              {
                x: sx(atEnergy(index)),
                y: sy(item.od[index] ?? 0),
                label: formatEnergy(atEnergy(index)),
                placement: "point" as const,
                ramp: item.ramp,
              },
            ];
          }),
        )
      : [];
  const xTicks = niceTicks([energyMinEv, energyMaxEv], 4).map((value) => ({
    x: Number(sx(value).toFixed(1)),
    label: formatTick(value),
  }));
  return {
    xTicks,
    tab: {
      id: "compare",
      label:
        mode === "vacuum"
          ? "Vacuum contrast"
          : mode === "materials"
            ? "Binary contrast"
            : mode === "peaks"
              ? "Peaks"
              : "Collaborate",
      caption:
        mode === "vacuum"
          ? "Use open data to compute scattering contrast against vacuum ahead of beamtime."
          : mode === "materials"
            ? "Compute the scattering contrast between two molecules ahead of beamtime."
            : mode === "peaks"
              ? "Compare peaks between similar molecules and across facilities."
              : "Collaborate internationally on the same data and on standardized analyses.",
      wikiHref: "/wiki/atlas/contributing",
      yLabel:
        mode === "vacuum"
          ? "Vacuum contrast"
          : mode === "materials"
            ? "Binary contrast"
            : "Optical density",
      traces,
      bands: [],
      markers,
      yTicks: useLog ? logYTicks(domain, height) : yTicks(domain, height),
      refLines: [],
    },
  };
}
