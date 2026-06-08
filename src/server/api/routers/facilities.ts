import { z } from "zod";
import { Prisma, type PrismaClient } from "~/prisma/client";
import {
  slugifyFacilityName,
} from "~/lib/facility-slug";
import {
  facilityWebsiteUrlInputSchema,
  parseFacilityWebsiteUrlInput,
} from "~/lib/facility-website-url";
import {
  contributeWriteProcedure,
  createTRPCRouter,
  manageUsersProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { resolveFacilityFaviconUrl } from "~/server/utils/resolve-facility-favicon";

const facilitiesListInclude = {
  instruments: {
    where: { status: "active" as const },
  },
  _count: {
    select: { instruments: true },
  },
} as const;

const facilityDetailInclude = {
  instruments: {
    orderBy: {
      name: "asc" as const,
    },
  },
  _count: {
    select: {
      instruments: true,
    },
  },
} as const;

async function findFacilityBySlug(db: PrismaClient, slug: string) {
  const normalizedSlug = slugifyFacilityName(slug);
  const facilities = await db.facilities.findMany({
    include: facilityDetailInclude,
  });
  const matches = facilities.filter(
    (facility) => slugifyFacilityName(facility.name) === normalizedSlug,
  );

  if (matches.length === 0) {
    return null;
  }

  return matches[0] ?? null;
}

export const facilitiesRouter = createTRPCRouter({
  create: contributeWriteProcedure
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
        include: facilityDetailInclude,
      });

      if (!facility) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }

      return facility;
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const facility = await findFacilityBySlug(ctx.db, input.slug);

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

  /**
   * Updates the public homepage URL for a facility and refreshes the cached favicon URL.
   * Requires user-administration permission; favicon discovery runs server-side with SSRF filtering.
   */
  updateWebsite: manageUsersProcedure
    .input(
      z.object({
        facilityId: z.string().uuid(),
        websiteUrl: facilityWebsiteUrlInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const facility = await ctx.db.facilities.findUnique({
        where: { id: input.facilityId },
        select: { id: true },
      });
      if (!facility) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facility not found",
        });
      }

      const websiteUrl = parseFacilityWebsiteUrlInput(input.websiteUrl);
      let faviconUrl: string | null = null;
      if (websiteUrl) {
        try {
          faviconUrl = await resolveFacilityFaviconUrl(websiteUrl);
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Website URL is not reachable or not allowed.",
          });
        }
      }

      return ctx.db.facilities.update({
        where: { id: input.facilityId },
        data: {
          websiteurl: websiteUrl,
          faviconurl: faviconUrl,
        },
        include: facilityDetailInclude,
      });
    }),
});
