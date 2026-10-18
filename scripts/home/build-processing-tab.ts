/**
 * Builds the home-snapshot processing tab: experimental β, the Henke bare-atom
 * step at 1 g/cm³, pre- and post-edge windows, and π* / σ* peak markers.
 *
 * Callers are the snapshot generator and the one-shot that patches a snapshot
 * already on disk. The home page reads the committed tab and does not import
 * this module, so the Henke table stays out of the client bundle.
 */
import { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "../../src/features/kk-calc/default-kk-mass-density";
import { bareAtomBetaFromHenkeCompoundF2 } from "../../src/features/kk-calc/kkcalc-henke-f2";
import { parseChemicalFormula } from "../../src/features/kk-calc/kkcalc-stoichiometry";
import {
  buildLinearScale,
  buildTracePath,
  niceTicks,
  SPECTRUM_PAD,
  type XY,
} from "../../src/features/home/snapshot/svg-paths";
import type {
  HomeSpectrumBand,
  HomeSpectrumMarker,
  HomeSpectrumTab,
  HomeSpectrumTick,
  HomeSpectrumYTick,
} from "../../src/features/home/snapshot/types";

const POINT = /[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g;
const RESONANCE_BETA = 0.001;
const SHOULDER_EV = 1.6;
const SHOULDER_RATIO = 0.8;
const PROMINENCE_EV = 8;
const PROMINENCE_FRACTION = 0.12;
const CONTINUUM_BETA = 0.0007;
const SIGMA_START_EV = 291;
const LABEL_HEADROOM = 0.58;

interface BetaSample {
  x: number;
  energy: number;
  beta: number;
}

/** Optical-tab geometry and formula used to build one stored processing tab. */
export interface ProcessingTabInput {
  width: number;
  height: number;
  xTicks: readonly HomeSpectrumTick[];
  betaPath: string;
  opticalYTicks: readonly HomeSpectrumYTick[];
  windows: readonly HomeSpectrumBand[];
  formula: string;
}

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

function valleyBeta(
  samples: readonly BetaSample[],
  i: number,
  j: number,
): number {
  const a = Math.min(i, j);
  const b = Math.max(i, j);
  let low = Infinity;
  for (let k = a; k <= b; k++) {
    const beta = samples[k]!.beta;
    if (beta < low) low = beta;
  }
  return low;
}

/** Indices of π* and σ* maxima, dropping shoulders of a taller neighbor. */
function resonancePeakIndices(samples: readonly BetaSample[]): number[] {
  const maxima: number[] = [];
  for (let i = 2; i < samples.length - 2; i++) {
    const beta = samples[i]!.beta;
    if (beta < RESONANCE_BETA) continue;
    if (
      beta >= samples[i - 1]!.beta &&
      beta >= samples[i - 2]!.beta &&
      beta > samples[i + 1]!.beta &&
      beta > samples[i + 2]!.beta
    ) {
      maxima.push(i);
    }
  }
  const kept: number[] = [];
  const byHeight = [...maxima].sort(
    (a, b) => samples[b]!.beta - samples[a]!.beta,
  );
  for (const index of byHeight) {
    const energy = samples[index]!.energy;
    const beta = samples[index]!.beta;
    const shoulder = kept.some((other) => {
      const distance = Math.abs(samples[other]!.energy - energy);
      return (
        distance < SHOULDER_EV && beta >= samples[other]!.beta * SHOULDER_RATIO
      );
    });
    if (shoulder) continue;
    const buried = kept.some((other) => {
      if (samples[other]!.beta < beta) return false;
      const distance = Math.abs(samples[other]!.energy - energy);
      if (distance >= PROMINENCE_EV) return false;
      const drop = beta - valleyBeta(samples, index, other);
      const height = beta - CONTINUUM_BETA;
      return height <= 0 || drop < PROMINENCE_FRACTION * height;
    });
    if (!buried) kept.push(index);
  }
  kept.sort((a, b) => samples[a]!.energy - samples[b]!.energy);
  return kept;
}

/**
 * Builds the processing tab for one stored β polyline.
 *
 * `input.betaPath` and `input.opticalYTicks` are the optical-tab geometry, so
 * energy and β are inverted from the same linear chart scale as the rest of
 * the snapshot. `input.windows` supplies pre- and post-edge bands in that
 * viewBox x. `input.formula` is the molecular formula for the Henke step at
 * {@link DEFAULT_KK_MASS_DENSITY_G_CM3}. The experimental and bare-atom traces
 * share one β axis that includes zero and leaves headroom above the tallest
 * peak for callouts. Returns `null` when the path, ticks, formula, or Henke
 * tables cannot produce a finite overlay.
 */
export function buildProcessingTab(
  input: ProcessingTabInput,
): HomeSpectrumTab | null {
  const points = parsePath(input.betaPath);
  if (points.length < 8 || input.opticalYTicks.length < 2) return null;
  const energyOf = linearMap(
    input.xTicks.slice(0, 2).map((tick) => ({
      at: tick.x,
      value: Number(tick.label),
    })),
  );
  const betaOf = linearMap(
    input.opticalYTicks.slice(0, 2).map((tick) => ({
      at: tick.y,
      value: Number(tick.label),
    })),
  );
  if (!energyOf || !betaOf) return null;

  const samples: BetaSample[] = points.map((point) => ({
    x: point.x,
    energy: energyOf(point.x),
    beta: betaOf(point.y),
  }));
  if (samples.some((sample) => !(sample.energy > 0))) return null;
  if (samples.some((sample) => !Number.isFinite(sample.beta))) return null;

  let henke: number[];
  try {
    henke = bareAtomBetaFromHenkeCompoundF2(
      parseChemicalFormula(input.formula),
      samples.map((sample) => sample.energy),
      DEFAULT_KK_MASS_DENSITY_G_CM3,
    );
  } catch {
    return null;
  }
  if (henke.length !== samples.length) return null;
  if (henke.some((value) => !Number.isFinite(value))) return null;

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, samples[i]!.beta, henke[i]!);
  }
  if (!(peak > 0)) return null;
  const domain: [number, number] = [0, peak * (1 + LABEL_HEADROOM)];
  const sy = buildLinearScale(domain, [
    input.height - SPECTRUM_PAD.b,
    SPECTRUM_PAD.t,
  ]);
  const yTicks: HomeSpectrumYTick[] = niceTicks(domain, 4).map((value) => ({
    y: Number(sy(value).toFixed(1)),
    label: formatTick(value),
  }));
  const pathFor = (values: readonly number[]): string =>
    buildTracePath(
      samples.map((sample, index) => ({
        x: sample.x,
        y: sy(values[index]!),
      })),
    );
  const markers: HomeSpectrumMarker[] = resonancePeakIndices(samples).map(
    (index) => ({
      x: samples[index]!.x,
      y: sy(samples[index]!.beta),
      label: samples[index]!.energy < SIGMA_START_EV ? "π*" : "σ*",
    }),
  );
  const windows = input.windows.filter(
    (band) => band.kind === "pre" || band.kind === "post",
  );

  return {
    id: "processing",
    label: "Processing",
    caption:
      "β pinned to the bare-atom step. Hatched bands are the pre- and post-edge windows; π* and σ* name the peaks.",
    wikiHref: "/wiki/nexafs/normalization",
    yLabel: "β",
    traces: [
      {
        key: "bare-atom",
        label: "Bare atom",
        d: pathFor(henke),
        tone: "muted",
        dashed: true,
      },
      {
        key: "beta",
        label: "β",
        d: pathFor(samples.map((sample) => sample.beta)),
        tone: "primary",
      },
    ],
    bands: windows,
    markers,
    yTicks,
  };
}
