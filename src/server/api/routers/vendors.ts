import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const vendorsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const vendors = await ctx.db.vendors.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          name: "asc",
        },
      });

      let nextCursor: string | undefined = undefined;
      if (vendors.length > input.limit) {
        const nextItem = vendors.pop();
        nextCursor = nextItem?.id;
      }

      return {
        vendors,
        nextCursor,
      };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const vendors = await ctx.db.vendors.findMany({
        where: {
          name: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        take: input.limit,
        orderBy: {
          name: "asc",
        },
      });

      return { vendors };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vendor = await ctx.db.vendors.findUnique({
        where: { id: input.id },
        include: {
          samples: {
            take: 10, // Limit samples for performance
            include: {
              molecules: {
                include: {
                  moleculesynonyms: {
                    where: { order: 0 },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!vendor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vendor not found",
        });
      }

      return vendor;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Vendor name is required"),
        url: z.string().url().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if vendor already exists
      const existing = await ctx.db.vendors.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        return existing;
      }

      // Create new vendor
      const vendor = await ctx.db.vendors.create({
        data: {
          name: input.name.trim(),
          url: input.url?.trim() || null,
        },
      });

      return vendor;
    }),

  createOrGet: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Vendor name is required"),
        url: z.string().url().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Try to find existing vendor first
      const existing = await ctx.db.vendors.findUnique({
        where: { name: input.name.trim() },
      });

      if (existing) {
        return existing;
      }

      // Create new vendor if it doesn't exist
      const vendor = await ctx.db.vendors.create({
        data: {
          name: input.name.trim(),
          url: input.url?.trim() || null,
        },
      });

      return vendor;
    }),
});
