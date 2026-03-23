import type { SpectrumYAxisQuantity } from "../types";

function toUnicodeSuperscriptInt(n: number): string {
  const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  let s = "";
  for (const ch of String(Math.abs(Math.trunc(n)))) {
    s += digits[parseInt(ch, 10)] ?? ch;
  }
  return n < 0 ? `⁻${s}` : s;
}

function trimNumericString(x: number, maxSig: number): string {
  if (!Number.isFinite(x)) return "";
  const ax = Math.abs(x);
  if (ax === 0) return "0";
  if (ax >= 1e5 || ax < 1e-4) return x.toExponential(2);
  const s = x.toPrecision(maxSig);
  if (s.includes("e") || s.includes("E")) return s;
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function yScaleExponentFromDomain(
  minY: number,
  maxY: number,
  opts?: { suppressBand?: [number, number] },
): number {
  const top = Math.max(Math.abs(minY), Math.abs(maxY));
  if (!Number.isFinite(top) || top === 0) return 0;
  const lg = Math.log10(top);
  const band = opts?.suppressBand ?? [-0.4, 2.6];
  if (lg >= band[0] && lg <= band[1]) return 0;
  return Math.floor(lg);
}

export function formatYTickScaled(value: number, exp: number): string {
  if (exp === 0) return trimNumericString(value, 4);
  return trimNumericString(value / 10 ** exp, 4);
}

export function spectrumYAxisPresentation(
  quantity: SpectrumYAxisQuantity,
  minY: number,
  maxY: number,
): { label: string; tickFormat: (v: number) => string } {
  const exp =
    quantity === "optical-density"
      ? 0
      : yScaleExponentFromDomain(minY, maxY);
  const mult = exp === 0 ? "" : ` x 10${toUnicodeSuperscriptInt(exp)}`;
  const tickFormat = (v: number) => formatYTickScaled(v, exp);
  if (quantity === "optical-density") {
    return { label: "Optical density", tickFormat };
  }
  if (quantity === "mass-absorption") {
    return {
      label: `Mass absorption (g/cm^2)${mult}`,
      tickFormat,
    };
  }
  if (quantity === "beta") {
    return {
      label: `β (abs. units)${mult}`,
      tickFormat,
    };
  }
  return {
    label: `Intensity (a.u.)${mult}`,
    tickFormat,
  };
}
