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
  createAuxSignedReadUrl,
  createAuxSignedUploadUrl,
  EXPERIMENT_AUX_BUCKET,
  headAuxStorageObject,
} from "~/server/aux-storage";
import {
  contributeWriteProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";
import {
  assertUserMayEditExperiment,
  userMayEditExperiment,
} from "~/server/nexafs/experimentEditAuthz";

async function userMaySoftDeleteExperimentFile(
  db: Parameters<typeof userMayEditExperiment>[0],
  userId: string | null,
  file: { experimentid: string; createdby: string },
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
  return userMayEditExperiment(db, userId, file.experimentid);
}

async function assertExperimentExistsForAuxBrowse(
  db: Parameters<typeof userMayEditExperiment>[0],
  experimentId: string,
): Promise<void> {
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: { id: true },
  });
  if (!experiment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Experiment not found",
    });
  }
}

async function listCommittedExperimentAuxFiles(
  db: Parameters<typeof userMayEditExperiment>[0],
  experimentId: string,
) {
  const rows = await db.experimentfile.findMany({
    where: {
      experimentid: experimentId,
      deletedat: null,
      committedat: { not: null },
    },
    orderBy: { createdat: "desc" },
  });
  return rows.map(serializeAuxFileRow);
}

async function getCommittedExperimentAuxDownload(
  db: Parameters<typeof userMayEditExperiment>[0],
  experimentId: string,
  fileId: string,
) {
  const row = await db.experimentfile.findFirst({
    where: {
      id: fileId,
      experimentid: experimentId,
      deletedat: null,
      committedat: { not: null },
    },
  });
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "File not found",
    });
  }

  const signedUrl = await createAuxSignedReadUrl({
    bucket: EXPERIMENT_AUX_BUCKET,
    path: row.storagepath,
  });

  return {
    signedUrl,
    originalFilename: row.originalfilename,
    mimeType: row.mimetype,
    sizeBytes: Number(row.sizebytes),
  };
}

export const experimentFileRouter = createTRPCRouter({
  listCommittedForBrowse: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertExperimentExistsForAuxBrowse(ctx.db, input.experimentId);
      return listCommittedExperimentAuxFiles(ctx.db, input.experimentId);
    }),

  getCommittedDownloadUrlForBrowse: publicProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        fileId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertExperimentExistsForAuxBrowse(ctx.db, input.experimentId);
      return getCommittedExperimentAuxDownload(
        ctx.db,
        input.experimentId,
        input.fileId,
      );
    }),

  list: protectedProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      return listCommittedExperimentAuxFiles(ctx.db, input.experimentId);
    }),

  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        fileId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      return getCommittedExperimentAuxDownload(
        ctx.db,
        input.experimentId,
        input.fileId,
      );
    }),

  requestUploadUrl: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        upload: auxFileUploadRequestSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );

      try {
        assertAuxMimeAllowed(input.upload.mimeType);
        assertAuxFileSizeAllowed(
          EXPERIMENT_AUX_BUCKET,
          input.upload.sizeBytes,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid upload request",
        });
      }

      const fileId = crypto.randomUUID();
      const storagePath = buildAuxStoragePath(
        input.experimentId,
        fileId,
        input.upload.originalFilename,
      );

      const row = await ctx.db.experimentfile.create({
        data: {
          id: fileId,
          experimentid: input.experimentId,
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
        bucket: EXPERIMENT_AUX_BUCKET,
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
        experimentId: z.string().uuid(),
        commit: auxFileCommitSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.experimentfile.findFirst({
        where: {
          id: input.commit.fileId,
          experimentid: input.experimentId,
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
        bucket: EXPERIMENT_AUX_BUCKET,
        path: row.storagepath,
      });
      if (!head) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded object not found in storage",
        });
      }

      const updated = await ctx.db.experimentfile.update({
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
        experimentId: z.string().uuid(),
        fileId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.experimentfile.findFirst({
        where: {
          id: input.fileId,
          experimentid: input.experimentId,
          deletedat: null,
        },
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const allowed = await userMaySoftDeleteExperimentFile(
        ctx.db,
        ctx.userId,
        {
          experimentid: row.experimentid,
          createdby: row.createdby,
        },
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this file",
        });
      }

      const updated = await ctx.db.experimentfile.update({
        where: { id: row.id },
        data: { deletedat: new Date() },
      });

      return serializeAuxFileRow(updated);
    }),
});
