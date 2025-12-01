import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const instrumentsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const instrument = await ctx.db.instruments.findUnique({
        where: { id: input.id },
        include: {
          facilities: true,
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

  create: protectedProcedure
    .input(
      z.object({
        facilityId: z.string().uuid(),
        name: z.string().min(1, "Instrument name is required"),
        link: z.string().url().optional().nullable(),
        status: z.enum(["active", "inactive", "under_maintenance"]).default("active"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if facility exists
      const facility = await ctx.db.facilities.findUnique({
        where: { id: input.facilityId },
      });

      if (!facility) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }

      // Check if instrument with same name already exists at this facility
      const existing = await ctx.db.instruments.findFirst({
        where: {
          facilityid: input.facilityId,
          name: input.name,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An instrument with this name already exists at this facility",
        });
      }

      // Generate ID: facilityId_name (sanitized)
      const sanitizedName = input.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const instrumentId = `${input.facilityId}_${sanitizedName}`;

      const instrument = await ctx.db.instruments.create({
        data: {
          id: instrumentId,
          name: input.name,
          facilityid: input.facilityId,
          link: input.link ?? null,
          status: input.status,
        },
        include: {
          facilities: true,
        },
      });

      return instrument;
    }),

  checkExists: publicProcedure
    .input(
      z.object({
        facilityId: z.string().uuid(),
        name: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const instrument = await ctx.db.instruments.findFirst({
        where: {
          facilityid: input.facilityId,
          name: input.name,
        },
      });

      return { exists: !!instrument, instrument: instrument ?? null };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        facilityId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        name?: { contains: string; mode: "insensitive" };
        facilityid?: string;
      } = {
        name: {
          contains: input.query,
          mode: "insensitive",
        },
      };

      if (input.facilityId) {
        where.facilityid = input.facilityId;
      }

      const instruments = await ctx.db.instruments.findMany({
        where,
        take: 10,
        include: {
          facilities: true,
        },
      });

      return { instruments };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        link: z.string().url().optional().nullable(),
        status: z.enum(["active", "inactive", "under_maintenance"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const instrument = await ctx.db.instruments.findUnique({
        where: { id },
      });

      if (!instrument) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instrument not found",
        });
      }

      const updated = await ctx.db.instruments.update({
        where: { id },
        data: updateData,
        include: {
          facilities: true,
        },
      });

      return updated;
    }),
});
