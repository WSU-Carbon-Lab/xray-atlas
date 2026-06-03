import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  auxFileCommitSchema,
  auxFileUploadRequestSchema,
  serializeAuxFileRow,
} from "~/server/aux-file-contract";
import {
  assertAuxFileSizeAllowed,
  assertAuxMimeAllowed,
  buildAuxStoragePath,
  createAuxSignedUploadUrl,
  headAuxStorageObject,
  SAMPLE_AUX_BUCKET,
} from "~/server/aux-storage";
import {
  contributeWriteProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";
import {
  assertUserMayEditSample,
  userMayEditSample,
} from "~/server/nexafs/experimentEditAuthz";

async function userMaySoftDeleteSampleFile(
  db: Parameters<typeof userMayEditSample>[0],
  userId: string | null,
  file: { sampleid: string; createdby: string },
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  if (await hasPrivilegedRole(db, userId)) {
    return true;
  }
  if (file.createdby === userId) {
    return true;
  }
  return userMayEditSample(db, userId, file.sampleid);
}

export const sampleFileRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ sampleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.samplefile.findMany({
        where: {
          sampleid: input.sampleId,
          deletedat: null,
          committedat: { not: null },
        },
        orderBy: { createdat: "desc" },
      });
      return rows.map(serializeAuxFileRow);
    }),

  requestUploadUrl: contributeWriteProcedure
    .input(
      z.object({
        sampleId: z.string().uuid(),
        upload: auxFileUploadRequestSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sample = await ctx.db.samples.findUnique({
        where: { id: input.sampleId },
        select: { id: true },
      });
      if (!sample) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sample not found",
        });
      }

      await assertUserMayEditSample(ctx.db, ctx.userId, input.sampleId);

      try {
        assertAuxMimeAllowed(input.upload.mimeType);
        assertAuxFileSizeAllowed(SAMPLE_AUX_BUCKET, input.upload.sizeBytes);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid upload request",
        });
      }

      const fileId = crypto.randomUUID();
      const storagePath = buildAuxStoragePath(
        input.sampleId,
        fileId,
        input.upload.originalFilename,
      );

      const row = await ctx.db.samplefile.create({
        data: {
          id: fileId,
          sampleid: input.sampleId,
          storagepath: storagePath,
          originalfilename: input.upload.originalFilename,
          mimetype: input.upload.mimeType.trim().toLowerCase(),
          sizebytes: BigInt(input.upload.sizeBytes),
          kind: input.upload.kind,
          description: input.upload.description ?? null,
          createdby: ctx.userId,
        },
      });

      const { signedUrl, token } = await createAuxSignedUploadUrl({
        bucket: SAMPLE_AUX_BUCKET,
        path: storagePath,
        mimeType: row.mimetype,
      });

      return {
        fileId: row.id,
        signedUrl,
        token,
        storagePath,
      };
    }),

  commitUpload: contributeWriteProcedure
    .input(
      z.object({
        sampleId: z.string().uuid(),
        commit: auxFileCommitSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.samplefile.findFirst({
        where: {
          id: input.commit.fileId,
          sampleid: input.sampleId,
          deletedat: null,
        },
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Upload not found",
        });
      }
      if (row.committedat != null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Upload already committed",
        });
      }
      if (row.createdby !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the uploader may commit this file",
        });
      }

      const head = await headAuxStorageObject({
        bucket: SAMPLE_AUX_BUCKET,
        path: row.storagepath,
      });
      if (!head) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded object not found in storage",
        });
      }

      const updated = await ctx.db.samplefile.update({
        where: { id: row.id },
        data: {
          checksumsha256: input.commit.checksumSha256.toLowerCase(),
          committedat: new Date(),
        },
      });

      return serializeAuxFileRow(updated);
    }),

  softDelete: contributeWriteProcedure
    .input(
      z.object({
        sampleId: z.string().uuid(),
        fileId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.samplefile.findFirst({
        where: {
          id: input.fileId,
          sampleid: input.sampleId,
          deletedat: null,
        },
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const allowed = await userMaySoftDeleteSampleFile(ctx.db, ctx.userId, {
        sampleid: row.sampleid,
        createdby: row.createdby,
      });
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this file",
        });
      }

      const updated = await ctx.db.samplefile.update({
        where: { id: row.id },
        data: { deletedat: new Date() },
      });

      return serializeAuxFileRow(updated);
    }),
});
