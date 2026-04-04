/**
 * Shared URL parsers and labels for NEXAFS experiment browse (global catalog and
 * molecule-scoped views). Keeps sort and experiment-type handling aligned with
 * `experiments.browseList` / `browseSearch` Zod inputs.
 */

import { ExperimentType } from "~/prisma/browser";

export const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  TOTAL_ELECTRON_YIELD: "Total electron yield",
  PARTIAL_ELECTRON_YIELD: "Partial electron yield",
  FLUORESCENT_YIELD: "Fluorescence yield",
  TRANSMISSION: "Transmission",
};

export const SORT_OPTIONS: {
  key: "engagement" | "newest" | "molecule" | "edge" | "instrument";
  label: string;
}[] = [
  { key: "engagement", label: "Configurations & engagement" },
  { key: "newest", label: "Newest" },
  { key: "molecule", label: "Molecule name" },
  { key: "edge", label: "Edge (atom)" },
  { key: "instrument", label: "Instrument" },
];

export type NexafsBrowseSortKey =
  (typeof SORT_OPTIONS)[number]["key"];

export function formatExperimentType(
  value: ExperimentType | null | undefined,
): string | null {
  if (!value) return null;
  return EXPERIMENT_TYPE_LABELS[value] ?? null;
}

export function parseSortParam(raw: string | null): NexafsBrowseSortKey {
  if (raw === "measurement" || raw === "upload") return "newest";
  if (
    raw === "engagement" ||
    raw === "newest" ||
    raw === "molecule" ||
    raw === "edge" ||
    raw === "instrument"
  ) {
    return raw;
  }
  return "engagement";
}

export function parseExperimentTypeParam(
  raw: string | null,
): ExperimentType | undefined {
  if (!raw) return undefined;
  const values = Object.values(ExperimentType) as string[];
  return values.includes(raw) ? (raw as ExperimentType) : undefined;
}
