const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.00794,
  He: 4.002602,
  Li: 6.941,
  Be: 9.012182,
  B: 10.811,
  C: 12.0107,
  N: 14.0067,
  O: 15.9994,
  F: 18.9984032,
  Ne: 20.1797,
  Na: 22.98976928,
  Mg: 24.305,
  Al: 26.9815386,
  Si: 28.0855,
  P: 30.973762,
  S: 32.065,
  Cl: 35.453,
  Ar: 39.948,
  K: 39.0983,
  Ca: 40.078,
  Sc: 44.955912,
  Ti: 47.867,
  V: 50.9415,
  Cr: 51.9961,
  Mn: 54.938045,
  Fe: 55.845,
  Co: 58.933195,
  Ni: 58.6934,
  Cu: 63.546,
  Zn: 65.409,
  Ga: 69.723,
  Ge: 72.64,
  As: 74.9216,
  Se: 78.96,
  Br: 79.904,
  Kr: 83.798,
  Rb: 85.4678,
  Sr: 87.62,
  Y: 88.90585,
  Zr: 91.224,
  Nb: 92.90638,
  Mo: 95.96,
  Tc: 98,
  Ru: 101.07,
  Rh: 102.9055,
  Pd: 106.42,
  Ag: 107.8682,
  Cd: 112.411,
  In: 114.818,
  Sn: 118.71,
  Sb: 121.76,
  Te: 127.6,
  I: 126.90447,
  Xe: 131.293,
  Cs: 132.9054519,
  Ba: 137.327,
  La: 138.90547,
  Ce: 140.116,
  Pr: 140.90765,
  Nd: 144.242,
  Pm: 145,
  Sm: 150.36,
  Eu: 151.964,
  Gd: 157.25,
  Tb: 158.92535,
  Dy: 162.5,
  Ho: 164.93032,
  Er: 167.259,
  Tm: 168.93421,
  Yb: 173.04,
  Lu: 174.967,
  Hf: 178.49,
  Ta: 180.94788,
  W: 183.84,
  Re: 186.207,
  Os: 190.23,
  Ir: 192.217,
  Pt: 195.084,
  Au: 196.966569,
  Hg: 200.59,
  Tl: 204.3833,
  Pb: 207.2,
  Bi: 208.9804,
  Po: 209,
  At: 210,
  Rn: 222,
  Fr: 223,
  Ra: 226,
  Ac: 227,
  Th: 232.03806,
  Pa: 231.03588,
  U: 238.02891,
  Np: 237,
  Pu: 244,
  Am: 243,
  Cm: 247,
  Bk: 247,
  Cf: 251,
  Es: 252,
  Fm: 257,
  Md: 258,
  No: 259,
  Lr: 266,
  Rf: 267,
  Db: 268,
  Sg: 269,
  Bh: 270,
  Hs: 270,
  Mt: 278,
  Ds: 281,
  Rg: 282,
  Cn: 285,
  Nh: 286,
  Fl: 289,
  Mc: 290,
  Lv: 293,
  Ts: 294,
  Og: 294,
};

export type ElementCountMap = Record<string, number>;

export function parseChemicalFormula(formula: string): ElementCountMap {
  if (!formula || typeof formula !== "string") {
    throw new Error("Chemical formula must be a non-empty string.");
  }

  let index = 0;

  const parseGroup = (): Map<string, number> => {
    const counts = new Map<string, number>();

    while (index < formula.length) {
      const char = formula[index];

      if (char === "(") {
        index += 1;
        const innerCounts = parseGroup();
        if (formula[index] !== ")") {
          throw new Error("Unmatched parenthesis in chemical formula.");
        }
        index += 1;
        const multiplier = parseNumber();
        multiplyAndMerge(counts, innerCounts, multiplier);
      } else if (char === ")") {
        break;
      } else if (char && /[A-Z]/.test(char)) {
        const element = parseElement();
        const count = parseNumber();
        const prev = counts.get(element) ?? 0;
        counts.set(element, prev + count);
      } else if (char === "." || char === "·") {
        index += 1;
      } else {
        throw new Error(`Unexpected character '${char}' in chemical formula.`);
      }
    }

    return counts;
  };

  const parseElement = (): string => {
    const start = index;
    index += 1; // consume uppercase letter
    while (index < formula.length) {
      const char = formula[index];
      if (!char || !/[a-z]/.test(char)) break;
      index += 1;
    }
    const symbol = formula.slice(start, index);
    if (!ATOMIC_WEIGHTS[symbol]) {
      throw new Error(`Unknown element symbol '${symbol}' in chemical formula.`);
    }
    return symbol;
  };

  const parseNumber = (): number => {
    const start = index;
    while (index < formula.length) {
      const char = formula[index];
      if (!char || !/[0-9]/.test(char)) break;
      index += 1;
    }
    if (start === index) {
      return 1;
    }
    return Number.parseInt(formula.slice(start, index), 10);
  };

  const multiplyAndMerge = (
    target: Map<string, number>,
    source: Map<string, number>,
    multiplier: number,
  ) => {
    source.forEach((value, key) => {
      const prev = target.get(key) ?? 0;
      target.set(key, prev + value * multiplier);
    });
  };

  const topLevelCounts = parseGroup();

  if (index < formula.length && formula[index] === ")") {
    throw new Error("Unmatched parenthesis in chemical formula.");
  }

  if (topLevelCounts.size === 0) {
    throw new Error("Unable to parse chemical formula.");
  }

  return Object.fromEntries(topLevelCounts.entries());
}

export function getAtomicWeight(element: string): number {
  const weight = ATOMIC_WEIGHTS[element];
  if (!weight) {
    throw new Error(`Atomic weight not found for element '${element}'.`);
  }
  return weight;
}

export function computeMolecularWeight(counts: ElementCountMap): number {
  return Object.entries(counts).reduce((sum, [element, count]) => {
    return sum + getAtomicWeight(element) * count;
  }, 0);
}
