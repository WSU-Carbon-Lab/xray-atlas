/**
 * Turns the committed β and δ preview into the rest of the optical-constant
 * family the dataset plot derives from those stored columns.
 *
 * The home snapshot stores β and δ as SVG polylines, not as samples. This
 * module inverts that linear chart scale. Atomic scattering factors use the
 * kkcalc refractive prefactor at {@link DEFAULT_KK_MASS_DENSITY_G_CM3}.
 * Susceptibility uses the same `n²` product as the plot rail:
 * `Im(χ) = 2β(1-δ)` and `Re(χ) = (1-δ)² - β² - 1`. It does not invent a second
 * measured curve and does not read columns the snapshot does not store.
 */
import { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "~/features/kk-calc/default-kk-mass-density";
import {
  numberDensityFromMassDensity,
  opticalDeltaToRealAsf,
  refractiveBetaToImaginaryAsf,
} from "~/features/kk-calc/kkcalc-conversions";
import {
  formulaMassFromComposition,
  parseChemicalFormula,
} from "~/features/kk-calc/kkcalc-stoichiometry";
import {
  buildLinearScale,
  buildTracePath,
  niceTicks,
  SPECTRUM_PAD,
  type XY,
} from "../snapshot/svg-paths";
import type {
  HomeSnapshotSpectrum,
  HomeSpectrumTab,
  HomeSpectrumTrace,
  HomeSpectrumYTick,
} from "../snapshot/types";

interface OpticalSamples {
  optical: HomeSpectrumTab;
  betaPoints: XY[];
  deltaPoints: XY[];
  betas: number[];
  deltas: number[];
}

const POINT = /[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g;

function parsePath(d: string): XY[] {
  const points: XY[] = [];
  for (const match of d.matchAll(POINT)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
  }
  return points;
}

function linearMap(
  samples: readonly { at: number; value: number }[],
): ((at: number) => number) | null {
  const a = samples[0];
  const b = samples[1];
  if (!a || !b) return null;
  const span = b.at - a.at;
  if (span === 0 || !Number.isFinite(span)) return null;
  return (at) => a.value + ((at - a.at) / span) * (b.value - a.value);
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

/** Inverts the stored β and δ polylines. Returns `null` when the chart scale is missing. */
function readOpticalSamples(
  spectrum: HomeSnapshotSpectrum,
): OpticalSamples | null {
  const optical = spectrum.tabs.find((tab) => tab.id === "optical");
  const beta = optical?.traces.find((trace) => trace.key === "beta");
  const delta = optical?.traces.find((trace) => trace.key === "delta");
  const yTicks = optical?.yTicks;
  if (!optical || !beta || !delta || !yTicks || yTicks.length < 2) return null;

  const betaPoints = parsePath(beta.d);
  const deltaPoints = parsePath(delta.d);
  if (betaPoints.length < 2 || deltaPoints.length !== betaPoints.length) {
    return null;
  }
  const valueOf = linearMap(
    yTicks.slice(0, 2).map((tick) => ({
      at: tick.y,
      value: Number(tick.label),
    })),
  );
  if (!valueOf) return null;
  const betas = betaPoints.map((point) => valueOf(point.y));
  const deltas = deltaPoints.map((point) => valueOf(point.y));
  if (
    betas.some((value) => !Number.isFinite(value)) ||
    deltas.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }
  return { optical, betaPoints, deltaPoints, betas, deltas };
}

function extent(series: readonly ArrayLike<number>[]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const values of series) {
    for (let i = 0; i < values.length; i++) {
      const value = values[i]!;
      if (!Number.isFinite(value)) return null;
      lo = Math.min(lo, value);
      hi = Math.max(hi, value);
    }
  }
  if (!(hi > lo)) return null;
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

/**
 * Draws `traces` on one joint y scale in the snapshot viewBox.
 *
 * `samples` supplies the viewBox x positions. `values` aligns with those
 * positions. `domain` is the data range mapped onto the plot frame.
 */
function chartTab(
  samples: OpticalSamples,
  height: number,
  caption: string,
  yLabel: string,
  traces: readonly {
    key: string;
    label: string;
    values: ArrayLike<number>;
    points: readonly XY[];
    tone: HomeSpectrumTrace["tone"];
  }[],
  domain: readonly [number, number],
): HomeSpectrumTab {
  const sy = buildLinearScale(domain, [
    height - SPECTRUM_PAD.b,
    SPECTRUM_PAD.t,
  ]);
  const yTicks: HomeSpectrumYTick[] = niceTicks(domain, 4).map((value) => ({
    y: Number(sy(value).toFixed(1)),
    label: formatTick(value),
  }));
  return {
    ...samples.optical,
    caption,
    yLabel,
    traces: traces.map((trace) => ({
      key: trace.key,
      label: trace.label,
      tone: trace.tone,
      d: buildTracePath(
        trace.points.map((point, index) => ({
          x: point.x,
          y: sy(trace.values[index]!),
        })),
      ),
    })),
    yTicks,
    bands: [],
    markers: [],
  };
}

/**
 * Builds the scattering-factor chart for one snapshot spectrum.
 *
 * `spectrum` supplies the optical tab paths and the axis ticks that invert
 * them. `formula` is the molecular formula used for the 1 g/cm³ number
 * density; an unparsable formula yields `null` and the preview omits this
 * display. Returns a tab whose traces are f₂ (from β) and f₁ (from δ) in the
 * same viewBox x positions, with a joint y scale.
 */
export function scatteringFactorsTab(
  spectrum: HomeSnapshotSpectrum,
  formula: string,
): HomeSpectrumTab | null {
  const samples = readOpticalSamples(spectrum);
  if (!samples) return null;
  const energyOf = linearMap(
    spectrum.xTicks.slice(0, 2).map((tick) => ({
      at: tick.x,
      value: Number(tick.label),
    })),
  );
  if (!energyOf) return null;
  const energy = samples.betaPoints.map((point) => energyOf(point.x));
  if (energy.some((ev) => !(ev > 0))) return null;

  let density: number;
  try {
    density = numberDensityFromMassDensity(
      DEFAULT_KK_MASS_DENSITY_G_CM3,
      formulaMassFromComposition(parseChemicalFormula(formula)),
    );
  } catch {
    return null;
  }

  const f2 = refractiveBetaToImaginaryAsf(energy, samples.betas, density);
  const f1 = opticalDeltaToRealAsf(energy, samples.deltas, density);
  const domain = extent([f2, f1]);
  if (!domain) return null;
  return chartTab(
    samples,
    spectrum.height,
    "Atomic scattering factors at 1 g/cm³. f₂ follows from β, and f₁ follows from δ.",
    "f₁, f₂",
    [
      {
        key: "f2",
        label: "f₂",
        values: f2,
        points: samples.betaPoints,
        tone: "primary",
      },
      {
        key: "f1",
        label: "f₁",
        values: f1,
        points: samples.deltaPoints,
        tone: "muted",
      },
    ],
    domain,
  );
}

/**
 * Builds the susceptibility chart for one snapshot spectrum.
 *
 * `spectrum` supplies the stored β and δ paths. Returns `null` when those
 * paths cannot be inverted. `Im(χ)` is `2β(1-δ)` and `Re(χ)` is
 * `(1-δ)² - β² - 1`, the exact `n²` product the dataset plot uses.
 */
export function susceptibilityTab(
  spectrum: HomeSnapshotSpectrum,
): HomeSpectrumTab | null {
  const samples = readOpticalSamples(spectrum);
  if (!samples) return null;
  const imChi = new Float64Array(samples.betas.length);
  const reChi = new Float64Array(samples.betas.length);
  for (let i = 0; i < samples.betas.length; i++) {
    const reN = 1 - samples.deltas[i]!;
    const imN = samples.betas[i]!;
    imChi[i] = 2 * reN * imN;
    reChi[i] = reN * reN - imN * imN - 1;
  }
  const domain = extent([imChi, reChi]);
  if (!domain) return null;
  return chartTab(
    samples,
    spectrum.height,
    "Susceptibility of this spectrum. Im(χ) is the absorptive part; Re(χ) is the dispersive part.",
    "χ",
    [
      {
        key: "im-chi",
        label: "Im(χ)",
        values: imChi,
        points: samples.betaPoints,
        tone: "primary",
      },
      {
        key: "re-chi",
        label: "Re(χ)",
        values: reChi,
        points: samples.deltaPoints,
        tone: "muted",
      },
    ],
    domain,
  );
}
