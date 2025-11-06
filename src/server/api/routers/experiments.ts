import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const experimentsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.id },
        include: {
          samples: {
            include: {
              molecules: {
                include: {
                  moleculesynonyms: {
                    orderBy: [{ primary: "desc" }, { synonym: "asc" }], // Primary first
                  },
                },
              },
            },
          },
          edges: true,
          instruments: {
            include: {
              facilities: true,
              vendors: true,
            },
          },
          polarizations: true,
          calibrationmethods: true,
          users: true,
          experimentpublications: {
            include: {
              publications: true,
            },
          },
          experimentquality: true,
          spectrumpoints: {
            orderBy: {
              energyev: "asc",
            },
            take: 1000, // Limit spectrum points for performance
          },
        },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      return experiment;
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        sampleId: z.string().uuid().optional(),
        edgeId: z.string().uuid().optional(),
        instrumentId: z.string().optional(),
        measurementDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build where clause to leverage idx_experiment_lookup composite index
      // When multiple fields are provided, PostgreSQL will use the composite index efficiently
      const where: {
        sampleid?: string;
        edgeid?: string;
        instrumentid?: string;
        measurementdate?: Date;
      } = {};

      if (input.sampleId) {
        where.sampleid = input.sampleId;
      }
      if (input.edgeId) {
        where.edgeid = input.edgeId;
      }
      if (input.instrumentId) {
        where.instrumentid = input.instrumentId;
      }
      if (input.measurementDate) {
        where.measurementdate = input.measurementDate;
      }

      // Prisma will automatically use idx_experiment_lookup when filtering by these fields
      const experiments = await ctx.db.experiments.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          samples: {
            include: {
              molecules: {
                include: {
                  moleculesynonyms: {
                    take: 1,
                  },
                },
              },
            },
          },
          edges: true,
          instruments: true,
          users: true,
        },
        orderBy: {
          createdat: "desc",
        },
      });

      let nextCursor: string | undefined = undefined;
      if (experiments.length > input.limit) {
        const nextItem = experiments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        experiments,
        nextCursor,
      };
    }),

  findByPolarization: publicProcedure
    .input(
      z.object({
        azimuthDeg: z.number(),
        polarDeg: z.number(),
        tolerance: z.number().default(0.1), // Default tolerance in degrees
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Uses idx_polarization_geom for efficient geometry lookups
      // Find polarizations within tolerance, then get their experiments
      const polarizations = await ctx.db.polarizations.findMany({
        where: {
          azimuthdeg: {
            gte: input.azimuthDeg - input.tolerance,
            lte: input.azimuthDeg + input.tolerance,
          },
          polardeg: {
            gte: input.polarDeg - input.tolerance,
            lte: input.polarDeg + input.tolerance,
          },
        },
        include: {
          experiments: {
            take: input.limit,
            include: {
              samples: {
                include: {
                  molecules: {
                    include: {
                      moleculesynonyms: {
                        take: 1,
                      },
                    },
                  },
                },
              },
              edges: true,
              instruments: true,
            },
            orderBy: {
              createdat: "desc",
            },
          },
        },
      });

      // Flatten experiments from all matching polarizations
      const experiments = polarizations.flatMap((p) => p.experiments);

      return {
        experiments: experiments.slice(0, input.limit),
        count: experiments.length,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        sampleid: z.string().uuid(),
        instrumentid: z.string(),
        edgeid: z.string().uuid(),
        polarizationid: z.string().uuid(),
        calibrationid: z.string().uuid().optional(),
        isstandard: z.boolean().default(false),
        referencestandard: z.string().optional(),
        measurementdate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.create({
        data: {
          ...input,
          createdby: ctx.userId ?? undefined,
        },
        include: {
          samples: true,
          edges: true,
          instruments: true,
        },
      });

      return experiment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        calibrationid: z.string().uuid().optional(),
        isstandard: z.boolean().optional(),
        referencestandard: z.string().optional(),
        measurementdate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const experiment = await ctx.db.experiments.update({
        where: { id },
        data: updateData,
        include: {
          samples: true,
          edges: true,
          instruments: true,
        },
      });

      return experiment;
    }),
});
