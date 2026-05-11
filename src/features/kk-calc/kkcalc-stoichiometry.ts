/**
 * Minimal Hill-style chemical formula parsing and composition-derived scalars
 * matching kkcalc2 `stoich.stoichiometry` for formulas without periodictable:
 * {@link parseChemicalFormula}, {@link formulaMassFromComposition},
 * {@link relativisticCorrectionFromComposition}.
 */
import { ATOMIC_MASS_G_PER_MOL_BY_Z } from "./kkcalc-element-masses";

export interface StoichiometryTerm {
  readonly atomicNumber: number;
  readonly count: number;
}

const ELEMENT_SYMBOL_TO_Z: Readonly<Record<string, number>> = {
  H: 1,
  He: 2,
  Li: 3,
  Be: 4,
  B: 5,
  C: 6,
  N: 7,
  O: 8,
  F: 9,
  Ne: 10,
  Na: 11,
  Mg: 12,
  Al: 13,
  Si: 14,
  P: 15,
  S: 16,
  Cl: 17,
  Ar: 18,
  K: 19,
  Ca: 20,
  Sc: 21,
  Ti: 22,
  V: 23,
  Cr: 24,
  Mn: 25,
  Fe: 26,
  Co: 27,
  Ni: 28,
  Cu: 29,
  Zn: 30,
  Ga: 31,
  Ge: 32,
  As: 33,
  Se: 34,
  Br: 35,
  Kr: 36,
  Rb: 37,
  Sr: 38,
  Y: 39,
  Zr: 40,
  Nb: 41,
  Mo: 42,
  Tc: 43,
  Ru: 44,
  Rh: 45,
  Pd: 46,
  Ag: 47,
  Cd: 48,
  In: 49,
  Sn: 50,
  Sb: 51,
  Te: 52,
  I: 53,
  Xe: 54,
  Cs: 55,
  Ba: 56,
  La: 57,
  Ce: 58,
  Pr: 59,
  Nd: 60,
  Pm: 61,
  Sm: 62,
  Eu: 63,
  Gd: 64,
  Tb: 65,
  Dy: 66,
  Ho: 67,
  Er: 68,
  Tm: 69,
  Yb: 70,
  Lu: 71,
  Hf: 72,
  Ta: 73,
  W: 74,
  Re: 75,
  Os: 76,
  Ir: 77,
  Pt: 78,
  Au: 79,
  Hg: 80,
  Tl: 81,
  Pb: 82,
  Bi: 83,
  Po: 84,
  At: 85,
  Rn: 86,
  Fr: 87,
  Ra: 88,
  Ac: 89,
  Th: 90,
  Pa: 91,
  U: 92,
};

const ATOMIC_NUMBER_TO_SYMBOL: Readonly<Record<number, string>> = (() => {
  const m: Record<number, string> = {};
  for (const [sym, z] of Object.entries(ELEMENT_SYMBOL_TO_Z)) {
    m[z] = sym;
  }
  return m;
})();

/**
 * Returns the Hill-style element symbol for an atomic number supported by kkcalc-style parsing.
 *
 * @param atomicNumber Atomic number `Z` in `1..92`.
 * @throws RangeError When `atomicNumber` is outside the supported range or has no symbol mapping.
 */
export function elementSymbolFromAtomicNumber(atomicNumber: number): string {
  const sym = ATOMIC_NUMBER_TO_SYMBOL[atomicNumber];
  if (sym == null) {
    throw new RangeError(`No element symbol mapping for Z=${atomicNumber}`);
  }
  return sym;
}

function elementSymbolToZ(symbol: string): number {
  const z = ELEMENT_SYMBOL_TO_Z[symbol];
  if (z == null || z < 1 || z > 92) {
    throw new RangeError(`Unknown or unsupported element symbol: ${symbol}`);
  }
  return z;
}

function consolidateComposition(
  terms: readonly StoichiometryTerm[],
): StoichiometryTerm[] {
  const map = new Map<number, number>();
  for (const t of terms) {
    map.set(t.atomicNumber, (map.get(t.atomicNumber) ?? 0) + t.count);
  }
  return [...map.entries()]
    .map(([atomicNumber, count]) => ({ atomicNumber, count }))
    .sort((a, b) => a.atomicNumber - b.atomicNumber);
}

/**
 * Parses a kkcalc2-style chemical formula string into consolidated `(Z, count)` terms.
 *
 * @param formula Hill or parenthesised formula (same subset as kkcalc2 `_parse_chemical_formula`).
 * @throws RangeError When an element symbol is unknown or atomic number is out of range.
 */
export function parseChemicalFormula(formula: string): StoichiometryTerm[] {
  const trimmed = formula.trim();
  if (trimmed.length === 0) {
    throw new RangeError("Stoichiometry formula must be a non-empty string");
  }
  return consolidateComposition(parseChemicalFormulaInner(trimmed));
}

const FORMULA_HEAD = /^([A-Z][a-z]?|\(([^)]+)\))(\d*(\.\d+)?)(.*)$/;

function parseChemicalFormulaInner(remainder: string): StoichiometryTerm[] {
  if (remainder.length === 0) {
    return [];
  }
  const m = FORMULA_HEAD.exec(remainder);
  if (!m) {
    throw new RangeError(`No formula match at: ${remainder}`);
  }
  const elem = m[1];
  const paren = m[2];
  const numStr = m[3] ?? "";
  const rest = m[5] ?? "";
  const count = numStr.length > 0 ? Number(numStr) : 1;
  if (!Number.isFinite(count) || count <= 0) {
    throw new RangeError(`Invalid stoichiometric count in formula: ${remainder}`);
  }
  let head: StoichiometryTerm[] = [];
  if (paren == null || paren.length === 0) {
    const z = elementSymbolToZ(elem!);
    head = [{ atomicNumber: z, count }];
  } else {
    const inner = parseChemicalFormulaInner(paren);
    head = inner.map((t) => ({
      atomicNumber: t.atomicNumber,
      count: t.count * count,
    }));
  }
  return [...head, ...parseChemicalFormulaInner(rest)];
}

/**
 * Computes formula mass in g/mol from consolidated composition using kkcalc2 ASF-database masses.
 */
export function formulaMassFromComposition(
  composition: readonly StoichiometryTerm[],
): number {
  let sum = 0;
  for (const { atomicNumber, count } of composition) {
    const mass = ATOMIC_MASS_G_PER_MOL_BY_Z[atomicNumber];
    if (mass == null) {
      throw new RangeError(`Missing atomic mass for Z=${atomicNumber}`);
    }
    sum += mass * count;
  }
  return sum;
}

/**
 * kkcalc2 `relativistic_correction_eq`: sum_i (Z_i - (Z_i/82.5)^2.37) * n_i.
 */
export function relativisticCorrectionFromComposition(
  composition: readonly StoichiometryTerm[],
): number {
  let s = 0;
  for (const { atomicNumber: z, count: n } of composition) {
    s += (z - (z / 82.5) ** 2.37) * n;
  }
  return s;
}
