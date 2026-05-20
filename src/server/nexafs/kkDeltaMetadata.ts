import type { Prisma } from "~/prisma/client";

/** Lineage label for the in-app kkcalc-style TypeScript KK engine. */
export const KK_DELTA_ENGINE_LABEL = "kkcalc-style-ts-v1";

/**
 * Describes how persisted `spectrumpoints.delta` values were produced for an experiment.
 * Stored on `experiments.kk_delta_metadata` (JSON); not a substitute for per-point provenance.
 */
export type KkDeltaSource =
  | "uploaded_column"
  | "kk_at_upload"
  | "kk_browser_recalculate";

export type KkDeltaMetadata = {
  source: KkDeltaSource;
  /** ISO-8601 UTC timestamp when `delta` was last written for this experiment. */
  calculatedAt: string;
  /** User id that triggered the last persist, when authenticated. */
  calculatedByUserId: string | null;
  engineLabel: string;
  /**
   * Reader-facing note: recalculated delta overwrites prior column values; browser recalc may
   * update only the loaded point subset when row counts exceed the client fetch cap.
   */
  note: string;
};

const KK_DELTA_METADATA_NOTE: Record<KkDeltaSource, string> = {
  uploaded_column:
    "Delta was supplied from an uploaded column at ingest and was not recomputed by Atlas unless a later KK action overwrote it.",
  kk_at_upload:
    "Delta was computed in the contributor browser from beta at upload (kkcalc-style) and stored on spectrumpoints.",
  kk_browser_recalculate:
    "Delta on spectrumpoints was recalculated in the browser from stored beta (kkcalc-style) and overwrote prior delta values for the persisted point ids in that batch; large experiments may update only the loaded subset per recalc.",
};

/**
 * Derives ingest-time `KkDeltaSource` from persisted spectrum shape and contributor KK intent.
 * Ignores any client-supplied source enum; callers pass only `computeKkDeltaOnSubmit`.
 */
export function deriveKkDeltaSourceOnCreate(args: {
  spectrumHasFiniteDelta: boolean;
  computeKkDeltaOnSubmit: boolean | undefined;
}): KkDeltaSource | null {
  if (!args.spectrumHasFiniteDelta) {
    return null;
  }
  if (args.computeKkDeltaOnSubmit === true) {
    return "kk_at_upload";
  }
  return "uploaded_column";
}

/**
 * Builds metadata to persist after delta is written on an experiment.
 */
export function buildKkDeltaMetadata(args: {
  source: KkDeltaSource;
  calculatedAt?: Date;
  calculatedByUserId: string | null;
  engineLabel?: string;
}): KkDeltaMetadata {
  const at = args.calculatedAt ?? new Date();
  return {
    source: args.source,
    calculatedAt: at.toISOString(),
    calculatedByUserId: args.calculatedByUserId,
    engineLabel: args.engineLabel ?? KK_DELTA_ENGINE_LABEL,
    note: KK_DELTA_METADATA_NOTE[args.source],
  };
}

/**
 * Parses stored experiment JSON into {@link KkDeltaMetadata}, or null when missing or invalid.
 */
export function parseKkDeltaMetadata(raw: unknown): KkDeltaMetadata | null {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const source = row.source;
  if (
    source !== "uploaded_column" &&
    source !== "kk_at_upload" &&
    source !== "kk_browser_recalculate"
  ) {
    return null;
  }
  const calculatedAt = row.calculatedAt;
  if (typeof calculatedAt !== "string" || calculatedAt.length === 0) {
    return null;
  }
  const engineLabel = row.engineLabel;
  const note = row.note;
  return {
    source,
    calculatedAt,
    calculatedByUserId:
      typeof row.calculatedByUserId === "string" ? row.calculatedByUserId : null,
    engineLabel:
      typeof engineLabel === "string" && engineLabel.length > 0
        ? engineLabel
        : KK_DELTA_ENGINE_LABEL,
    note:
      typeof note === "string" && note.length > 0
        ? note
        : KK_DELTA_METADATA_NOTE[source],
  };
}

/** Serializes metadata for Prisma `Json` columns on `experiments`. */
export function kkDeltaMetadataToJson(
  metadata: KkDeltaMetadata,
): Prisma.InputJsonValue {
  return metadata as unknown as Prisma.InputJsonValue;
}
