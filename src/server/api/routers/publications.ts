import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const publicationsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const publication = await ctx.db.publications.findUnique({
        where: { id: input.id },
        include: {
          experimentpublications: {
            include: {
              experiments: {
                include: {
                  samples: {
                    include: {
                      molecules: {
                        include: {
                          moleculesynonyms: {
                            orderBy: [{ synonym: "asc" }], // Sort by synonym
                            take: 1,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!publication) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Publication not found",
        });
      }

      return publication;
    }),

  getByDoi: publicProcedure
    .input(z.object({ doi: z.string() }))
    .query(async ({ ctx, input }) => {
      const publication = await ctx.db.publications.findUnique({
        where: { doi: input.doi },
        include: {
          experimentpublications: {
            include: {
              experiments: true,
            },
          },
        },
      });

      if (!publication) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Publication not found",
        });
      }

      return publication;
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        year: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        year?: number;
      } = {};

      if (input.year) {
        where.year = input.year;
      }

      const publications = await ctx.db.publications.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          year: "desc",
        },
      });

      let nextCursor: string | undefined = undefined;
      if (publications.length > input.limit) {
        const nextItem = publications.pop();
        nextCursor = nextItem?.id;
      }

      return {
        publications,
        nextCursor,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        doi: z.string().url(),
        title: z.string().min(1),
        journal: z.string().optional(),
        year: z.number().optional(),
        authors: z.record(z.any()).optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const publication = await ctx.db.publications.create({
        data: input,
      });

      return publication;
    }),
});
