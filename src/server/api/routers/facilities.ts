import { z } from "zod";
import { Prisma } from "~/prisma/client";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const facilitiesListInclude = {
  instruments: {
    where: { status: "active" as const },
  },
  _count: {
    select: { instruments: true },
  },
} as const;

export const facilitiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Facility name is required"),
        city: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        facilityType: z.enum(["SYNCHROTRON", "FREE_ELECTRON_LASER", "LAB_SOURCE"]),
        instruments: z.array(
          z.object({
            name: z.string().min(1, "Instrument name is required"),
            link: z.string().url().optional().nullable(),
            status: z.enum(["active", "inactive", "under_maintenance"]).default("active"),
          }),
        ).optional().default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if facility already exists (by name, city, country combination)
      const existing = await ctx.db.facilities.findFirst({
        where: {
          name: input.name,
          city: input.city ?? null,
          country: input.country ?? null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A facility with this name and location already exists",
        });
      }

      // Create facility first
      const facility = await ctx.db.facilities.create({
        data: {
          name: input.name,
          city: input.city ?? null,
          country: input.country ?? null,
          facilitytype: input.facilityType,
        },
      });

      // Create instruments with proper IDs
      if (input.instruments.length > 0) {
        const instrumentsToCreate = input.instruments.map((inst) => {
          const sanitizedName = inst.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
          const instrumentId = `${facility.id}_${sanitizedName}`;
          return {
            id: instrumentId,
            name: inst.name,
            link: inst.link ?? null,
            status: inst.status,
            facilityid: facility.id,
          };
        });

        await ctx.db.instruments.createMany({
          data: instrumentsToCreate,
        });
      }

      // Return facility with instruments
      const facilityWithInstruments = await ctx.db.facilities.findUnique({
        where: { id: facility.id },
        include: {
          instruments: true,
        },
      });

      return facilityWithInstruments ?? facility;
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const like = `%${input.query}%`;
      const idRows = await ctx.db.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM facilities
          WHERE name ILIKE ${like}
             OR city ILIKE ${like}
             OR country ILIKE ${like}
          ORDER BY name ASC
          LIMIT ${input.limit}
        `,
      );
      const idList = idRows.map((r) => r.id);
      if (idList.length === 0) {
        return { facilities: [] };
      }
      const unordered = await ctx.db.facilities.findMany({
        where: { id: { in: idList } },
        include: {
          instruments: {
            where: {
              status: "active",
            },
          },
        },
      });
      const byId = new Map(unordered.map((f) => [f.id, f]));
      const facilities = idList
        .map((id) => byId.get(id))
        .filter((f): f is NonNullable<typeof f> => f != null);
      return { facilities };
    }),

  checkExists: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        city: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const facility = await ctx.db.facilities.findFirst({
        where: {
          name: input.name,
          city: input.city ?? null,
          country: input.country ?? null,
        },
        include: {
          instruments: true,
        },
      });

      return { exists: !!facility, facility: facility ?? null };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const facility = await ctx.db.facilities.findUnique({
        where: { id: input.id },
        include: {
          instruments: {
            orderBy: {
              name: "asc",
            },
          },
          _count: {
            select: {
              instruments: true,
            },
          },
        },
      });

      if (!facility) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }

      return facility;
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(12),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [facilities, totalCount] = await Promise.all([
        ctx.db.facilities.findMany({
          take: input.limit,
          skip: input.offset,
          orderBy: { name: "asc" },
          include: facilitiesListInclude,
        }),
        ctx.db.facilities.count(),
      ]);

      return {
        facilities,
        total: totalCount,
        hasMore: input.offset + facilities.length < totalCount,
      };
    }),

  getInstruments: publicProcedure
    .input(z.object({ facilityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const instruments = await ctx.db.instruments.findMany({
        where: {
          facilityid: input.facilityId,
        },
        orderBy: {
          name: "asc",
        },
      });

      return { instruments };
    }),

  checkInstrumentExists: publicProcedure
    .input(
      z.object({
        facilityId: z.string().uuid(),
        instrumentName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const instrument = await ctx.db.instruments.findFirst({
        where: {
          facilityid: input.facilityId,
          name: input.instrumentName,
        },
      });

      return { exists: !!instrument, instrument: instrument ?? null };
    }),
});
