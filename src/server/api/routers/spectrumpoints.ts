import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";

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
            i0: point.i0 ?? null,
          })),
        });
      });

      return {
        success: true,
        count: createdPoints.count,
      };
    }),

  deleteByExperiment: protectedProcedure
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
