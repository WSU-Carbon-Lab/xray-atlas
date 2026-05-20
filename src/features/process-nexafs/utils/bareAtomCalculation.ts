/**
 * Henke/CXRO bare-atom optical constants on arbitrary energy grids: fetches per-element form
 * factors once, mixes stoichiometry-weighted mu from f2 and delta from f1 (kkcalc refractive
 * convention), and regrids onto spectrum energies with makima.
 */
import type { BareAtomPoint } from "../types";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  complexAsfToDeltaOptical,
  numberDensityFromMassDensity,
} from "~/features/kk-calc/kkcalc-conversions";
import { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "~/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import { interpolateMakimaSorted } from "~/features/kk-calc/makima-interpolate";
import {
  parseChemicalFormula,
  getAtomicWeight,
  computeMolecularWeight,
  type ElementCountMap,
} from "~/server/utils/chemistry";

const ELECTRON_RADIUS_CM = 2.8179403227e-13;
const AVOGADRO = 6.02214076e23;
const PLANCK_CONSTANT_TIMES_C_EV_CM = 1.23984193e-4;

/** One Henke/CXRO row for an element before mixing onto a spectrum grid. */
export interface AtomFormFactorPoint {
  readonly energy: number;
  readonly f1: number;
  readonly f2: number;
}

async function fetchAtomicFormFactor(
  atom: string,
): Promise<AtomFormFactorPoint[]> {
  try {
    const url = `/api/physics/atomic-form-factor?atom=${encodeURIComponent(atom)}`;

    const response = await fetch(url);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = (await response.json()) as { error?: string };
        errorMessage = errorData.error ?? errorMessage;
      } catch {
        // ignore
      }
      throw new Error(
        `Failed to fetch form factor for ${atom}: ${errorMessage}`,
      );
    }

    const responseData = (await response.json()) as { data?: string };

    if (!responseData.data || typeof responseData.data !== "string") {
      throw new Error(
        `Invalid response format for ${atom}: missing data field`,
      );
    }

    const text: string = responseData.data;
    const lines: string[] = text.trim().split("\n");

    const dataLines = lines.filter((line: string) => {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith("E(eV)") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("!")
      ) {
        return false;
      }
      const parts = trimmed.split(/\s+/).filter((p: string) => p.length > 0);
      if (parts.length < 3) return false;
      const firstNum = parseFloat(parts[0] ?? "");
      return Number.isFinite(firstNum) && firstNum > 0;
    });

    if (dataLines.length === 0) {
      throw new Error(
        `No valid data lines found in response for ${atom}. Response length: ${lines.length} lines.`,
      );
    }

    const points: AtomFormFactorPoint[] = [];

    for (const line of dataLines) {
      const parts = line
        .trim()
        .split(/\s+/)
        .filter((p: string) => p.length > 0);
      if (parts.length < 3) continue;

      const energy = parseFloat(parts[0] ?? "");
      const f1 = parseFloat(parts[1] ?? "");
      const f2 = parseFloat(parts[2] ?? "");

      if (
        Number.isFinite(energy) &&
        energy > 0 &&
        Number.isFinite(f1) &&
        Number.isFinite(f2) &&
        f2 >= 0
      ) {
        points.push({ energy, f1, f2 });
      }
    }

    if (points.length === 0) {
      throw new Error(
        `No valid data points parsed for ${atom}. Checked ${dataLines.length} data lines.`,
      );
    }

    return points.sort((a, b) => a.energy - b.energy);
  } catch (error) {
    console.error(`Error fetching form factor for ${atom}:`, error);
    throw error;
  }
}

function calculateMassAbsorption(
  energyEv: number,
  f2: number,
  atomicWeight: number,
): number {
  const wavelengthCm = PLANCK_CONSTANT_TIMES_C_EV_CM / energyEv;
  const muOverRho =
    (2 * ELECTRON_RADIUS_CM * wavelengthCm * AVOGADRO * f2) / atomicWeight;
  return muOverRho;
}

const atomFormFactorCache = new Map<string, Promise<AtomFormFactorPoint[]>>();

function getCachedAtomFormFactors(atom: string): Promise<AtomFormFactorPoint[]> {
  const existing = atomFormFactorCache.get(atom);
  if (existing) {
    return existing;
  }
  const pending = fetchAtomicFormFactor(atom).catch((err) => {
    atomFormFactorCache.delete(atom);
    throw err;
  });
  atomFormFactorCache.set(atom, pending);
  return pending;
}

async function calculateAtomAbsorption(atom: string): Promise<BareAtomPoint[]> {
  const formFactorData = await getCachedAtomFormFactors(atom);
  const atomicWeight = getAtomicWeight(atom);

  return formFactorData.map((point) => ({
    energy: point.energy,
    absorption: calculateMassAbsorption(point.energy, point.f2, atomicWeight),
  }));
}

const atomBareAbsorptionCache = new Map<string, Promise<BareAtomPoint[]>>();

function getCachedAtomBareAbsorption(atom: string): Promise<BareAtomPoint[]> {
  const existing = atomBareAbsorptionCache.get(atom);
  if (existing) {
    return existing;
  }
  const pending = calculateAtomAbsorption(atom).catch((err) => {
    atomBareAbsorptionCache.delete(atom);
    throw err;
  });
  atomBareAbsorptionCache.set(atom, pending);
  return pending;
}

/**
 * Resolves Henke-derived bare-atom absorption samples for every unique element in `formula` into
 * the module cache so a later {@link calculateBareAtomAbsorption} call on any geometry avoids
 * waiting on duplicate fetches. Swallows parse errors; failed element fetches remain retryable after
 * rejection clears that symbol's cache entry.
 *
 * @param formula Stoichiometry string accepted by {@link parseChemicalFormula} after whitespace trim.
 * @returns Resolves when every unique element's cache entry is settled or rejects on first element failure.
 */
export async function warmBareAtomCacheForFormula(
  formula: string,
): Promise<void> {
  const cleaned = formula.trim().replace(/\s+/g, "");
  if (!cleaned) {
    return;
  }
  let atoms: ElementCountMap;
  try {
    atoms = parseChemicalFormula(cleaned);
  } catch {
    return;
  }
  const symbols = Object.keys(atoms);
  if (symbols.length === 0) {
    return;
  }
  await Promise.all(symbols.map((a) => getCachedAtomFormFactors(a)));
}

function interpolate(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  if (x2 === x1) return y1;
  return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
}

function interpolateBareAtomLinear(
  bareAtomPoints: BareAtomPoint[],
  spectrumEnergies: number[],
): BareAtomPoint[] {
  if (bareAtomPoints.length === 0 || spectrumEnergies.length === 0) {
    return [];
  }

  const sortedBare = [...bareAtomPoints].sort((a, b) => a.energy - b.energy);
  const minBareEnergy = sortedBare[0]!.energy;
  const maxBareEnergy = sortedBare[sortedBare.length - 1]!.energy;

  const interpolated: BareAtomPoint[] = [];

  for (const energy of spectrumEnergies) {
    if (energy <= minBareEnergy) {
      interpolated.push({
        energy,
        absorption: sortedBare[0]!.absorption,
      });
      continue;
    }

    if (energy >= maxBareEnergy) {
      interpolated.push({
        energy,
        absorption: sortedBare[sortedBare.length - 1]!.absorption,
      });
      continue;
    }

    let leftIdx = 0;
    let rightIdx = sortedBare.length - 1;

    for (let i = 0; i < sortedBare.length - 1; i++) {
      if (
        sortedBare[i]!.energy <= energy &&
        sortedBare[i + 1]!.energy >= energy
      ) {
        leftIdx = i;
        rightIdx = i + 1;
        break;
      }
    }

    const left = sortedBare[leftIdx]!;
    const right = sortedBare[rightIdx]!;
    const absorption = interpolate(
      energy,
      left.energy,
      left.absorption,
      right.energy,
      right.absorption,
    );

    interpolated.push({ energy, absorption });
  }

  return interpolated;
}

function strictlyAscendingUniqueEnergies(
  spectrumPoints: readonly SpectrumPoint[],
): number[] {
  const seen = new Set<number>();
  const energies: number[] = [];
  for (const p of spectrumPoints) {
    if (!Number.isFinite(p.energy) || seen.has(p.energy)) {
      continue;
    }
    seen.add(p.energy);
    energies.push(p.energy);
  }
  energies.sort((a, b) => a - b);
  return energies;
}

/**
 * Computes stoichiometry-weighted bare-atom mass absorption mu on the spectrum energy grid. Reuses
 * in-flight and settled Henke-derived per-element curves keyed by element symbol for the lifetime of
 * the module so repeated calls (multiple polarizations, step-edge toggles) avoid redundant fetches.
 *
 * @param formula Chemical stoichiometry string parsed by {@link parseChemicalFormula}.
 * @param spectrumPoints Rows whose `.energy` values define the interpolation grid (only energies are read).
 * @returns One mixed bare-atom mu sample per sorted spectrum energy, same ordering as sorted energies.
 * @throws Error When the formula is empty, unparseable, or no element yields usable absorption data.
 */
export async function calculateBareAtomAbsorption(
  formula: string,
  spectrumPoints: SpectrumPoint[],
): Promise<BareAtomPoint[]> {
  if (spectrumPoints.length === 0) {
    return [];
  }

  const cleanedFormula = formula.trim().replace(/\s+/g, "");
  if (!cleanedFormula) {
    throw new Error("Empty or invalid chemical formula");
  }

  let atoms: ElementCountMap;
  try {
    atoms = parseChemicalFormula(cleanedFormula);
  } catch (error) {
    throw new Error(
      `Failed to parse chemical formula: ${formula}. ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (Object.keys(atoms).length === 0) {
    throw new Error(`Failed to parse any atoms from formula: ${formula}`);
  }

  const molecularWeight = computeMolecularWeight(atoms);

  if (molecularWeight === 0) {
    throw new Error(`Invalid or empty formula: ${formula}`);
  }

  const spectrumEnergies = strictlyAscendingUniqueEnergies(spectrumPoints);

  const atomAbsorptions = new Map<string, BareAtomPoint[]>();
  const failedAtoms: string[] = [];

  for (const [atom] of Object.entries(atoms)) {
    try {
      const atomAbsorption = await getCachedAtomBareAbsorption(atom);
      if (atomAbsorption.length === 0) {
        failedAtoms.push(atom);
        continue;
      }
      const interpolated = interpolateBareAtomLinear(
        atomAbsorption,
        spectrumEnergies,
      );
      if (interpolated.length === 0) {
        failedAtoms.push(atom);
        continue;
      }
      atomAbsorptions.set(atom, interpolated);
    } catch (error) {
      console.error(
        `[BareAtom] Failed to calculate absorption for ${atom}:`,
        error,
      );
      failedAtoms.push(atom);
    }
  }

  if (atomAbsorptions.size === 0) {
    const errorMsg =
      failedAtoms.length > 0
        ? `Failed to calculate absorption for any atoms. Failed: ${failedAtoms.join(", ")}. Formula: ${formula}`
        : `Failed to calculate absorption for any atoms: ${formula}`;
    throw new Error(errorMsg);
  }

  const result: BareAtomPoint[] = [];

  for (let i = 0; i < spectrumEnergies.length; i++) {
    const energy = spectrumEnergies[i];
    if (energy === undefined) continue;
    let totalAbsorption = 0;

    for (const [atom, count] of Object.entries(atoms)) {
      const atomAbs = atomAbsorptions.get(atom);
      if (atomAbs?.[i]) {
        const atomicWeight = getAtomicWeight(atom);
        const weightFraction = (count * atomicWeight) / molecularWeight;
        totalAbsorption += weightFraction * atomAbs[i]!.absorption;
      }
    }

    result.push({
      energy,
      absorption: totalAbsorption,
    });
  }

  return result;
}

/**
 * Computes stoichiometry-weighted bare-atom dispersive delta on the spectrum energy grid from
 * tabulated Henke/CXRO f1: each element's f1 is regridded with makima, summed as count * f1, then
 * converted with the kkcalc refractive prefactor at `massDensityGPerCm3` (default 1 g/cm3). Reuses
 * the same per-element form-factor cache as {@link calculateBareAtomAbsorption}.
 *
 * @param formula Chemical stoichiometry string parsed by {@link parseChemicalFormula}.
 * @param spectrumPoints Rows whose `.energy` values define the destination grid (only energies are read).
 * @param massDensityGPerCm3 Mass density (g/cm3) for number density; defaults to kkcalc upload parity.
 * @returns One mixed bare-atom delta sample per sorted spectrum energy.
 * @throws Error When the formula is empty, unparseable, or no element yields usable Henke data.
 */
export async function calculateBareAtomDelta(
  formula: string,
  spectrumPoints: SpectrumPoint[],
  massDensityGPerCm3: number = DEFAULT_KK_MASS_DENSITY_G_CM3,
): Promise<BareAtomPoint[]> {
  if (spectrumPoints.length === 0) {
    return [];
  }

  const cleanedFormula = formula.trim().replace(/\s+/g, "");
  if (!cleanedFormula) {
    throw new Error("Empty or invalid chemical formula");
  }

  let atoms: ElementCountMap;
  try {
    atoms = parseChemicalFormula(cleanedFormula);
  } catch (error) {
    throw new Error(
      `Failed to parse chemical formula: ${formula}. ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (Object.keys(atoms).length === 0) {
    throw new Error(`Failed to parse any atoms from formula: ${formula}`);
  }

  const molecularWeight = computeMolecularWeight(atoms);
  if (molecularWeight === 0) {
    throw new Error(`Invalid or empty formula: ${formula}`);
  }

  const spectrumEnergies = strictlyAscendingUniqueEnergies(spectrumPoints);
  if (spectrumEnergies.length < 2) {
    return [];
  }

  const numberDensity = numberDensityFromMassDensity(
    massDensityGPerCm3,
    molecularWeight,
  );

  const f1Mixed = new Array<number>(spectrumEnergies.length).fill(0);
  const failedAtoms: string[] = [];

  for (const [atom, count] of Object.entries(atoms)) {
    try {
      const formFactors = await getCachedAtomFormFactors(atom);
      if (formFactors.length < 2) {
        failedAtoms.push(atom);
        continue;
      }
      const henkeE = formFactors.map((p) => p.energy);
      const henkeF1 = formFactors.map((p) => p.f1);
      const f1OnGrid =
        formFactors.length >= 4
          ? interpolateMakimaSorted(spectrumEnergies, henkeE, henkeF1)
          : interpolateBareAtomLinear(
              henkeF1.map((f1, i) => ({
                energy: henkeE[i]!,
                absorption: f1,
              })),
              spectrumEnergies,
            ).map((p) => p.absorption);

      for (let i = 0; i < spectrumEnergies.length; i++) {
        const f1Val = f1OnGrid[i];
        if (typeof f1Val === "number" && Number.isFinite(f1Val)) {
          f1Mixed[i] = f1Mixed[i]! + count * f1Val;
        }
      }
    } catch (error) {
      console.error(
        `[BareAtom] Failed to calculate delta for ${atom}:`,
        error,
      );
      failedAtoms.push(atom);
    }
  }

  if (failedAtoms.length === Object.keys(atoms).length) {
    const errorMsg =
      failedAtoms.length > 0
        ? `Failed to calculate delta for any atoms. Failed: ${failedAtoms.join(", ")}. Formula: ${formula}`
        : `Failed to calculate delta for any atoms: ${formula}`;
    throw new Error(errorMsg);
  }

  const deltaValues = complexAsfToDeltaOptical(
    spectrumEnergies,
    f1Mixed,
    f1Mixed,
    numberDensity,
  );

  const result: BareAtomPoint[] = [];
  for (let i = 0; i < spectrumEnergies.length; i++) {
    const energy = spectrumEnergies[i]!;
    const delta = deltaValues[i]!;
    if (Number.isFinite(delta)) {
      result.push({ energy, absorption: delta });
    }
  }

  return result;
}
