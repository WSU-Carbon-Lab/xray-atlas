/**
 * Tensor blob procedures of the optical models router.
 *
 * Upload is a three-step flow: the owner asks for a signed upload URL, PUTs the bytes to storage,
 * then commits the blob with its manifest. Commit verifies the stored size and SHA-256 against the
 * declared values and removes the object when they differ. Downloads follow model visibility.
 * Blobs are shared between a fork and its source until replaced, so a blob is deleted only when no
 * tensor row references it.
 */

import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "~/prisma/client";
import { contributeWriteProcedure, publicProcedure } from "~/server/api/trpc";
import { tensorManifestSchema } from "~/lib/optical-models/schemas";
import { loadOwnedModelByTag } from "~/server/optical-models/authz";
import { saveDraft } from "~/server/optical-models/lifecycle";
import { lockModelRow } from "~/server/optical-models/persist-helpers";
import { loadModelVersion } from "~/server/optical-models/read";
import {
  assertTensorSizeAllowed,
  buildTensorStoragePath,
  createTensorSignedReadUrl,
  createTensorSignedUploadUrl,
  headTensorObject,
  removeUnreferencedTensorBlobs,
  sha256AndSizeOfTensorObject,
} from "~/server/optical-models/tensor-storage";
import { modelViewerFromContext } from "~/server/optical-models/viewer";

const tagSchema = z.string().trim().min(1).max(32);
const sha256Schema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "must be a lowercase SHA-256 hex digest");

function assertSizeOrBadRequest(sizeBytes: number): void {
  try {
    assertTensorSizeAllowed(sizeBytes);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid tensor size.",
    });
  }
}

/** Tensor procedures of the `opticalModels` router. */
export const opticalModelTensorProcedures = {
  /** Signed URL for uploading a tensor blob to the model's draft (owner only). */
  tensorUploadUrl: contributeWriteProcedure
    .input(
      z.object({
        tag: tagSchema,
        sizeBytes: z.number().int(),
        sha256: sha256Schema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const model = await loadOwnedModelByTag(ctx.db, ctx.userId, input.tag);
      assertSizeOrBadRequest(input.sizeBytes);
      await saveDraft(ctx.db, {
        actorUserId: ctx.userId,
        tag: input.tag,
        content: {},
      });
      const storagePath = buildTensorStoragePath(model.id, randomUUID());
      const uploadUrl = await createTensorSignedUploadUrl(storagePath);
      return { uploadUrl, storagePath };
    }),

  /** Attaches an uploaded blob to the draft after verifying its size and SHA-256 (owner only). */
  tensorCommit: contributeWriteProcedure
    .input(
      z.object({
        tag: tagSchema,
        storagePath: z.string().min(1).max(200),
        sizeBytes: z.number().int(),
        sha256: sha256Schema,
        manifest: tensorManifestSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const model = await loadOwnedModelByTag(ctx.db, ctx.userId, input.tag);
      assertSizeOrBadRequest(input.sizeBytes);
      if (
        !new RegExp(`^${model.id}/[0-9a-f-]{36}\\.bin$`).test(input.storagePath)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "storagePath does not belong to this model.",
        });
      }
      const inUse = await ctx.db.opticalModelTensor.findFirst({
        where: { storagePath: input.storagePath },
        select: { version: { select: { modelId: true, status: true } } },
      });
      if (inUse) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That upload is already in use.",
        });
      }
      const head = await headTensorObject(input.storagePath);
      if (!head) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No uploaded tensor found at that path.",
        });
      }
      let result: { sha256: string; sizeBytes: number };
      try {
        result = await sha256AndSizeOfTensorObject(input.storagePath);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not verify the uploaded tensor.",
        });
      }
      if (result.sizeBytes !== input.sizeBytes) {
        await removeUnreferencedTensorBlobs(ctx.db, [input.storagePath]);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded size does not match the declared size.",
        });
      }
      if (result.sha256 !== input.sha256) {
        await removeUnreferencedTensorBlobs(ctx.db, [input.storagePath]);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded content does not match the declared SHA-256.",
        });
      }

      const previousPath = await ctx.db.$transaction(async (tx) => {
        await lockModelRow(tx, model.id);
        const draft = await tx.opticalModelVersion.findFirst({
          where: { modelId: model.id, status: "draft" },
          include: { tensor: true },
        });
        if (!draft) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "There is no draft; save the draft before committing a tensor.",
          });
        }
        const previous = draft.tensor?.storagePath ?? null;
        const manifest = input.manifest as Prisma.InputJsonValue;
        await tx.opticalModelTensor.upsert({
          where: { versionId: draft.id },
          create: {
            versionId: draft.id,
            storagePath: input.storagePath,
            byteSize: input.sizeBytes,
            sha256: input.sha256,
            manifest,
          },
          update: {
            storagePath: input.storagePath,
            byteSize: input.sizeBytes,
            sha256: input.sha256,
            manifest,
          },
        });
        return previous;
      });
      if (previousPath && previousPath !== input.storagePath) {
        await removeUnreferencedTensorBlobs(ctx.db, [previousPath]);
      }
      return { tag: model.tag, storagePath: input.storagePath };
    }),

  /** Short-lived signed read URL for a visible model version's tensor, with its digest and manifest. */
  tensorDownloadUrl: publicProcedure
    .input(
      z.object({
        tag: tagSchema,
        version: z
          .union([
            z.literal("latest"),
            z.literal("draft"),
            z.number().int().min(1),
          ])
          .default("latest"),
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
      const tensor = await ctx.db.opticalModelTensor.findUnique({
        where: { versionId: version.id },
      });
      if (!tensor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This model version has no tensor.",
        });
      }
      const url = await createTensorSignedReadUrl(tensor.storagePath);
      const manifest = tensorManifestSchema.safeParse(tensor.manifest);
      return {
        url,
        sha256: tensor.sha256,
        byteSize: tensor.byteSize,
        manifest: manifest.success ? manifest.data : null,
      };
    }),
};
