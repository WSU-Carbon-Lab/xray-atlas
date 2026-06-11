import { Molecule } from "openchemlib";

/**
 * Tabulated Buckminster fullerene SMILES keyed by carbon count.
 * SMILES are canonical Kekule forms verified against OpenChemLib parsing and
 * heavy-atom counts; arbitrary even N cannot be closed-formed as a fullerene.
 */
const FULLERENE_SMILES_BY_CARBON_COUNT: Readonly<
  Record<number, { smiles: string; label: string }>
> = {
  60: {
    smiles:
      "C12=C3C4=C5C6=C1C7=C8C9=C1C%10=C%11C(=C29)C3=C2C3=C4C4=C5C5=C9C6=C7C6=C7C8=C1C1=C8C%10=C%10C%11=C2C2=C3C3=C4C4=C5C5=C%11C%12=C(C6=C95)C7=C1C1=C%12C5=C%11C4=C3C3=C5C(=C81)C%10=C23",
    label: "C60",
  },
  70: {
    smiles:
      "C12=C3C4=C5C6=C7C8=C9C%10=C%11C%12=C%13C%10=C%10C8=C5C1=C%10C1=C%13C5=C8C1=C2C1=C3C2=C3C%10=C%13C%14=C3C1=C8C1=C3C5=C%12C5=C8C%11=C%11C9=C7C7=C9C6=C4C2=C2C%10=C4C(=C29)C2=C6C(=C8C8=C9C6=C4C%13=C9C(=C%141)C3=C85)C%11=C27",
    label: "C70",
  },
};

/**
 * Carbon counts with tabulated fullerene SMILES accepted by OpenChemLib placement.
 * Only C60 and C70 are supported; other even counts require explicit tabulation.
 */
export const SUPPORTED_CAGE_CARBON_COUNTS: readonly number[] = Object.keys(
  FULLERENE_SMILES_BY_CARBON_COUNT,
)
  .map((key) => Number.parseInt(key, 10))
  .sort((a, b) => a - b);

/** Successful {@link cageSmilesForCarbonCount} lookup. */
export interface CageSmilesSuccess {
  ok: true;
  /** Heavy-atom carbon count for the fullerene cage. */
  carbonCount: number;
  /** OpenChemLib-parseable SMILES for placement on the draw canvas. */
  smiles: string;
  /** Reader-facing fullerene label (for example C60, C70). */
  label: string;
}

/** Failed {@link cageSmilesForCarbonCount} lookup. */
export interface CageSmilesFailure {
  ok: false;
  /** Inline validation message for the fullerene carbon input. */
  error: string;
}

/** Result of {@link cageSmilesForCarbonCount}. */
export type CageSmilesResult = CageSmilesSuccess | CageSmilesFailure;

/**
 * Parses a positive integer carbon count from raw fullerene-template menu input.
 *
 * @param input - Text from the fullerene N carbons field.
 * @returns Carbon count when the field holds a positive integer; null otherwise.
 */
export function parseCageCarbonCountFromInput(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/u.test(trimmed)) {
    return null;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}

/**
 * Resolves a tabulated Buckminster fullerene SMILES for a supported carbon count.
 * Rejects macrocycle sizes and unsupported N with a message listing valid counts.
 *
 * @param carbonCount - Requested number of fullerene carbon atoms.
 * @returns Success with SMILES and label, or failure with an inline error string.
 */
export function cageSmilesForCarbonCount(carbonCount: number): CageSmilesResult {
  if (!Number.isInteger(carbonCount) || carbonCount < 1) {
    return { ok: false, error: "Enter a whole number of carbons." };
  }

  const entry = FULLERENE_SMILES_BY_CARBON_COUNT[carbonCount];
  if (entry === undefined) {
    return {
      ok: false,
      error: `No fullerene template for ${carbonCount} carbons. Supported: ${SUPPORTED_CAGE_CARBON_COUNTS.join(", ")}.`,
    };
  }

  try {
    const mol = Molecule.fromSmiles(entry.smiles);
    let heavyCarbons = 0;
    for (let i = 0; i < mol.getAllAtoms(); i++) {
      if (mol.getAtomicNo(i) === 6) {
        heavyCarbons += 1;
      }
    }
    if (heavyCarbons !== carbonCount) {
      return {
        ok: false,
        error: `Fullerene SMILES for ${carbonCount} carbons failed validation.`,
      };
    }
  } catch {
    return {
      ok: false,
      error: `Fullerene SMILES for ${carbonCount} carbons could not be parsed.`,
    };
  }

  return {
    ok: true,
    carbonCount,
    smiles: entry.smiles,
    label: entry.label,
  };
}
