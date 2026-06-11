const SUBSCRIPTS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"] as const;

const SUBSCRIPT_TO_ASCII_DIGIT: Record<string, string> = Object.fromEntries(
  SUBSCRIPTS.map((s, i) => [s, String(i)]),
);

function digitCharToSubscript(ch: string): string {
  if (ch.length !== 1) return ch;
  const code = ch.charCodeAt(0);
  if (code < 48 || code > 57) return ch;
  return SUBSCRIPTS[code - 48]!;
}

export function formatAlkylCnH2nPlus1(nCarbons: number): string {
  const h = 2 * nCarbons + 1;
  const nc = String(nCarbons);
  const nh = String(h);
  return `C${[...nc].map(digitCharToSubscript).join("")}H${[...nh].map(digitCharToSubscript).join("")}`;
}

export function normalizeNumericSubscriptsToAscii(text: string): string {
  return text.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => SUBSCRIPT_TO_ASCII_DIGIT[ch] ?? ch);
}

export function formatChHydrideLabel(implicitHydrogenCount: number): string {
  if (implicitHydrogenCount < 1) {
    return "C";
  }
  const s = String(implicitHydrogenCount)
    .split("")
    .map((d) => digitCharToSubscript(d))
    .join("");
  return `CH${s}`;
}
