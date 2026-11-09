/**
 * Mapping from a dataset's stored normalization to an optical model normalization spec.
 *
 * Owns the one conversion used when a default model copies the uploader's normalization. Does not
 * read the database and does not apply normalization to spectra.
 */

import type { Prisma } from "~/prisma/client";
import {
  normalizationSpecSchema,
  NORMALIZATION_CHANNELS,
  type NormalizationSpec,
} from "~/lib/optical-models/schemas";

function asRecord(
  value: Prisma.JsonValue | undefined,
): Prisma.JsonObject | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

/**
 * Model normalization spec equivalent to a dataset's stored normalization.
 *
 * Scope `unified` maps when `pre` and `post` are both valid ordered windows. Scope `per_channel`
 * maps when each of `od`, `massabsorption`, and `beta` has valid `pre` and `post` windows. Scope
 * `none`, a missing window, an unknown scope, or windows that fail the spec's ordering rules map to
 * `null`, meaning the dataset has no normalization a model can reuse.
 *
 * @param scope - `experiments.normalization_scope`, or `null`.
 * @param ranges - `experiments.normalization_ranges`, or `null`.
 * @returns The equivalent spec, or `null` when the dataset normalization cannot be expressed.
 */
export function normalizationSpecFromDataset(
  scope: string | null,
  ranges: Prisma.JsonValue | null,
): NormalizationSpec | null {
  const record = asRecord(ranges);
  if (!record) return null;
  if (scope === "unified") {
    const parsed = normalizationSpecSchema.safeParse({
      schemaVersion: 1,
      scope: "unified",
      pre: record.pre,
      post: record.post,
    });
    return parsed.success ? parsed.data : null;
  }
  if (scope === "per_channel") {
    const candidate: Record<string, unknown> = {
      schemaVersion: 1,
      scope: "per_channel",
    };
    for (const channel of NORMALIZATION_CHANNELS) {
      const channelRecord = asRecord(record[channel]);
      candidate[channel] = channelRecord
        ? { pre: channelRecord.pre, post: channelRecord.post }
        : undefined;
    }
    const parsed = normalizationSpecSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  }
  return null;
}
