/**
 * Write procedures of the optical models router.
 *
 * Every procedure uses `contributeWriteProcedure`, so callers need the contribution agreement, a
 * passkey enrollment, and, for bearer tokens, the `write` scope. Ownership, visibility, and
 * dataset-review rights are enforced by the domain functions and gates called here. Does not read
 * models for display; see the query procedures.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { contributeWriteProcedure } from "~/server/api/trpc";
import { orcidUserIdSchema } from "~/lib/orcid";
import {
  draftContentSchema,
  MODEL_VISIBILITIES,
} from "~/lib/optical-models/schemas";
import {
  loadOwnedModelByTag,
  userMayReviewModelOnDataset,
} from "~/server/optical-models/authz";
import { forkModel, saveDraft } from "~/server/optical-models/lifecycle";
import { lockModelRow } from "~/server/optical-models/persist-helpers";
import {
  assertModelMayBePublic,
  deleteModelIfUnpublished,
  publishDraft,
} from "~/server/optical-models/publish";
import { removeUnreferencedTensorBlobs } from "~/server/optical-models/tensor-storage";
import { loadVisibleModelByTag } from "~/server/optical-models/visibility";

const tagSchema = z.string().trim().min(1).max(32);

/** Mutation procedures of the `opticalModels` router. */
export const opticalModelMutationProcedures = {
  /** Creates a private model as a fork of a visible published version. */
  fork: contributeWriteProcedure
    .input(
      z.object({
        tag: tagSchema,
        fromVersion: z.number().int().min(1).optional(),
        title: z.string().trim().min(1).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      forkModel(ctx.db, {
        actorUserId: ctx.userId,
        sourceTag: input.tag,
        ...(input.fromVersion !== undefined
          ? { fromVersion: input.fromVersion }
          : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
      }),
    ),

  /** Replaces the fields present in `content` on the model's draft (owner only). */
  saveDraft: contributeWriteProcedure
    .input(z.object({ tag: tagSchema, content: draftContentSchema }))
    .mutation(async ({ ctx, input }) => {
      await saveDraft(ctx.db, {
        actorUserId: ctx.userId,
        tag: input.tag,
        content: input.content,
      });
      return { tag: input.tag };
    }),

  /** Publishes the draft as the next immutable version (owner only). */
  publish: contributeWriteProcedure
    .input(z.object({ tag: tagSchema }))
    .mutation(async ({ ctx, input }) =>
      publishDraft(ctx.db, { actorUserId: ctx.userId, tag: input.tag }),
    ),

  /** Sets private, shared, or public visibility (owner only). Public needs public ancestors. */
  setVisibility: contributeWriteProcedure
    .input(z.object({ tag: tagSchema, visibility: z.enum(MODEL_VISIBILITIES) }))
    .mutation(async ({ ctx, input }) => {
      const model = await loadOwnedModelByTag(ctx.db, ctx.userId, input.tag);
      await ctx.db.$transaction(async (tx) => {
        await lockModelRow(tx, model.id);
        if (input.visibility === "public") {
          await assertModelMayBePublic(tx, model.id);
        }
        await tx.opticalModel.update({
          where: { id: model.id },
          data: { visibility: input.visibility },
        });
      });
      return { tag: model.tag, visibility: input.visibility };
    }),

  /** Shares the model with an ORCID iD; a private model becomes `shared` (owner only). */
  share: contributeWriteProcedure
    .input(z.object({ tag: tagSchema, orcid: orcidUserIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const model = await loadOwnedModelByTag(ctx.db, ctx.userId, input.tag);
      if (input.orcid === model.ownerOrcid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A model is already shared with its owner.",
        });
      }
      await ctx.db.$transaction(async (tx) => {
        await lockModelRow(tx, model.id);
        const fresh = await tx.opticalModel.findUniqueOrThrow({
          where: { id: model.id },
          select: { visibility: true },
        });
        await tx.opticalModelShare.upsert({
          where: {
            modelId_granteeOrcid: {
              modelId: model.id,
              granteeOrcid: input.orcid,
            },
          },
          create: {
            modelId: model.id,
            granteeOrcid: input.orcid,
            grantedByOrcid: ctx.userId,
          },
          update: {},
        });
        if (fresh.visibility === "private") {
          await tx.opticalModel.update({
            where: { id: model.id },
            data: { visibility: "shared" },
          });
        }
      });
      return { tag: model.tag, orcid: input.orcid };
    }),

  /** Removes a share (owner only). Idempotent. */
  unshare: contributeWriteProcedure
    .input(z.object({ tag: tagSchema, orcid: orcidUserIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const model = await loadOwnedModelByTag(ctx.db, ctx.userId, input.tag);
      await ctx.db.opticalModelShare.deleteMany({
        where: { modelId: model.id, granteeOrcid: input.orcid },
      });
      return { tag: model.tag, orcid: input.orcid };
    }),

  /**
   * Approves or rejects a model on a dataset the caller may edit. A rejection is recorded and
   * never changes visibility or deletes the model.
   */
  review: contributeWriteProcedure
    .input(
      z.object({
        tag: tagSchema,
        experimentId: z.string().uuid(),
        state: z.enum(["approved", "rejected"]),
        note: z.string().trim().min(1).max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const model = await loadVisibleModelByTag(
        ctx.db,
        { userId: ctx.userId },
        input.tag,
      );
      const allowed = await userMayReviewModelOnDataset(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only people who can edit this dataset can review models on it.",
        });
      }
      const linked = await ctx.db.opticalModelDataset.count({
        where: {
          experimentId: input.experimentId,
          version: { modelId: model.id, status: "published" },
        },
      });
      if (linked === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This model has no published version linking that dataset.",
        });
      }
      await ctx.db.opticalModelReview.upsert({
        where: {
          modelId_experimentId: {
            modelId: model.id,
            experimentId: input.experimentId,
          },
        },
        create: {
          modelId: model.id,
          experimentId: input.experimentId,
          state: input.state,
          reviewerUserId: ctx.userId,
          note: input.note ?? null,
        },
        update: {
          state: input.state,
          reviewerUserId: ctx.userId,
          note: input.note ?? null,
          reviewedAt: new Date(),
        },
      });
      return {
        tag: model.tag,
        experimentId: input.experimentId,
        state: input.state,
      };
    }),

  /** Deletes a model that has never been published (owner only). */
  deleteUnpublished: contributeWriteProcedure
    .input(z.object({ tag: tagSchema }))
    .mutation(async ({ ctx, input }) => {
      const { tensorPaths } = await deleteModelIfUnpublished(ctx.db, {
        actorUserId: ctx.userId,
        tag: input.tag,
      });
      await removeUnreferencedTensorBlobs(ctx.db, tensorPaths);
      return { deleted: true };
    }),
};
