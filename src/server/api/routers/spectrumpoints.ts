import { z } from "zod";
import {
  contributeWriteProcedure,
  createTRPCRouter,
  destructiveWriteProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/prisma/client";
import { assertUserMayEditExperiment } from "~/server/nexafs/experimentEditAuthz";
import {
  applyVersionedChange,
  canonicalJsonChecksum,
  confirmVersionBumpSchema,
} from "~/server/nexafs/apply-versioned-change";
import { userMayRecalculateKkDelta } from "~/server/nexafs/kkDeltaRecalculateAuthz";
import {
  buildKkDeltaMetadata,
  kkDeltaMetadataToJson,
} from "~/server/nexafs/kkDeltaMetadata";
import { spectrumpointsWhereForPlotGeometryKeys } from "~/server/nexafs/plotSpectrumGeometryFilter";
import {
  formatSpectrumPointsUniqueConstraintMessage,
  isSpectrumPointsEnergyUniqueViolation,
} from "~/server/nexafs/spectrumPointEnergyUniqueness";
import { syncAfterEdit } from "~/server/zenodo/zenodo-sync-queue";
import { SPECTRUMPOINTS_BROWSE_FETCH_CAP } from "~/lib/nexafs/spectrum-point-limits";

const KK_DELTA_BATCH_CHUNK = 800;

const plotGeometryKeysSchema = z
  .array(z.string().min(1).max(32))
  .max(50)
  .optional();

const plotSpectrumRowSelect = {
  energyev: true,
  rawabs: true,
  od: true,
  massabsorption: true,
  beta: true,
  delta: true,
  i0: true,
  polarizationid: true,
  polarizations: {
    select: { polardeg: true, azimuthdeg: true },
  },
} as const;

export const spectrumpointsRouter = createTRPCRouter({
  canRecalculateKkDelta: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const allowed = await userMayRecalculateKkDelta(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      return { allowed };
    }),

  getByExperiment: publicProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        limit: z
          .number()
          .min(1)
          .max(SPECTRUMPOINTS_BROWSE_FETCH_CAP)
          .default(1000),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const points = await ctx.db.spectrumpoints.findMany({
        where: {
          experimentid: input.experimentId,
        },
        orderBy: {
          energyev: "asc",
        },
        take: input.limit,
        skip: input.offset,
        include: {
          polarizations: {
            select: { polardeg: true, azimuthdeg: true },
          },
        },
      });

      return points;
    }),

  /**
   * Loads lean persisted spectrum rows for dashboard plot compare and STXM Atlas overlays.
   *
   * Selects only plot channels and polarization geometry; optional `geometryKeys` narrows
   * polarizations server-side (`theta:phi` or `fixed`). Browse and dataset detail views
   * should keep using `getByExperiment` when full rows are required.
   */
  getByExperimentForPlot: publicProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        limit: z.number().min(1).max(10000).default(5000),
        offset: z.number().min(0).default(0),
        geometryKeys: plotGeometryKeysSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const geometryWhere = input.geometryKeys
        ? spectrumpointsWhereForPlotGeometryKeys(input.geometryKeys)
        : null;

      const where: Prisma.spectrumpointsWhereInput = {
        experimentid: input.experimentId,
        ...(geometryWhere ?? {}),
      };

      return ctx.db.spectrumpoints.findMany({
        where,
        orderBy: { energyev: "asc" },
        take: input.limit,
        skip: input.offset,
        select: plotSpectrumRowSelect,
      });
    }),

  peaksForExperiment: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.peaksets.findMany({
        where: { experimentid: input.experimentId },
        orderBy: { energyev: "asc" },
      });
    }),

  getByEnergyRange: publicProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        minEnergy: z.number().optional(),
        maxEnergy: z.number().optional(),
        limit: z.number().min(1).max(10000).default(1000),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Uses idx_spectrum_energy for efficient range queries on energyEv
      const where: {
        experimentid: string;
        energyev?: { gte?: number; lte?: number };
      } = {
        experimentid: input.experimentId,
      };

      if (input.minEnergy !== undefined || input.maxEnergy !== undefined) {
        where.energyev = {};
        if (input.minEnergy !== undefined) {
          where.energyev.gte = input.minEnergy;
        }
        if (input.maxEnergy !== undefined) {
          where.energyev.lte = input.maxEnergy;
        }
      }

      const points = await ctx.db.spectrumpoints.findMany({
        where,
        orderBy: {
          energyev: "asc",
        },
        take: input.limit,
      });

      return points;
    }),

  createBatch: destructiveWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        polarizationId: z.string().uuid().optional(),
        points: z.array(
          z.object({
            energyev: z.number(),
            rawabs: z.number(),
            polarizationId: z.string().uuid().optional(),
            od: z.number().optional(),
            massabsorption: z.number().optional(),
            beta: z.number().optional(),
            delta: z.number().finite().optional(),
            deltaerr: z.number().optional(),
            i0: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify experiment exists
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      const createdPoints = await ctx.db.$transaction(async (tx) => {
        await tx.spectrumpoints.deleteMany({
          where: { experimentid: input.experimentId },
        });
        try {
          return await tx.spectrumpoints.createMany({
            data: input.points.map((point) => ({
              experimentid: input.experimentId,
              polarizationid:
                point.polarizationId ??
                input.polarizationId ??
                experiment.polarizationid,
              energyev: point.energyev,
              rawabs: point.rawabs,
              od: point.od ?? null,
              massabsorption: point.massabsorption ?? null,
              beta: point.beta ?? null,
              delta: point.delta ?? null,
              deltaerr: point.deltaerr ?? null,
              i0: point.i0 ?? null,
            })),
          });
        } catch (error) {
          if (isSpectrumPointsEnergyUniqueViolation(error)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: formatSpectrumPointsUniqueConstraintMessage(),
            });
          }
          throw error;
        }
      });

      return {
        success: true,
        count: createdPoints.count,
      };
    }),

  /**
   * Overwrites `spectrumpoints.delta` for the given point ids (client KK output).
   * Records {@link experiments.kkdeltametadata} with source `kk_browser_recalculate` and
   * `calculatedAt` so readers can tell delta was recomputed from beta in-browser.
   */
  updateKkDeltaBatch: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        updates: z
          .array(
            z.object({
              id: z.string().uuid(),
              delta: z.number().finite(),
            }),
          )
          .min(1)
          .max(20000),
        confirmVersionBump: confirmVersionBumpSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      const ids = input.updates.map((u) => u.id);
      const rows = await ctx.db.spectrumpoints.findMany({
        where: {
          experimentid: input.experimentId,
          id: { in: ids },
        },
        select: { id: true },
      });

      if (rows.length !== ids.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "One or more spectrum point ids do not belong to this experiment",
        });
      }

      const priorDelta = await ctx.db.spectrumpoints.findFirst({
        where: { experimentid: input.experimentId, delta: { not: null } },
        select: { id: true },
      });

      const calculatedAt = new Date();
      const kkDeltaMetadata = buildKkDeltaMetadata({
        source: "kk_browser_recalculate",
        calculatedAt,
        calculatedByUserId: ctx.userId,
      });

      const bump = await ctx.db.$transaction(
        async (tx) => {
          for (let i = 0; i < input.updates.length; i += KK_DELTA_BATCH_CHUNK) {
            const chunk = input.updates.slice(i, i + KK_DELTA_BATCH_CHUNK);
            const valuesSql = Prisma.join(
              chunk.map(
                (u) =>
                  Prisma.sql`(${u.id}::uuid, ${u.delta}::double precision)`,
              ),
              ", ",
            );
            await tx.$executeRaw`
              UPDATE public.spectrumpoints AS sp
              SET delta = u.delta
              FROM (VALUES ${valuesSql}) AS u(id, delta)
              WHERE sp.id = u.id AND sp.experimentid = ${input.experimentId}::uuid
            `;
          }
          await tx.experiments.update({
            where: { id: input.experimentId },
            data: {
              kkdeltametadata: kkDeltaMetadataToJson(kkDeltaMetadata),
              updatedat: calculatedAt,
            },
          });

          const persisted = await tx.spectrumpoints.findMany({
            where: { experimentid: input.experimentId, delta: { not: null } },
            select: { polarizationid: true, energyev: true, delta: true },
            orderBy: [{ polarizationid: "asc" }, { energyev: "asc" }],
          });
          const kkDeltaCopy = persisted.map((point) => ({
            polarizationId: point.polarizationid,
            energyEv: point.energyev,
            delta: point.delta,
          })) as Prisma.InputJsonValue;
          const kkDeltaMetadataJson = JSON.parse(
            JSON.stringify(kkDeltaMetadata),
          ) as Prisma.InputJsonValue;
          return applyVersionedChange(tx, {
            experimentId: input.experimentId,
            actorUserId: ctx.userId,
            changes: [priorDelta ? "kk_recalculation" : "kk_first_calculation"],
            parameters: {
              kkDeltaMetadata: kkDeltaMetadataJson,
              updatedPointCount: input.updates.length,
            },
            derivedChecksum: canonicalJsonChecksum(kkDeltaCopy),
            kkDelta: kkDeltaCopy,
            confirmFromVersion: input.confirmVersionBump.fromVersion,
          });
        },
        {
          maxWait: 20_000,
          timeout: 180_000,
        },
      );

      await syncAfterEdit({
        experimentId: input.experimentId,
        bump: { to: bump.to },
      });

      return {
        updated: input.updates.length,
        kkDeltaMetadata,
      };
    }),

  deleteByExperiment: destructiveWriteProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { createdby: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);
      const result = await ctx.db.spectrumpoints.deleteMany({
        where: { experimentid: input.experimentId },
      });

      return {
        success: true,
        count: result.count,
      };
    }),
});
