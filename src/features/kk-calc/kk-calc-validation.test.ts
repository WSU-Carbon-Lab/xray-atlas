/**
 * KK-calc validation against Python references under `tests/kk-calc-validation`.
 *
 * **Single committed SSOT:** NEXAFS CSV export under `src/features/kk-calc/__fixtures__/` with
 * columns `energy_eV`, `beta`, and persisted `delta` from the Atlas TS/database pipeline.
 *
 * - **Discrete kernel**: `computeDeltaFromBetaDiscreteKK` matches NumPy `discrete_delta_from_beta`
 *   (`discrete-mirror --csv`) within **rtol=1e-12**, **atol=1e-14**.
 * - **Makima**: `alignKkDeltaToSpectrumEnergyAxis` matches SciPy makima on a **kkcalc2 optical-beta**
 *   δ curve subsampled from the same CSV (**kkcalc-delta-optical-beta**, C72H14O2, 1 g/cm³).
 * - **Discrete KK vs kkcalc2 optical**: TS coarse discrete KK + makima vs full-grid kkcalc2 optical δ;
 *   metrics use optional **±1** sign on TS for convention parity (Pearson **r**, **RMSE**, **max abs**).
 * - **Persisted δ vs kkcalc2**: CSV **`delta`** column (what was stored) compared directly to
 *   **`kkcalc-delta-optical-beta`** δ recomputed from CSV **`beta`** (same formula/density as kkcalc2).
 *
 * Prereq: `uv sync` in `tests/kk-calc-validation`; `uv` on `PATH`.
 *
 * Commands: `bun run test:kk-calc-validation` or
 * `bun test src/features/kk-calc/kk-calc-validation.test.ts`
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import { computeDeltaFromBetaDiscreteKK } from "./kk-discrete-henke";
import { alignKkDeltaToSpectrumEnergyAxis } from "./makima-interpolate";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeLessThanOrEqual: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const validationDir = path.join(repoRoot, "tests", "kk-calc-validation");
const csvFixturePath = path.join(
  __dirname,
  "__fixtures__",
  "nexafs-experiment-30539a6a-pol-86906b55-th55-ph0.csv",
);

interface CsvSpectrum {
  energyEv: number[];
  beta: number[];
}

interface CsvSpectrumWithPersistedDelta extends CsvSpectrum {
  deltaPersisted: number[];
}

function loadNexafsCsvEnergyBeta(csvAbsolutePath: string): CsvSpectrum {
  const text = readFileSync(csvAbsolutePath, "utf-8");
  const lines = text.trimEnd().split("\n").filter((line) => line.length > 0);
  if (lines.length < 2) {
    throw new RangeError("CSV must contain a header row and at least one data row");
  }
  const header = lines[0]!.split(",");
  const ie = header.indexOf("energy_eV");
  const ib = header.indexOf("beta");
  if (ie < 0 || ib < 0) {
    throw new RangeError('CSV must include "energy_eV" and "beta" header columns');
  }
  const energyEv: number[] = [];
  const beta: number[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r]!.split(",");
    energyEv.push(Number(cols[ie]));
    beta.push(Number(cols[ib]));
  }
  if (energyEv.length < 4) {
    throw new RangeError("At least four samples are required");
  }
  for (let i = 0; i < energyEv.length; i++) {
    if (!Number.isFinite(energyEv[i]) || !Number.isFinite(beta[i])) {
      throw new RangeError("energy_eV and beta must contain only finite numbers");
    }
  }
  for (let i = 1; i < energyEv.length; i++) {
    if (energyEv[i]! <= energyEv[i - 1]!) {
      throw new RangeError(
        "energy_eV must be strictly ascending with unique energies for each sample",
      );
    }
  }
  return { energyEv, beta };
}

function loadNexafsCsvEnergyBetaDeltaPersisted(
  csvAbsolutePath: string,
): CsvSpectrumWithPersistedDelta {
  const text = readFileSync(csvAbsolutePath, "utf-8");
  const lines = text.trimEnd().split("\n").filter((line) => line.length > 0);
  if (lines.length < 2) {
    throw new RangeError("CSV must contain a header row and at least one data row");
  }
  const header = lines[0]!.split(",");
  const ie = header.indexOf("energy_eV");
  const ib = header.indexOf("beta");
  const id = header.indexOf("delta");
  if (ie < 0 || ib < 0 || id < 0) {
    throw new RangeError(
      'CSV must include "energy_eV", "beta", and "delta" header columns',
    );
  }
  const energyEv: number[] = [];
  const beta: number[] = [];
  const deltaPersisted: number[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r]!.split(",");
    energyEv.push(Number(cols[ie]));
    beta.push(Number(cols[ib]));
    deltaPersisted.push(Number(cols[id]));
  }
  if (energyEv.length < 4) {
    throw new RangeError("At least four samples are required");
  }
  for (let i = 0; i < energyEv.length; i++) {
    if (
      !Number.isFinite(energyEv[i]) ||
      !Number.isFinite(beta[i]) ||
      !Number.isFinite(deltaPersisted[i])
    ) {
      throw new RangeError("energy_eV, beta, and delta must contain only finite numbers");
    }
  }
  for (let i = 1; i < energyEv.length; i++) {
    if (energyEv[i]! <= energyEv[i - 1]!) {
      throw new RangeError(
        "energy_eV must be strictly ascending with unique energies for each sample",
      );
    }
  }
  return { energyEv, beta, deltaPersisted };
}

function runReference(args: string[], stdin?: string): string {
  const r = spawnSync("uv", ["run", "python", "run_reference.py", ...args], {
    cwd: validationDir,
    encoding: "utf-8",
    env: process.env,
    ...(stdin !== undefined ? { input: stdin } : {}),
  });
  if (r.error) {
    throw r.error;
  }
  if (r.status !== 0) {
    const errText = r.stderr?.trim();
    throw new Error(
      errText || `uv run python failed with exit ${String(r.status)}`,
    );
  }
  return r.stdout;
}

function parseNumberArrayField(raw: string, field: "delta"): number[] {
  const v: unknown = JSON.parse(raw);
  if (typeof v !== "object" || v === null || !(field in v)) {
    throw new TypeError(`Expected JSON object with "${field}" array`);
  }
  const arr = (v as Record<string, unknown>)[field];
  if (!Array.isArray(arr) || !arr.every((x): x is number => typeof x === "number")) {
    throw new TypeError(`"${field}" must be an array of numbers`);
  }
  return arr;
}

function assertAllClose(
  a: readonly number[],
  b: readonly number[],
  rtol: number,
  atol: number,
): void {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    const tol = atol + rtol * (1 + Math.abs(x));
    const diff = Math.abs(x - y);
    expect(diff).toBeLessThanOrEqual(tol);
  }
}

function pearsonSampleCorrelation(
  x: readonly number[],
  y: readonly number[],
): number {
  expect(x.length).toBe(y.length);
  const n = x.length;
  if (n === 0) {
    return Number.NaN;
  }
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i]!;
    my += y[i]!;
  }
  mx /= n;
  my /= n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = x[i]! - mx;
    const vy = y[i]! - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? Number.NaN : num / den;
}

function rootMeanSquareError(
  a: readonly number[],
  b: readonly number[],
): number {
  expect(a.length).toBe(b.length);
  const n = a.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i]! - b[i]!;
    s += d * d;
  }
  return Math.sqrt(s / n);
}

function maxAbsoluteDifference(
  a: readonly number[],
  b: readonly number[],
): number {
  expect(a.length).toBe(b.length);
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
}

function pickTsDeltaSignVersusKkcalcDelta(
  tsDelta: readonly number[],
  kkcalcDelta: readonly number[],
): -1 | 1 {
  const rPos = pearsonSampleCorrelation(tsDelta, kkcalcDelta);
  const rNeg = pearsonSampleCorrelation(
    tsDelta.map((v) => -v),
    kkcalcDelta,
  );
  return Math.abs(rNeg) >= Math.abs(rPos) ? -1 : 1;
}

function buildCoarseSpectrumIndices(length: number, step: number): number[] {
  const coarseIdx: number[] = [];
  for (let i = 0; i < length; i += step) {
    coarseIdx.push(i);
  }
  const last = length - 1;
  if (coarseIdx[coarseIdx.length - 1] !== last) {
    coarseIdx.push(last);
  }
  return coarseIdx;
}

function kkcalcDeltaOpticalBetaFromCsv(): number[] {
  return parseNumberArrayField(
    runReference([
      "kkcalc-delta-optical-beta",
      "--csv",
      csvFixturePath,
      "--formula",
      "C72H14O2",
      "--density",
      "1",
    ]),
    "delta",
  );
}

describe("kk-calc validation vs Python kkcalc2 + SciPy", () => {
  it("discrete KK matches NumPy mirror (rtol=1e-12, atol=1e-14)", () => {
    const { energyEv, beta } = loadNexafsCsvEnergyBeta(csvFixturePath);
    const ts = computeDeltaFromBetaDiscreteKK(energyEv, beta);
    const pyDelta = parseNumberArrayField(
      runReference(["discrete-mirror", "--csv", csvFixturePath]),
      "delta",
    );
    assertAllClose(ts, pyDelta, 1e-12, 1e-14);
  });

  it("makima alignment matches SciPy on kkcalc2 optical-beta δ subsampled curve (rtol=1e-9, atol=1e-11)", () => {
    const { energyEv } = loadNexafsCsvEnergyBeta(csvFixturePath);
    const deltaKkcalc = kkcalcDeltaOpticalBetaFromCsv();
    expect(deltaKkcalc.length).toBe(energyEv.length);
    const step = 5;
    const coarseIdx = buildCoarseSpectrumIndices(energyEv.length, step);
    const coarseE = coarseIdx.map((i) => energyEv[i]!);
    const coarseY = coarseIdx.map((i) => deltaKkcalc[i]!);
    expect(coarseE.length).toBeGreaterThanOrEqual(4);

    const tsAligned = alignKkDeltaToSpectrumEnergyAxis(
      energyEv,
      coarseE,
      coarseY,
    );
    const payload = JSON.stringify({
      targetEnergyEv: energyEv,
      sourceEnergyEv: coarseE,
      sourceDelta: coarseY,
    });
    const scipyDelta = parseNumberArrayField(
      runReference(["scipy-makima"], payload),
      "delta",
    );
    assertAllClose(tsAligned, scipyDelta, 1e-9, 1e-11);
  });

  it("reports δ similarity: TS discrete KK + makima vs kkcalc2 optical-beta δ", () => {
    const { energyEv, beta } = loadNexafsCsvEnergyBeta(csvFixturePath);
    const deltaKkcalc = kkcalcDeltaOpticalBetaFromCsv();
    expect(deltaKkcalc.length).toBe(energyEv.length);
    const step = 5;
    const coarseIdx = buildCoarseSpectrumIndices(energyEv.length, step);
    const coarseE = coarseIdx.map((i) => energyEv[i]!);
    const coarseBeta = coarseIdx.map((i) => beta[i]!);
    expect(coarseE.length).toBeGreaterThanOrEqual(4);

    const coarseDeltaTs = computeDeltaFromBetaDiscreteKK(coarseE, coarseBeta);
    const deltaTsPath = alignKkDeltaToSpectrumEnergyAxis(
      energyEv,
      coarseE,
      coarseDeltaTs,
    );

    const signVersusTsDiscreteKkDelta = pickTsDeltaSignVersusKkcalcDelta(
      deltaTsPath,
      deltaKkcalc,
    );
    const tsCompared = deltaTsPath.map((v) => signVersusTsDiscreteKkDelta * v);

    const pearsonR = pearsonSampleCorrelation(tsCompared, deltaKkcalc);
    const rmse = rootMeanSquareError(tsCompared, deltaKkcalc);
    const maxAbsError = maxAbsoluteDifference(tsCompared, deltaKkcalc);

    console.info(
      JSON.stringify({
        csvFixture: "src/features/kk-calc/__fixtures__/nexafs-experiment-30539a6a-pol-86906b55-th55-ph0.csv",
        deltaSimilarityTsDiscreteKkMakimaVersusKkcalcOpticalBeta: {
          coarseGridStep: step,
          signVersusTsDiscreteKkDelta,
          pearsonR,
          rmse,
          maxAbsError,
        },
      }),
    );

    expect(Number.isFinite(pearsonR)).toBe(true);
    expect(pearsonR).toBeGreaterThanOrEqual(0.945);
    expect(rmse).toBeLessThanOrEqual(3.0e-3);
    expect(maxAbsError).toBeLessThanOrEqual(1.1e-2);
  });

  it("persisted CSV δ (TS/DB) vs kkcalc2 δ recomputed from optical β (same grid)", () => {
    const { energyEv, deltaPersisted } =
      loadNexafsCsvEnergyBetaDeltaPersisted(csvFixturePath);
    const deltaKkcalc = kkcalcDeltaOpticalBetaFromCsv();
    expect(deltaKkcalc.length).toBe(energyEv.length);
    expect(deltaPersisted.length).toBe(energyEv.length);

    const sign = pickTsDeltaSignVersusKkcalcDelta(deltaPersisted, deltaKkcalc);
    const persistedCompared = deltaPersisted.map((v) => sign * v);

    const pearsonR = pearsonSampleCorrelation(persistedCompared, deltaKkcalc);
    const rmse = rootMeanSquareError(persistedCompared, deltaKkcalc);
    const maxAbsError = maxAbsoluteDifference(persistedCompared, deltaKkcalc);

    console.info(
      JSON.stringify({
        csvPersistedDeltaVersusKkcalcOpticalBeta: {
          formula: "C72H14O2",
          density_g_per_cm3: 1,
          signAppliedToPersistedCsvDelta: sign,
          pearsonR,
          rmse,
          maxAbsError,
        },
      }),
    );

    expect(Number.isFinite(pearsonR)).toBe(true);
    expect(pearsonR).toBeGreaterThanOrEqual(0.94);
    expect(rmse).toBeLessThanOrEqual(0.02);
    expect(maxAbsError).toBeLessThanOrEqual(0.085);
  });
});
