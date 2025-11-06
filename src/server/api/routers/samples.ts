import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const samplesRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sample = await ctx.db.samples.findUnique({
        where: { id: input.id },
        include: {
          molecules: {
            include: {
              moleculesynonyms: {
                orderBy: [{ primary: "desc" }, { synonym: "asc" }], // Primary first
              },
            },
          },
          experiments: {
            include: {
              edges: true,
              instruments: true,
            },
            orderBy: {
              createdat: "desc",
            },
          },
        },
      });

      if (!sample) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sample not found",
        });
      }

      return sample;
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        moleculeId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        moleculeid?: string;
      } = {};

      if (input.moleculeId) {
        where.moleculeid = input.moleculeId;
      }

      const samples = await ctx.db.samples.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          molecules: {
            include: {
              moleculesynonyms: {
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdat: "desc",
        },
      });

      let nextCursor: string | undefined = undefined;
      if (samples.length > input.limit) {
        const nextItem = samples.pop();
        nextCursor = nextItem?.id;
      }

      return {
        samples,
        nextCursor,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        moleculeid: z.string().uuid(),
        identifier: z.string().min(1),
        description: z.record(z.any()).optional(),
        preparationdate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sample = await ctx.db.samples.create({
        data: input,
        include: {
          molecules: {
            include: {
              moleculesynonyms: {
                orderBy: [{ primary: "desc" }, { synonym: "asc" }], // Primary first
              },
            },
          },
        },
      });

      return sample;
    }),
});
