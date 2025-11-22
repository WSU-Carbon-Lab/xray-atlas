import type { BareAtomPoint } from "../types";
import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";

// Atomic weights (g/mol) for common elements
const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008,
  He: 4.003,
  Li: 6.941,
  Be: 9.012,
  B: 10.81,
  C: 12.01,
  N: 14.01,
  O: 16.0,
  F: 19.0,
  Ne: 20.18,
  Na: 22.99,
  Mg: 24.31,
  Al: 27.98,
  Si: 28.09,
  P: 30.97,
  S: 32.07,
  Cl: 35.45,
  Ar: 39.95,
  K: 39.1,
  Ca: 40.08,
  // Add more as needed
};

// Parse chemical formula to get atom counts
// Example: "C6H6" -> {C: 6, H: 6}
function parseFormula(formula: string): Record<string, number> {
  const atoms: Record<string, number> = {};
  const regex = /([A-Z][a-z]*)(\d*)/g;
  let match;

  while ((match = regex.exec(formula)) !== null) {
    const element = match[1];
    if (!element) continue; // Skip if element is undefined
    const count = match[2] ? parseInt(match[2], 10) : 1;
    atoms[element] = (atoms[element] ?? 0) + count;
  }

  return atoms;
}

// Calculate molecular weight from formula
function calculateMolecularWeight(formula: string): number {
  const atoms = parseFormula(formula);
  let mw = 0;

  for (const [element, count] of Object.entries(atoms)) {
    const atomicWeight = ATOMIC_WEIGHTS[element];
    if (!atomicWeight) {
      console.warn(`Unknown atomic weight for element: ${element}`);
      continue;
    }
    mw += atomicWeight * count;
  }

  return mw;
}

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

// Calculate mass absorption coefficient from f2
// μ = (4π/λ) * (f2 / A) where λ = hc/E, so μ = (4πE/hc) * (f2/A)
// Using: hc = 1239.84 eV·nm, converting to cm: hc = 1.23984e-4 eV·cm
// μ (cm²/g) = (4π * E / hc) * (f2 / A) where E in eV, A in g/mol
function calculateMassAbsorption(
  energyEv: number,
  f2: number,
  atomicWeight: number,
): number {
  // hc in eV·cm: 1239.84 eV·nm = 1.23984e-4 eV·cm
  const hc = 1.23984e-4; // eV·cm
  // Convert atomic weight from g/mol to g/atom (divide by Avogadro's number)
  // But we want mass absorption in cm²/g, so we use atomic weight directly
  // μ = (4π * E / hc) * (f2 / A) where A is in g/mol
  // Actually, for mass absorption: μ = (4π/λ) * (f2 / A) with proper units
  // More accurate: μ (cm²/g) = (4π * E / (hc)) * (f2 / A) * (N_A / N_A)
  // Simplified: μ = (4π * E * f2) / (hc * A)
  const wavelengthCm = hc / energyEv; // cm
  const mu = ((4 * Math.PI) / wavelengthCm) * (f2 / atomicWeight);
  return mu;
}

// Calculate bare atom absorption for a single atom
async function calculateAtomAbsorption(atom: string): Promise<BareAtomPoint[]> {
  const formFactorData = await fetchAtomicFormFactor(atom);
  const atomicWeight = ATOMIC_WEIGHTS[atom];

  if (!atomicWeight) {
    throw new Error(`Unknown atomic weight for element: ${atom}`);
  }

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

  // Parse formula to get atom counts
  const atoms = parseFormula(cleanedFormula);

  if (Object.keys(atoms).length === 0) {
    throw new Error(
      `Failed to parse any atoms from formula: ${formula} (cleaned: ${cleanedFormula})`,
    );
  }

  console.log(`[BareAtom] Parsed formula ${cleanedFormula} into atoms:`, atoms);

  const molecularWeight = calculateMolecularWeight(cleanedFormula);

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

  // Sum contributions: μ_total = Σ(x_i * μ_i) / MW
  // where x_i is the number of atoms of type i, μ_i is mass absorption for atom i
  const result: BareAtomPoint[] = [];

  for (let i = 0; i < spectrumEnergies.length; i++) {
    const energy = spectrumEnergies[i];
    if (energy === undefined) continue;
    let totalAbsorption = 0;

    for (const [atom, count] of Object.entries(atoms)) {
      const atomAbs = atomAbsorptions.get(atom);
      if (atomAbs?.[i]) {
        // Contribution = (count * atomic_weight * μ_atom) / molecular_weight
        // But since μ_atom is already mass absorption (cm²/g), we need:
        // μ_total = Σ(count_i * A_i * μ_i) / MW
        const atomicWeight = ATOMIC_WEIGHTS[atom] ?? 0;
        if (atomicWeight > 0) {
          totalAbsorption +=
            (count * atomicWeight * atomAbs[i]!.absorption) / molecularWeight;
        }
      }
    }

    result.push({
      energy,
      absorption: totalAbsorption,
    });
  }

  return result;
}
