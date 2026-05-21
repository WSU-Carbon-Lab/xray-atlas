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

type YAxisPresentationMeta = {
  name: string;
  unit: string;
  flatScale?: boolean;
  /**
   * Subtract from raw plotted y before tick labels and scale exponent; plot data
   * and inspect pins stay on the raw quantity (e.g. Re(ε) near 1).
   */
  displayOffset?: number;
};

const Y_AXIS_PRESENTATION: Record<SpectrumYAxisQuantity, YAxisPresentationMeta> =
  {
  "optical-density": { name: "Optical density", unit: "", flatScale: true },
  "mass-absorption": {
    name: "Mass absorption",
    unit: "g/cm²",
  },
  beta: { name: "β", unit: "" },
  delta: { name: "δ", unit: "" },
  intensity: { name: "Raw signal", unit: "a.u." },
  "raw-upload": { name: "Raw upload", unit: "a.u." },
  "scattering-f2": { name: "f₂", unit: "e⁻/atom" },
  "scattering-f1": { name: "f₁", unit: "e⁻/atom" },
  "permittivity-im": { name: "Im(ε)", unit: "" },
  "permittivity-re": { name: "Re(ε) − 1", unit: "", displayOffset: 1 },
  "susceptibility-im": { name: "Im(χ)", unit: "" },
  "susceptibility-re": { name: "Re(χ)", unit: "" },
};

/**
 * Builds the y-axis title and tick formatter for a spectrum quantity and visible y extent.
 *
 * Plot geometry uses raw stored values. When `displayOffset` is set (Re(ε) uses 1),
 * tick labels show `value - displayOffset` and the scale exponent is derived from
 * that shifted range so small deviations from unity read like Re(χ). Inspect pins and
 * CSV export still report raw Re(ε).
 */
export function spectrumYAxisPresentation(
  quantity: SpectrumYAxisQuantity,
  minY: number,
  maxY: number,
): { label: string; tickFormat: (v: number) => string } {
  const meta = Y_AXIS_PRESENTATION[quantity];
  const displayOffset = meta.displayOffset ?? 0;
  const minDisplay = minY - displayOffset;
  const maxDisplay = maxY - displayOffset;
  const exp = meta.flatScale
    ? 0
    : yScaleExponentFromDomain(minDisplay, maxDisplay);
  const mult = exp === 0 ? "" : ` × 10${toUnicodeSuperscriptInt(exp)}`;
  const unitSuffix = meta.unit ? ` (${meta.unit})` : "";
  const tickFormat = (v: number) =>
    formatYTickScaled(v - displayOffset, exp);
  return {
    label: `${meta.name}${unitSuffix}${mult}`,
    tickFormat,
  };
}
