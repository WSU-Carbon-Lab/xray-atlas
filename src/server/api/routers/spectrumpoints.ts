import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const spectrumpointsRouter = createTRPCRouter({
  getByExperiment: publicProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        limit: z.number().min(1).max(10000).default(1000),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Uses idx_spectrum_energy (experimentId, energyEv) for efficient filtering and ordering
      const points = await ctx.db.spectrumpoints.findMany({
        where: {
          experimentid: input.experimentId,
        },
        orderBy: {
          energyev: "asc",
        },
        take: input.limit,
        skip: input.offset,
      });

      return points;
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
        points: z.array(
          z.object({
            energyev: z.number(),
            rawabs: z.number(),
            processedabs: z.number().optional(),
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

      // Delete existing points for this experiment
      await ctx.db.spectrumpoints.deleteMany({
        where: { experimentid: input.experimentId },
      });

      // Create new points
      const createdPoints = await ctx.db.spectrumpoints.createMany({
        data: input.points.map((point) => ({
          experimentid: input.experimentId,
          energyev: point.energyev,
          rawabs: point.rawabs,
          processedabs: point.processedabs ?? null,
          i0: point.i0 ?? null,
        })),
      });

      return {
        success: true,
        count: createdPoints.count,
      };
    }),

  deleteByExperiment: protectedProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.spectrumpoints.deleteMany({
        where: { experimentid: input.experimentId },
      });

      return {
        success: true,
        count: result.count,
      };
    }),
});
