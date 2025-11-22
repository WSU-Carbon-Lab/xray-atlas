import {
  computeMolecularWeight,
  getAtomicWeight,
  parseChemicalFormula,
} from "./chemistry";

const CXRO_BASE_URL = "https://henke.lbl.gov/optical_constants/sf";
const ELECTRON_RADIUS_CM = 2.8179403227e-13; // cm
const PLANCK_CONSTANT_TIMES_C_EV_ANGSTROM = 12398.4193; // eV * Å
const AVOGADRO = 6.02214076e23;
const ENERGY_MIN_EV = 30;
const ENERGY_MAX_EV = 30000;
const ENERGY_POINT_COUNT = 2000;

export type AbsorptionPoint = {
  energyEv: number;
  mu: number;
};

type ElementF2Dataset = {
  element: string;
  energies: number[];
  f2: number[];
};

const elementDatasetCache = new Map<string, ElementF2Dataset>();

async function fetchElementF2Data(element: string): Promise<ElementF2Dataset> {
  const cached = elementDatasetCache.get(element);
  if (cached) {
    return cached;
  }

  const url = `${CXRO_BASE_URL}/${element.toLowerCase()}.nff`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch CXRO data for ${element}: ${response.statusText}`,
    );
  }

  const text = await response.text();
  const energies: number[] = [];
  const f2Values: number[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const [energyToken, , f2Token] = line.split(/\s+/);
    if (!energyToken || !f2Token) {
      continue;
    }

    const energy = Number.parseFloat(energyToken);
    const f2 = Number.parseFloat(f2Token);

    if (!Number.isFinite(energy) || !Number.isFinite(f2)) {
      continue;
    }

    energies.push(energy);
    f2Values.push(f2);
  }

  if (energies.length === 0) {
    throw new Error(`No CXRO data parsed for element ${element}.`);
  }

  const dataset: ElementF2Dataset = {
    element,
    energies,
    f2: f2Values,
  };

  elementDatasetCache.set(element, dataset);
  return dataset;
}

function computeMuOverRhoForElement(
  energyEv: number,
  f2: number,
  atomicWeight: number,
): number {
  const wavelengthAngstrom = PLANCK_CONSTANT_TIMES_C_EV_ANGSTROM / energyEv;
  const wavelengthCm = wavelengthAngstrom * 1e-8;
  const muOverRho =
    (2 * AVOGADRO * ELECTRON_RADIUS_CM * wavelengthCm * f2) / atomicWeight;
  return muOverRho;
}

function createEnergyGrid(
  minEv: number = ENERGY_MIN_EV,
  maxEv: number = ENERGY_MAX_EV,
): number[] {
  const energies: number[] = [];
  const logMin = Math.log10(minEv);
  const logMax = Math.log10(maxEv);
  const step = (logMax - logMin) / (ENERGY_POINT_COUNT - 1);
  for (let index = 0; index < ENERGY_POINT_COUNT; index += 1) {
    energies.push(10 ** (logMin + step * index));
  }
  return energies;
}

function interpolateF2(
  energies: number[],
  dataset: ElementF2Dataset,
): number[] {
  const interpolated: number[] = [];
  let datasetIndex = 0;
  const energyData = dataset.energies;
  const f2Data = dataset.f2;
  const lastIndex = Math.max(energyData.length - 1, 0);

  for (const energy of energies) {
    while (datasetIndex < lastIndex) {
      const lookaheadIndex = Math.min(datasetIndex + 1, lastIndex);
      const nextEnergy = energyData[lookaheadIndex];
      if (nextEnergy === undefined || nextEnergy >= energy) {
        break;
      }
      datasetIndex += 1;
    }

    const safeIndex = Math.min(Math.max(datasetIndex, 0), lastIndex);
    const nextIndex = Math.min(safeIndex + 1, lastIndex);
    const x0 = energyData[safeIndex]!;
    const x1 = energyData[nextIndex]!;
    const y0 = f2Data[safeIndex]!;
    const y1 = f2Data[nextIndex]!;

    if (!Number.isFinite(x0) || !Number.isFinite(y0)) {
      interpolated.push(0);
      continue;
    }

    if (!Number.isFinite(x1) || !Number.isFinite(y1) || x1 === x0) {
      interpolated.push(y0);
      continue;
    }

    if (energy <= x0) {
      interpolated.push(y0);
    } else if (energy >= x1) {
      interpolated.push(y1);
    } else {
      const t = (energy - x0) / (x1 - x0);
      interpolated.push(y0 + t * (y1 - y0));
    }
  }

  return interpolated;
}

export async function computeBareAtomAbsorption(
  chemicalFormula: string,
  options: {
    density?: number;
    energyMinEv?: number;
    energyMaxEv?: number;
  } = {},
): Promise<AbsorptionPoint[]> {
  const { density = 1, energyMinEv, energyMaxEv } = options;

  const elementCounts = parseChemicalFormula(chemicalFormula);
  const molecularWeight = computeMolecularWeight(elementCounts);

  const energyGrid = createEnergyGrid(energyMinEv, energyMaxEv);

  const elementEntries = await Promise.all(
    Object.entries(elementCounts).map(async ([element, count]) => {
      const dataset = await fetchElementF2Data(element);
      const atomicWeight = getAtomicWeight(element);
      const massFraction = (count * atomicWeight) / molecularWeight;

      const interpolatedF2 = interpolateF2(energyGrid, dataset);
      return {
        massFraction,
        atomicWeight,
        f2: interpolatedF2,
      };
    }),
  );

  const absorptionPoints: AbsorptionPoint[] = energyGrid.map(
    (energyEv, idx) => {
      let muOverRhoTotal = 0;
      elementEntries.forEach(({ massFraction, atomicWeight, f2 }) => {
        const fallback = f2.length > 0 ? f2[f2.length - 1]! : 0;
        const f2Value = f2[idx] ?? fallback;
        const muOverRho = computeMuOverRhoForElement(
          energyEv,
          f2Value,
          atomicWeight,
        );
        muOverRhoTotal += muOverRho * massFraction;
      });
      return { energyEv, mu: muOverRhoTotal * density };
    },
  );

  return absorptionPoints;
}
