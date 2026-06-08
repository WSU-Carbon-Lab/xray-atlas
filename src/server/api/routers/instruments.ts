import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  DASHBOARD_CONNECTORS_DEFAULT_PAGE_SIZE,
  listDashboardConnectorsFromDb,
} from "~/features/dashboard/connectors/resolve-dashboard-connectors";
import { orcidUserIdSchema } from "~/lib/orcid";
import {
  instrumentStewardPublicSelect,
  toInstrumentStewardPublic,
} from "~/server/instruments/instrument-steward-dto";
import { assertUserMayManageInstrumentStewards } from "~/server/instruments/instrument-steward-authz";

const instrumentStewardPublicSchema = z.object({
  instrumentId: z.string(),
  userId: orcidUserIdSchema,
  name: z.string().nullable(),
  image: z.string().nullable(),
  assignedAt: z.string().datetime(),
  claimIssueUrl: z.string().nullable(),
  notes: z.string().nullable(),
});

export const instrumentsRouter = createTRPCRouter({
  /**
   * Lists dashboard instrument workspace cards by matching persisted instruments to
   * connector bindings (labels and facilities from the database; readiness from overlay).
   */
  listDashboardConnectors: publicProcedure
    .input(
      z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(DASHBOARD_CONNECTORS_DEFAULT_PAGE_SIZE),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      return listDashboardConnectorsFromDb(ctx.db, {
        limit: input.limit,
        offset: input.offset,
      });
    }),

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
        limit: z.number().min(1).max(200).default(10),
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
        excludeInstrumentId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const instrument = await ctx.db.instruments.findFirst({
        where: {
          facilityid: input.facilityId,
          name: input.name,
          ...(input.excludeInstrumentId
            ? { id: { not: input.excludeInstrumentId } }
            : {}),
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
        name: z.string().min(1).optional(),
        link: z.union([z.string().url(), z.literal("")]).optional().nullable(),
        status: z.enum(["active", "inactive", "under_maintenance"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, link, status } = input;

      const instrument = await ctx.db.instruments.findUnique({
        where: { id },
      });

      if (!instrument) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instrument not found",
        });
      }

      if (name !== undefined && name !== instrument.name) {
        const duplicate = await ctx.db.instruments.findFirst({
          where: {
            facilityid: instrument.facilityid,
            name,
            id: { not: id },
          },
        });
        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An instrument with this name already exists at this facility",
          });
        }
      }

      const data: { name?: string; link?: string | null; status?: string } = {};
      if (name !== undefined) data.name = name;
      if (link !== undefined) data.link = link === "" ? null : link;
      if (status !== undefined) data.status = status;

      if (Object.keys(data).length === 0) {
        return ctx.db.instruments.findUniqueOrThrow({
          where: { id },
          include: { facilities: true },
        });
      }

      const updated = await ctx.db.instruments.update({
        where: { id },
        data,
        include: {
          facilities: true,
        },
      });

      return updated;
    }),

  /**
   * Lists beamline scientist stewards for one instrument (empty when none are assigned).
   */
  listStewardsForInstrument: publicProcedure
    .input(z.object({ instrumentId: z.string().min(1) }))
    .output(z.array(instrumentStewardPublicSchema))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.instrumentsteward.findMany({
        where: { instrumentid: input.instrumentId },
        select: instrumentStewardPublicSelect,
        orderBy: { assignedat: "asc" },
      });
      return rows.map(toInstrumentStewardPublic);
    }),

  /**
   * Lists stewards for all instruments at a facility keyed by instrument id.
   */
  listStewardsForFacility: publicProcedure
    .input(z.object({ facilityId: z.string().uuid() }))
    .output(z.record(z.string(), z.array(instrumentStewardPublicSchema)))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.instrumentsteward.findMany({
        where: {
          instrument: {
            facilityid: input.facilityId,
          },
        },
        select: instrumentStewardPublicSelect,
        orderBy: { assignedat: "asc" },
      });
      const stewards: Record<
        string,
        z.infer<typeof instrumentStewardPublicSchema>[]
      > = {};
      for (const row of rows) {
        const dto = toInstrumentStewardPublic(row);
        const bucket = stewards[row.instrumentid] ?? [];
        bucket.push(dto);
        stewards[row.instrumentid] = bucket;
      }
      return stewards;
    }),

  /**
   * Adds a beamline scientist steward for an instrument when the caller is an administrator
   * or an existing steward on that instrument.
   */
  addSteward: protectedProcedure
    .input(
      z.object({
        instrumentId: z.string().min(1),
        userId: orcidUserIdSchema,
        claimIssueUrl: z.string().url().optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
      }),
    )
    .output(instrumentStewardPublicSchema)
    .mutation(async ({ ctx, input }) => {
      await assertUserMayManageInstrumentStewards(
        ctx.db,
        ctx.userId,
        input.instrumentId,
      );

      const instrument = await ctx.db.instruments.findUnique({
        where: { id: input.instrumentId },
        select: { id: true },
      });
      if (!instrument) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instrument not found",
        });
      }

      const stewardUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!stewardUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "That researcher must sign in to Atlas before they can be assigned as a beamline scientist.",
        });
      }

      const existing = await ctx.db.instrumentsteward.findUnique({
        where: {
          instrumentid_userid: {
            instrumentid: input.instrumentId,
            userid: input.userId,
          },
        },
        select: instrumentStewardPublicSelect,
      });
      if (existing) {
        return toInstrumentStewardPublic(existing);
      }

      const row = await ctx.db.instrumentsteward.create({
        data: {
          instrumentid: input.instrumentId,
          userid: input.userId,
          assignedbyuserid: ctx.userId,
          claimissueurl: input.claimIssueUrl ?? null,
          notes: input.notes ?? null,
        },
        select: instrumentStewardPublicSelect,
      });

      return toInstrumentStewardPublic(row);
    }),

  /**
   * Removes one beamline scientist steward from an instrument when the caller is an administrator
   * or an existing steward on that instrument.
   */
  removeSteward: protectedProcedure
    .input(
      z.object({
        instrumentId: z.string().min(1),
        userId: orcidUserIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserMayManageInstrumentStewards(
        ctx.db,
        ctx.userId,
        input.instrumentId,
      );

      const existing = await ctx.db.instrumentsteward.findUnique({
        where: {
          instrumentid_userid: {
            instrumentid: input.instrumentId,
            userid: input.userId,
          },
        },
        select: { instrumentid: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That beamline scientist is not assigned to this instrument",
        });
      }

      await ctx.db.instrumentsteward.delete({
        where: {
          instrumentid_userid: {
            instrumentid: input.instrumentId,
            userid: input.userId,
          },
        },
      });

      return { ok: true as const };
    }),
});
