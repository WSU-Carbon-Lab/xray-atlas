export const NEXAFS_PEAK_KIND_OPTIONS = [
  {
    id: "pi-star",
    label: "\u03c0* antibonding resonance",
    shortLabel: "pi*",
    unicodeShort: "\u03c0*",
  },
  {
    id: "sigma-star",
    label: "\u03c3* antibonding resonance",
    shortLabel: "sigma*",
    unicodeShort: "\u03c3*",
  },
] as const;

const LEGACY_KIND_DISPLAY: Record<string, string> = {
  rydberg: "Ry",
  "shake-up": "sh-up",
  "shake-off": "sh-off",
  multielectron: "multi-e",
  quadrupole: "quad",
  other: "\u2014",
};

export type NexafsPeakKindId = (typeof NEXAFS_PEAK_KIND_OPTIONS)[number]["id"];

export function labelForPeakKind(kind: string | null | undefined): string {
  if (kind == null || kind === "") return "";
  const row = NEXAFS_PEAK_KIND_OPTIONS.find((o) => o.id === kind);
  if (row) return row.label;
  return LEGACY_KIND_DISPLAY[kind] ?? kind;
}

export function shortLabelForPeakKind(kind: string | null | undefined): string {
  if (kind == null || kind === "") return "";
  const row = NEXAFS_PEAK_KIND_OPTIONS.find((o) => o.id === kind);
  if (row) return row.shortLabel;
  return LEGACY_KIND_DISPLAY[kind] ?? kind;
}

export function unicodeShortLabelForPeakKind(
  kind: string | null | undefined,
): string {
  if (kind == null || kind === "") return "\u2014";
  const row = NEXAFS_PEAK_KIND_OPTIONS.find((o) => o.id === kind);
  if (row) return row.unicodeShort;
  return LEGACY_KIND_DISPLAY[kind] ?? kind;
}
