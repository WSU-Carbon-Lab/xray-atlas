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
  assertUserMayEditExperiment,
  assertUserMayEditSample,
  userMayEditSample,
} from "~/server/nexafs/experimentEditAuthz";
import { confirmVersionBumpSchema } from "~/server/nexafs/apply-versioned-change";
import { runAuxFileMutation } from "~/server/nexafs/aux-upload-session";
import type { PrismaClient } from "~/prisma/client";

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

/**
 * Authorizes a sample file change made through `experimentId` and verifies the experiment uses
 * `sampleId`. Throws NOT_FOUND for an unknown experiment, BAD_REQUEST when the experiment is
 * linked to another sample, FORBIDDEN without edit rights on the experiment.
 */
async function assertExperimentOwnsSample(
  db: PrismaClient,
  userId: string,
  experimentId: string,
  sampleId: string,
): Promise<void> {
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: { sampleid: true },
  });
  if (!experiment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
  }
  if (experiment.sampleid !== sampleId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Experiment is not linked to this sample",
    });
  }
  await assertUserMayEditExperiment(db, userId, experimentId);
}

/**
 * Input fields shared by sample file commit and delete. `experimentId` names the experiment the
 * edit is made through: that experiment alone is bumped (minor), via `sessionId` or an immediate
 * `confirmVersionBump`. Committed changes require `experimentId`.
 */
const throughExperimentSchema = {
  experimentId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  confirmVersionBump: confirmVersionBumpSchema.optional(),
};

type SampleFileClient = Pick<PrismaClient, "samplefile">;

/** Marks an uncommitted, undeleted sample file committed; BAD_REQUEST when already committed. */
async function commitSampleFileRow(
  client: SampleFileClient,
  id: string,
  data: { checksumsha256: string; committedat: Date },
) {
  const changed = await client.samplefile.updateMany({
    where: { id, committedat: null, deletedat: null },
    data,
  });
  if (changed.count === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Upload already committed",
    });
  }
  return client.samplefile.findUniqueOrThrow({ where: { id } });
}

/** Soft-deletes a committed, undeleted sample file; NOT_FOUND when its state changed. */
async function deleteCommittedSampleFileRow(
  client: SampleFileClient,
  id: string,
) {
  const changed = await client.samplefile.updateMany({
    where: { id, committedat: { not: null }, deletedat: null },
    data: { deletedat: new Date() },
  });
  if (changed.count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
  }
  return client.samplefile.findUniqueOrThrow({ where: { id } });
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

  getDownloadUrl: publicProcedure
    .input(
      z.object({
        sampleId: z.string().uuid(),
        fileId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.samplefile.findFirst({
        where: {
          id: input.fileId,
          sampleid: input.sampleId,
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
        bucket: SAMPLE_AUX_BUCKET,
        path: row.storagepath,
      });

      return {
        signedUrl,
        originalFilename: row.originalfilename,
        mimeType: row.mimetype,
        sizeBytes: Number(row.sizebytes),
      };
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
        ...throughExperimentSchema,
        /** Creator's first uploads right after creation; no bump while eligible. */
        initialUpload: z.boolean().optional(),
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

      if (!input.experimentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "experimentId is required to commit a sample file",
        });
      }

      const commitData = {
        checksumsha256: input.commit.checksumSha256.toLowerCase(),
        committedat: new Date(),
      };
      await assertExperimentOwnsSample(
        ctx.db,
        ctx.userId,
        input.experimentId,
        input.sampleId,
      );
      const updated = await runAuxFileMutation(ctx.db, {
        experimentId: input.experimentId,
        actorUserId: ctx.userId,
        kind: "aux_added",
        sessionId: input.sessionId,
        confirmFromVersion: input.confirmVersionBump?.fromVersion,
        initialUpload: input.initialUpload,
        mutate: (tx) => commitSampleFileRow(tx, row.id, commitData),
      });

      return serializeAuxFileRow(updated);
    }),

  softDelete: contributeWriteProcedure
    .input(
      z.object({
        sampleId: z.string().uuid(),
        fileId: z.string().uuid(),
        ...throughExperimentSchema,
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

      let updated;
      if (row.committedat === null) {
        // An abandoned upload never joined the published file set: no bump, no marker.
        await ctx.db.samplefile.updateMany({
          where: { id: row.id, committedat: null, deletedat: null },
          data: { deletedat: new Date() },
        });
        updated = await ctx.db.samplefile.findUniqueOrThrow({
          where: { id: row.id },
        });
      } else {
        if (!input.experimentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "experimentId is required to delete a committed sample file",
          });
        }
        await assertExperimentOwnsSample(
          ctx.db,
          ctx.userId,
          input.experimentId,
          input.sampleId,
        );
        updated = await runAuxFileMutation(ctx.db, {
          experimentId: input.experimentId,
          actorUserId: ctx.userId,
          kind: "aux_removed",
          sessionId: input.sessionId,
          confirmFromVersion: input.confirmVersionBump?.fromVersion,
          mutate: (tx) => deleteCommittedSampleFileRow(tx, row.id),
        });
      }

      return serializeAuxFileRow(updated);
    }),
});
