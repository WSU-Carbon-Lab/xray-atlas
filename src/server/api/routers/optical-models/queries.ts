/**
 * Read procedures of the optical models router.
 *
 * These are `publicProcedure` queries because anonymous callers may read public models; every
 * procedure resolves the viewer with `modelViewerFromContext` and applies visibility in the query.
 * A bearer token without the `read` scope reads as anonymous. Does not mutate anything.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { loadLineage } from "~/server/optical-models/lineage";
import {
  listModelsForDataset,
  listModelsSharedWithUser,
  listMyModels,
  loadModelDetail,
  loadModelVersion,
  resolveDatasetToExperimentId,
} from "~/server/optical-models/read";
import { modelViewerFromContext } from "~/server/optical-models/viewer";

const versionSelectorSchema = z
  .union([z.literal("latest"), z.literal("draft"), z.number().int().min(1)])
  .default("latest");

const pageInputSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const tagSchema = z.string().trim().min(1).max(32);

function requireSignedIn(viewer: { userId: string | null }): string {
  if (!viewer.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return viewer.userId;
}

/** Query procedures of the `opticalModels` router. */
export const opticalModelQueryProcedures = {
  /** Models visible to the caller that link a dataset (Atlas dataset id or experiment UUID). */
  listForDataset: publicProcedure
    .input(
      z.object({
        dataset: z.string().trim().min(1).max(64),
        scope: z.enum(["public", "mine", "shared", "all"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const viewer = modelViewerFromContext(ctx);
      const experimentId = await resolveDatasetToExperimentId(
        ctx.db,
        input.dataset,
      );
      return listModelsForDataset(ctx.db, viewer, experimentId, input.scope);
    }),

  /** Models the caller owns, including models that have only a draft. */
  listMine: publicProcedure
    .input(pageInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = requireSignedIn(modelViewerFromContext(ctx));
      return listMyModels(ctx.db, userId, input.cursor, input.limit);
    }),

  /** Published models that someone else shared with the caller. */
  listSharedWithMe: publicProcedure
    .input(pageInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = requireSignedIn(modelViewerFromContext(ctx));
      return listModelsSharedWithUser(
        ctx.db,
        userId,
        input.cursor,
        input.limit,
      );
    }),

  /** One model with one version: `latest` (default), `draft` (owner only), or a version number. */
  getByTag: publicProcedure
    .input(z.object({ tag: tagSchema, version: versionSelectorSchema }))
    .query(async ({ ctx, input }) => {
      const viewer = modelViewerFromContext(ctx);
      return loadModelDetail(ctx.db, viewer, input.tag, input.version);
    }),

  /** Visible ancestors of one version, with a count of ancestors the caller cannot see. */
  lineage: publicProcedure
    .input(z.object({ tag: tagSchema, version: versionSelectorSchema }))
    .query(async ({ ctx, input }) => {
      const viewer = modelViewerFromContext(ctx);
      const { version } = await loadModelVersion(
        ctx.db,
        viewer,
        input.tag,
        input.version,
      );
      return loadLineage(ctx.db, viewer, version.id);
    }),
};
