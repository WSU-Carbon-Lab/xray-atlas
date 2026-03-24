export function normalizeSampleSubstrate(value: string | null | undefined): string | null {
  const trimmed = (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower === "si" ||
    lower === "si wafer" ||
    lower === "silicon wafer" ||
    lower === "si-wafer" ||
    lower === "si wafer substrate" ||
    lower === "silicon"
  ) {
    return "Si";
  }
  return trimmed;
}
