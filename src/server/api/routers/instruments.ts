import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const instrumentsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const instrument = await ctx.db.instruments.findUnique({
        where: { id: input.id },
        include: {
          facilities: true,
          vendors: true,
          experiments: {
            take: 10,
            orderBy: {
              createdat: "desc",
            },
          },
        },
      });

      if (!instrument) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instrument not found",
        });
      }

      return instrument;
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
        facilityId: z.string().uuid().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        facilityid?: string;
        status?: string;
      } = {};

      if (input.facilityId) {
        where.facilityid = input.facilityId;
      }
      if (input.status) {
        where.status = input.status;
      }

      const instruments = await ctx.db.instruments.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          facilities: true,
          vendors: true,
        },
        orderBy: {
          id: "asc",
        },
      });

      let nextCursor: string | undefined = undefined;
      if (instruments.length > input.limit) {
        const nextItem = instruments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        instruments,
        nextCursor,
      };
    }),

  getFacilities: publicProcedure.query(async ({ ctx }) => {
    const facilities = await ctx.db.facilities.findMany({
      include: {
        instruments: {
          where: {
            status: "active",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return facilities;
  }),
});
