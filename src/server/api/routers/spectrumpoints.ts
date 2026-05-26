import { z } from "zod";
import {
  createTRPCRouter,
  privilegedWriteProcedure,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/prisma/client";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";
import { userMayRecalculateKkDelta } from "~/server/nexafs/kkDeltaRecalculateAuthz";
import {
  buildKkDeltaMetadata,
  kkDeltaMetadataToJson,
} from "~/server/nexafs/kkDeltaMetadata";

const KK_DELTA_BATCH_CHUNK = 800;

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
        limit: z.number().min(1).max(10000).default(1000),
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

  createBatch: protectedProcedure
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
      const canMutate =
        experiment.createdby != null &&
        ctx.userId != null &&
        experiment.createdby === ctx.userId;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!canMutate && !isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this experiment",
        });
      }

      const createdPoints = await ctx.db.$transaction(async (tx) => {
        await tx.spectrumpoints.deleteMany({
          where: { experimentid: input.experimentId },
        });
        return tx.spectrumpoints.createMany({
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
  updateKkDeltaBatch: protectedProcedure
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = await userMayRecalculateKkDelta(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update KK delta for this experiment",
        });
      }

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
          message: "One or more spectrum point ids do not belong to this experiment",
        });
      }

      const calculatedAt = new Date();
      const kkDeltaMetadata = buildKkDeltaMetadata({
        source: "kk_browser_recalculate",
        calculatedAt,
        calculatedByUserId: ctx.userId,
      });

      await ctx.db.$transaction(
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
        },
        {
          maxWait: 20_000,
          timeout: 180_000,
        },
      );

      return {
        updated: input.updates.length,
        kkDeltaMetadata,
      };
    }),

  deleteByExperiment: privilegedWriteProcedure
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
      const canMutate =
        experiment.createdby != null &&
        ctx.userId != null &&
        experiment.createdby === ctx.userId;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!canMutate && !isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this experiment",
        });
      }
      const result = await ctx.db.spectrumpoints.deleteMany({
        where: { experimentid: input.experimentId },
      });

      return {
        success: true,
        count: result.count,
      };
    }),
});
