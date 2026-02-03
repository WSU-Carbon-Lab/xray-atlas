import type { BareAtomPoint } from "../types";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  parseChemicalFormula,
  getAtomicWeight,
  computeMolecularWeight,
  type ElementCountMap,
} from "~/server/utils/chemistry";

// Physical constants for mass absorption coefficient calculation
// X-ray Data Booklet formula: μ/ρ = (2 * rₑ * λ * Nₐ * f₂) / A
const ELECTRON_RADIUS_CM = 2.8179403227e-13; // cm (classical electron radius)
const AVOGADRO = 6.02214076e23; // mol⁻¹ (Avogadro's number)
const PLANCK_CONSTANT_TIMES_C_EV_CM = 1.23984193e-4; // eV·cm (hc constant)

// Fetch atomic form factor data from CXRO via API route
async function fetchAtomicFormFactor(
  atom: string,
): Promise<Array<{ energy: number; f1: number; f2: number }>> {
  try {
    const url = `/api/physics/atomic-form-factor?atom=${encodeURIComponent(atom)}`;
    console.log(`[BareAtom] Fetching from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = (await response.json()) as { error?: string };
        errorMessage = errorData.error ?? errorMessage;
      } catch {
        // If JSON parsing fails, use the status text
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

    // Skip header lines (usually first 1-2 lines)
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
      // Check if line contains numeric data (at least 3 space-separated numbers)
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
      // Handle both space and tab delimiters
      const parts = line
        .trim()
        .split(/\s+/)
        .filter((p: string) => p.length > 0);
      if (parts.length < 3) continue;

      const energy = parseFloat(parts[0] ?? "");
      const f1 = parseFloat(parts[1] ?? "");
      const f2 = parseFloat(parts[2] ?? "");

      // Validate data - energy must be positive, f2 must be non-negative
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
        `No valid data points parsed for ${atom}. Checked ${dataLines.length} data lines. First few lines: ${dataLines.slice(0, 3).join(" | ")}`,
      );
    }

    return points.sort((a, b) => a.energy - b.energy);
  } catch (error) {
    console.error(`Error fetching form factor for ${atom}:`, error);
    throw error;
  }
}

// Calculate mass absorption coefficient from f2 using X-ray Data Booklet formula
// μ/ρ = (2 * rₑ * λ * Nₐ * f₂) / A
// where:
//   rₑ = classical electron radius (cm)
//   λ = wavelength (cm)
//   Nₐ = Avogadro's number (mol⁻¹)
//   f₂ = imaginary part of atomic scattering factor
//   A = atomic mass (g/mol)
// Result: μ/ρ in cm²/g (mass absorption coefficient)
function calculateMassAbsorption(
  energyEv: number,
  f2: number,
  atomicWeight: number,
): number {
  // Calculate wavelength from energy: λ = hc / E
  const wavelengthCm = PLANCK_CONSTANT_TIMES_C_EV_CM / energyEv; // cm

  // X-ray Data Booklet formula: μ/ρ = (2 * rₑ * λ * Nₐ * f₂) / A
  const muOverRho =
    (2 * ELECTRON_RADIUS_CM * wavelengthCm * AVOGADRO * f2) / atomicWeight;

  return muOverRho;
}

// Calculate bare atom absorption for a single atom
async function calculateAtomAbsorption(atom: string): Promise<BareAtomPoint[]> {
  const formFactorData = await fetchAtomicFormFactor(atom);
  const atomicWeight = getAtomicWeight(atom);

  return formFactorData.map((point) => ({
    energy: point.energy,
    absorption: calculateMassAbsorption(point.energy, point.f2, atomicWeight),
  }));
}

// Linear interpolation
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

// Interpolate bare atom points to match spectrum energy range
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
    // If energy is outside bare atom range, use boundary values
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

    // Find surrounding points for interpolation
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

// Calculate bare atom absorption for a molecular formula
export async function calculateBareAtomAbsorption(
  formula: string,
  spectrumPoints: SpectrumPoint[],
): Promise<BareAtomPoint[]> {
  if (spectrumPoints.length === 0) {
    return [];
  }

  // Clean and validate formula
  const cleanedFormula = formula.trim().replace(/\s+/g, "");
  if (!cleanedFormula) {
    throw new Error("Empty or invalid chemical formula");
  }

  // Parse formula to get atom counts using shared chemistry utilities
  let atoms: ElementCountMap;
  try {
    atoms = parseChemicalFormula(cleanedFormula);
  } catch (error) {
    throw new Error(
      `Failed to parse chemical formula: ${formula} (cleaned: ${cleanedFormula}). ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (Object.keys(atoms).length === 0) {
    throw new Error(
      `Failed to parse any atoms from formula: ${formula} (cleaned: ${cleanedFormula})`,
    );
  }

  console.log(`[BareAtom] Parsed formula ${cleanedFormula} into atoms:`, atoms);

  // Calculate molecular weight using shared chemistry utilities
  const molecularWeight = computeMolecularWeight(atoms);

  if (molecularWeight === 0) {
    throw new Error(
      `Invalid or empty formula: ${formula} (cleaned: ${cleanedFormula})`,
    );
  }

  console.log(`[BareAtom] Molecular weight: ${molecularWeight}`);

  // Extract unique energies from spectrum
  const spectrumEnergies = spectrumPoints
    .map((p) => p.energy)
    .sort((a, b) => a - b);

  // Calculate absorption for each atom type
  const atomAbsorptions = new Map<string, BareAtomPoint[]>();
  const failedAtoms: string[] = [];

  for (const [atom, count] of Object.entries(atoms)) {
    try {
      console.log(
        `[BareAtom] Fetching data for atom ${atom} (count: ${count})...`,
      );
      const atomAbsorption = await calculateAtomAbsorption(atom);
      if (atomAbsorption.length === 0) {
        console.warn(`[BareAtom] No data returned for atom ${atom}`);
        failedAtoms.push(atom);
        continue;
      }
      console.log(
        `[BareAtom] Got ${atomAbsorption.length} points for ${atom}, interpolating...`,
      );
      const interpolated = interpolateBareAtom(
        atomAbsorption,
        spectrumEnergies,
      );
      if (interpolated.length === 0) {
        console.warn(`[BareAtom] Failed to interpolate data for atom ${atom}`);
        failedAtoms.push(atom);
        continue;
      }
      console.log(
        `[BareAtom] Successfully processed ${atom} with ${interpolated.length} interpolated points`,
      );
      atomAbsorptions.set(atom, interpolated);
    } catch (error) {
      console.error(
        `[BareAtom] Failed to calculate absorption for ${atom}:`,
        error,
      );
      failedAtoms.push(atom);
      // Continue with other atoms
    }
  }

  if (atomAbsorptions.size === 0) {
    const errorMsg =
      failedAtoms.length > 0
        ? `Failed to calculate absorption for any atoms in the formula. Failed atoms: ${failedAtoms.join(", ")}. Formula: ${formula}`
        : `Failed to calculate absorption for any atoms in the formula: ${formula}`;
    throw new Error(errorMsg);
  }

  if (failedAtoms.length > 0) {
    console.warn(
      `Some atoms failed to load, but continuing with available data. Failed: ${failedAtoms.join(", ")}`,
    );
  }

  // Calculate combined mass absorption coefficient using weight fraction approach
  // (μ/ρ)_total = Σ(w_i * (μ/ρ)_i)
  // where w_i = (count_i * A_i) / MW is the weight fraction of element i
  // This follows the X-ray Data Booklet methodology for density = 1 g/cm³
  const result: BareAtomPoint[] = [];

  for (let i = 0; i < spectrumEnergies.length; i++) {
    const energy = spectrumEnergies[i];
    if (energy === undefined) continue;
    let totalAbsorption = 0;

    for (const [atom, count] of Object.entries(atoms)) {
      const atomAbs = atomAbsorptions.get(atom);
      if (atomAbs?.[i]) {
        // Weight fraction: w_i = (count_i * A_i) / MW
        const atomicWeight = getAtomicWeight(atom);
        const weightFraction = (count * atomicWeight) / molecularWeight;

        // Total mass absorption: (μ/ρ)_total = Σ(w_i * (μ/ρ)_i)
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
