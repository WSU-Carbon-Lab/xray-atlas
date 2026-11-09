/**
 * `normalized` query of the optical models router.
 *
 * Resolves a visible model version and one of its linked datasets, then returns that dataset's
 * channels under the version's normalization. Models without a normalization answer 422
 * `NORMALIZATION_UNDEFINED`. Results are computed per request and not stored.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { normalizationSpecSchema } from "~/lib/optical-models/schemas";
import { formatDatasetVersion } from "~/server/nexafs/dataset-versioning";
import { computeNormalizedChannels } from "~/server/optical-models/normalized-channels";
import {
  loadModelVersion,
  resolveDatasetToExperimentId,
} from "~/server/optical-models/read";
import { modelViewerFromContext } from "~/server/optical-models/viewer";

/** Normalized-channel procedures of the `opticalModels` router. */
export const opticalModelNormalizedProcedures = {
  /**
   * Channels of one linked dataset under the version's normalization.
   *
   * `pinned` is the dataset version the model linked; the channels are computed from the dataset's
   * stored raw spectrum, which does not change between dataset versions today.
   */
  normalized: publicProcedure
    .input(
      z.object({
        tag: z.string().trim().min(1).max(32),
        version: z
          .union([
            z.literal("latest"),
            z.literal("draft"),
            z.number().int().min(1),
          ])
          .default("latest"),
        dataset: z.string().trim().min(1).max(64).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const viewer = modelViewerFromContext(ctx);
      const { version } = await loadModelVersion(
        ctx.db,
        viewer,
        input.tag,
        input.version,
      );
      const spec = normalizationSpecSchema.safeParse(version.normalization);
      if (!spec.success) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: "NORMALIZATION_UNDEFINED",
        });
      }
      let link = version.datasets[0];
      if (input.dataset) {
        const experimentId = await resolveDatasetToExperimentId(
          ctx.db,
          input.dataset,
        );
        link = version.datasets.find(
          (entry) => entry.experimentId === experimentId,
        );
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That dataset is not linked to this model version.",
          });
        }
      } else if (version.datasets.length !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This version links several datasets; pass `dataset`.",
        });
      }
      if (!link) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This model version links no dataset.",
        });
      }
      const channels = await computeNormalizedChannels(ctx.db, {
        experimentId: link.experimentId,
        normalization: spec.data,
      });
      return {
        experimentId: link.experimentId,
        pinned: formatDatasetVersion({
          major: link.pinnedMajor,
          minor: link.pinnedMinor,
          patch: link.pinnedPatch,
        }),
        channels,
      };
    }),
};
