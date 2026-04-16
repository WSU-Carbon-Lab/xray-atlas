import { ExperimentType } from "~/prisma/browser";

export const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  TOTAL_ELECTRON_YIELD: "Total electron yield",
  PARTIAL_ELECTRON_YIELD: "Partial electron yield",
  FLUORESCENT_YIELD: "Fluorescence yield",
  TRANSMISSION: "Transmission",
};

export const NEXAFS_SORT_OPTION_KEYS = [
  "favorites",
  "views",
  "geometries",
  "comments",
  "name",
  "newest",
] as const;

export type NexafsBrowseSortKey = (typeof NEXAFS_SORT_OPTION_KEYS)[number];

export const NEXAFS_SORT_LABELS: Record<NexafsBrowseSortKey, string> = {
  favorites: "Most Favorited (molecule)",
  views: "Most Viewed (molecule)",
  geometries: "Most Geometries",
  comments: "Most Comments",
  name: "Name (A-Z)",
  newest: "Newest First",
};

export function formatExperimentType(
  value: ExperimentType | null | undefined,
): string | null {
  if (!value) return null;
  return EXPERIMENT_TYPE_LABELS[value] ?? null;
}

export function parseSortParam(raw: string | null): NexafsBrowseSortKey {
  if (
    raw === "favorites" ||
    raw === "views" ||
    raw === "geometries" ||
    raw === "comments" ||
    raw === "name" ||
    raw === "newest"
  ) {
    return raw;
  }
  if (raw === "engagement") return "favorites";
  if (raw === "molecule") return "name";
  if (raw === "edge" || raw === "instrument") return "name";
  if (raw === "measurement" || raw === "upload") return "newest";
  return "favorites";
}

export function parseExperimentTypeParam(
  raw: string | null,
): ExperimentType | undefined {
  if (!raw) return undefined;
  const values = Object.values(ExperimentType) as string[];
  return values.includes(raw) ? (raw as ExperimentType) : undefined;
}
