import type { BareAtomPoint } from "../types";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  parseChemicalFormula,
  getAtomicWeight,
  computeMolecularWeight,
  type ElementCountMap,
} from "~/server/utils/chemistry";

const ELECTRON_RADIUS_CM = 2.8179403227e-13;
const AVOGADRO = 6.02214076e23;
const PLANCK_CONSTANT_TIMES_C_EV_CM = 1.23984193e-4;

async function fetchAtomicFormFactor(
  atom: string,
): Promise<Array<{ energy: number; f1: number; f2: number }>> {
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

    const points: Array<{ energy: number; f1: number; f2: number }> = [];

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

async function calculateAtomAbsorption(atom: string): Promise<BareAtomPoint[]> {
  const formFactorData = await fetchAtomicFormFactor(atom);
  const atomicWeight = getAtomicWeight(atom);

  return formFactorData.map((point) => ({
    energy: point.energy,
    absorption: calculateMassAbsorption(point.energy, point.f2, atomicWeight),
  }));
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

function interpolateBareAtom(
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

  const spectrumEnergies = spectrumPoints
    .map((p) => p.energy)
    .sort((a, b) => a - b);

  const atomAbsorptions = new Map<string, BareAtomPoint[]>();
  const failedAtoms: string[] = [];

  for (const [atom, count] of Object.entries(atoms)) {
    try {
      const atomAbsorption = await calculateAtomAbsorption(atom);
      if (atomAbsorption.length === 0) {
        failedAtoms.push(atom);
        continue;
      }
      const interpolated = interpolateBareAtom(
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
