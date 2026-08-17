import type {
  NormalizationRanges,
  PerChannelNormalizationRanges,
  UnifiedNormalizationRanges,
} from "~/features/process-nexafs/types";
import { parseNormalizationBandMode } from "~/lib/nexafs/normalization-band-mode";

export type NormalizationBasisForKk =
  | "optical-density"
  | "mass-absorption"
  | "beta";

/**
 * Maps browse `dataView` to the normalization channel whose pre/post windows should anchor KK Henke
 * merge domains (`delta` follows `beta` because KK runs on optical beta).
 */
export function nexafsBrowseDataViewToKkNormalizationBasis(
  dataView: "od" | "absorption" | "beta" | "delta",
): NormalizationBasisForKk {
  if (dataView === "od") {
    return "optical-density";
  }
  if (dataView === "beta" || dataView === "delta") {
    return "beta";
  }
  return "mass-absorption";
}

function withParsedBandMode(
  unified: UnifiedNormalizationRanges,
): UnifiedNormalizationRanges {
  return {
    pre: unified.pre ?? null,
    post: unified.post ?? null,
    bandMode: parseNormalizationBandMode(unified.bandMode),
  };
}

/**
 * Parses persisted `experiments.normalizationranges` JSON into a typed shape, accepting unified
 * `{ pre, post }` objects or per-channel `{ od, massabsorption, beta }` maps; returns `null` when
 * the payload is missing or not object-shaped. Optional `bandMode` is normalized via
 * {@link parseNormalizationBandMode}.
 *
 * @param raw JSON value from Prisma `Json` / tRPC (unknown at the boundary).
 */
export function parseStoredNormalizationRanges(
  raw: unknown,
): NormalizationRanges {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (
    "od" in o &&
    "massabsorption" in o &&
    "beta" in o &&
    typeof o.od === "object" &&
    o.od != null &&
    typeof o.massabsorption === "object" &&
    o.massabsorption != null &&
    typeof o.beta === "object" &&
    o.beta != null
  ) {
    const per = o as unknown as PerChannelNormalizationRanges;
    return {
      od: withParsedBandMode(per.od),
      massabsorption: withParsedBandMode(per.massabsorption),
      beta: withParsedBandMode(per.beta),
    };
  }
  if ("pre" in o || "post" in o) {
    return withParsedBandMode(o as unknown as UnifiedNormalizationRanges);
  }
  return null;
}

/**
 * Resolves contributor pre/post plateau windows for KK Henke merge-domain selection: under
 * `per_channel` scope, uses the channel matching `basis`; otherwise treats `ranges` as unified
 * `{ pre, post }`. Returns `null` when neither window is present on the resolved channel.
 * Callers that require both windows (classic Henke merge) must still check `pre` and `post`.
 *
 * @param scope Experiment `normalizationscope` (`none`, `unified`, or `per_channel`).
 * @param ranges Parsed {@link parseStoredNormalizationRanges} output (may be `null`).
 * @param basis Active absorption representation used for overlay / KK (`delta` uses `beta` windows).
 */
export function unifiedNormalizationWindowsForBasis(
  scope: string | null | undefined,
  ranges: NormalizationRanges,
  basis: NormalizationBasisForKk,
): UnifiedNormalizationRanges | null {
  if (!ranges) {
    return null;
  }
  let unified: UnifiedNormalizationRanges | null = null;
  if (scope === "per_channel" && "od" in ranges) {
    const p = ranges;
    if (basis === "optical-density") {
      unified = p.od;
    } else if (basis === "beta") {
      unified = p.beta;
    } else {
      unified = p.massabsorption;
    }
  } else {
    unified = ranges as UnifiedNormalizationRanges;
  }
  if (!unified) {
    return null;
  }
  if (unified.pre == null && unified.post == null) {
    return null;
  }
  return withParsedBandMode(unified);
}
