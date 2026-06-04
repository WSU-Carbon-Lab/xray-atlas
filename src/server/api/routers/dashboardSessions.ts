import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ALS_5322_INSTRUMENT_SLUG,
  dashboardProcessingSessionStatusSchema,
  dashboardStepMetadataSchema,
  defaultDashboardSessionTitle,
  defaultDashboardStepMetadata,
  parseDashboardStepMetadata,
  type DashboardStepMetadata,
} from "~/lib/dashboard-processing-session";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  assertUserMayEditExperiment,
  userMayEditExperiment,
} from "~/server/nexafs/experimentEditAuthz";
import type { Prisma, PrismaClient } from "~/prisma/client";

const sessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

const createSessionInputSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  instrumentSlug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .default(ALS_5322_INSTRUMENT_SLUG),
});

const updateSessionInputSchema = sessionIdSchema.extend({
  title: z.string().trim().min(1).max(120).optional(),
  status: dashboardProcessingSessionStatusSchema.optional(),
  stepMetadata: dashboardStepMetadataSchema.optional(),
});

const linkExperimentInputSchema = sessionIdSchema.extend({
  experimentId: z.string().uuid(),
});

const searchExperimentsInputSchema = z.object({
  query: z.string().trim().max(120).default(""),
  limit: z.number().int().min(1).max(25).default(10),
});

export type DashboardLinkedExperimentDto = {
  id: string;
  canonicalSlug: string | null;
  instrumentName: string | null;
  moleculeLabel: string | null;
  browseHref: string;
  contributeHref: string;
};

export type DashboardProcessingSessionSummaryDto = {
  id: string;
  title: string | null;
  instrumentSlug: string;
  status: z.infer<typeof dashboardProcessingSessionStatusSchema>;
  stepMetadata: ReturnType<typeof parseDashboardStepMetadata>;
  linkedExperimentId: string | null;
  linkedExperiment: DashboardLinkedExperimentDto | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardLinkableExperimentDto = {
  id: string;
  canonicalSlug: string | null;
  instrumentName: string | null;
  moleculeLabel: string | null;
  updatedAt: string;
};

function stepMetadataToJson(
  value: DashboardStepMetadata,
): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function assertSessionOwner(
  db: PrismaClient,
  sessionId: string,
  userId: string,
): Promise<void> {
  const row = await db.dashboardprocessingsession.findUnique({
    where: { id: sessionId },
    select: { userid: true },
  });
  if (row?.userid !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
  }
}

async function mapLinkedExperiment(
  db: PrismaClient,
  experimentId: string | null,
): Promise<DashboardLinkedExperimentDto | null> {
  if (!experimentId) {
    return null;
  }
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      id: true,
      canonicalslug: true,
      instruments: { select: { name: true } },
      samples: {
        select: {
          molecules: {
            select: {
              moleculesynonyms: {
                orderBy: [{ order: "asc" }, { synonym: "asc" }],
                take: 1,
                select: { synonym: true },
              },
            },
          },
        },
      },
    },
  });
  if (!experiment) {
    return null;
  }
  const moleculeLabel =
    experiment.samples.molecules.moleculesynonyms[0]?.synonym ?? null;
  const slug = experiment.canonicalslug;
  const browseHref = slug
    ? `/browse/nexafs?nexafsExperiment=${experiment.id}`
    : `/browse/nexafs?nexafsExperiment=${experiment.id}`;
  return {
    id: experiment.id,
    canonicalSlug: slug,
    instrumentName: experiment.instruments.name,
    moleculeLabel,
    browseHref,
    contributeHref: `/contribute/nexafs?experiment=${experiment.id}`,
  };
}

async function mapSessionRow(
  db: PrismaClient,
  row: {
    id: string;
    title: string | null;
    instrumentslug: string;
    linkedexperimentid: string | null;
    status: string;
    stepmetadata: unknown;
    createdat: Date;
    updatedat: Date;
  },
): Promise<DashboardProcessingSessionSummaryDto> {
  return {
    id: row.id,
    title: row.title,
    instrumentSlug: row.instrumentslug,
    linkedExperimentId: row.linkedexperimentid,
    linkedExperiment: await mapLinkedExperiment(db, row.linkedexperimentid),
    status: dashboardProcessingSessionStatusSchema.parse(row.status),
    stepMetadata: parseDashboardStepMetadata(row.stepmetadata),
    createdAt: row.createdat,
    updatedAt: row.updatedat,
  };
}

export const dashboardSessionsRouter = createTRPCRouter({
  /** Lists processing sessions owned by the signed-in user, newest first. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.dashboardprocessingsession.findMany({
      where: { userid: ctx.userId },
      orderBy: { updatedat: "desc" },
    });
    return Promise.all(rows.map((row) => mapSessionRow(ctx.db, row)));
  }),

  getById: protectedProcedure
    .input(sessionIdSchema)
    .query(async ({ ctx, input }) => {
      await assertSessionOwner(ctx.db, input.sessionId, ctx.userId);
      const row = await ctx.db.dashboardprocessingsession.findUniqueOrThrow({
        where: { id: input.sessionId },
      });
      return mapSessionRow(ctx.db, row);
    }),

  create: protectedProcedure
    .input(createSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.dashboardprocessingsession.create({
        data: {
          userid: ctx.userId,
          instrumentslug: input.instrumentSlug,
          title: input.title ?? defaultDashboardSessionTitle(),
          status: "draft",
          stepmetadata: stepMetadataToJson(defaultDashboardStepMetadata()),
        },
      });
      return { id: row.id };
    }),

  update: protectedProcedure
    .input(updateSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertSessionOwner(ctx.db, input.sessionId, ctx.userId);
      const row = await ctx.db.dashboardprocessingsession.update({
        where: { id: input.sessionId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.stepMetadata !== undefined
            ? { stepmetadata: stepMetadataToJson(input.stepMetadata) }
            : {}),
        },
      });
      return mapSessionRow(ctx.db, row);
    }),

  delete: protectedProcedure
    .input(sessionIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertSessionOwner(ctx.db, input.sessionId, ctx.userId);
      await ctx.db.dashboardprocessingsession.delete({
        where: { id: input.sessionId },
      });
      return { ok: true as const };
    }),

  /** Lists experiments the session user may edit, optionally filtered by slug or molecule name. */
  searchLinkableExperiments: protectedProcedure
    .input(searchExperimentsInputSchema)
    .query(async ({ ctx, input }) => {
      const q = input.query.trim();
      const rows = await ctx.db.experiments.findMany({
        where: {
          ...(q
            ? {
                OR: [
                  { canonicalslug: { contains: q, mode: "insensitive" } },
                  {
                    samples: {
                      is: {
                        molecules: {
                          moleculesynonyms: {
                            some: {
                              synonym: { contains: q, mode: "insensitive" },
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { updatedat: "desc" },
        take: Math.min(input.limit * 4, 40),
        select: {
          id: true,
          canonicalslug: true,
          updatedat: true,
          createdby: true,
          instruments: { select: { name: true } },
          samples: {
            select: {
              molecules: {
                select: {
                  moleculesynonyms: {
                    orderBy: [{ order: "asc" }, { synonym: "asc" }],
                    take: 1,
                    select: { synonym: true },
                  },
                },
              },
            },
          },
        },
      });

      const allowed: DashboardLinkableExperimentDto[] = [];
      for (const row of rows) {
        if (allowed.length >= input.limit) {
          break;
        }
        const mayEdit = await userMayEditExperiment(ctx.db, ctx.userId, row.id);
        if (!mayEdit) {
          continue;
        }
        allowed.push({
          id: row.id,
          canonicalSlug: row.canonicalslug,
          instrumentName: row.instruments.name,
          moleculeLabel:
            row.samples.molecules.moleculesynonyms[0]?.synonym ?? null,
          updatedAt: row.updatedat.toISOString(),
        });
      }
      return allowed;
    }),

  linkExperiment: protectedProcedure
    .input(linkExperimentInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertSessionOwner(ctx.db, input.sessionId, ctx.userId);
      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );

      const existing = await ctx.db.dashboardprocessingsession.findUniqueOrThrow(
        {
          where: { id: input.sessionId },
          select: { stepmetadata: true },
        },
      );
      const metadata = parseDashboardStepMetadata(existing.stepmetadata);
      const nextMetadata: DashboardStepMetadata = {
        ...metadata,
        ingest: {
          scans: metadata.ingest?.scans ?? [],
          storageMode: "experiment_aux",
          activeScanId: metadata.ingest?.activeScanId ?? null,
        },
      };

      const row = await ctx.db.dashboardprocessingsession.update({
        where: { id: input.sessionId },
        data: {
          linkedexperimentid: input.experimentId,
          stepmetadata: stepMetadataToJson(nextMetadata),
          status: "processing",
        },
      });
      return mapSessionRow(ctx.db, row);
    }),

  unlinkExperiment: protectedProcedure
    .input(sessionIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertSessionOwner(ctx.db, input.sessionId, ctx.userId);
      const row = await ctx.db.dashboardprocessingsession.update({
        where: { id: input.sessionId },
        data: { linkedexperimentid: null, status: "draft" },
      });
      return mapSessionRow(ctx.db, row);
    }),
});
