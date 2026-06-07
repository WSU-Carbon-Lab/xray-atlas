import { z } from "zod";
import {
  adminProcedure,
  contributeWriteProcedure,
  createTRPCRouter,
  privilegedWriteProcedure,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { normalizeDoi } from "~/lib/doi";
import {
  lookupPublicationDoi as fetchPublicationDoiLookup,
  resolvePublicationDoi,
} from "~/server/nexafs/lookupPublicationDoi";
import {
  addExperimentSourcePublication,
  clearExperimentSourcePaperDoi,
  listExperimentSourcePublications,
  removeExperimentSourcePublication,
  syncExperimentSourcePaperDoi,
  syncExperimentSourcePublications,
} from "~/server/nexafs/syncExperimentSourcePaperDoi";
import type { PublicationCitation } from "~/lib/publication-citation";
import { dataCiteContributorTypeSchema } from "~/lib/datacite-contributor-types";
import { orcidUserIdSchema } from "~/lib/orcid";
import { TRPCError } from "@trpc/server";
import { Prisma, ExperimentType, ProcessMethod } from "~/prisma/client";
import { normalizeSampleSubstrate } from "~/lib/normalizeSampleSubstrate";
import {
  coalesceUploadedOrDerived,
  computeSpectrumDerivedScalarColumns,
} from "~/server/nexafs/computeSpectrumDerivedColumns";
import {
  buildChannelProvenance,
  buildQualityScores,
  buildValidationSummary,
  type NormalizationRanges,
  type NormalizationScope,
  type UploadedChannel,
} from "~/server/nexafs/normalizationMetadata";
import {
  fetchNexafsBrowseGrouped,
  type NexafsBrowseSortKey,
} from "~/server/nexafs/nexafsBrowseGroups";
import { findExperimentFavorite } from "~/server/db/engagement-queries";
import {
  buildKkDeltaMetadata,
  deriveKkDeltaSourceOnCreate,
  kkDeltaMetadataToJson,
  parseKkDeltaMetadata,
} from "~/server/nexafs/kkDeltaMetadata";
import { SPECTRUMPOINTS_SERVER_SCAN_CAP } from "~/server/nexafs/spectrumpointLimits";
import {
  buildAtlasTeamVerificationSummary,
  clearAtlasTeamVerificationSummary,
  isAtlasTeamVerifiedSummary,
  userMayManageAtlasTeamVerification,
  validationSummaryToPrismaJson,
} from "~/server/nexafs/atlasTeamVerification";

const nexafsBrowseSortBySchema = z
  .enum([
    "quality",
    "favorites",
    "views",
    "geometries",
    "publications",
    "comments",
    "name",
    "newest",
  ])
  .default("quality")
  .transform(
    (v): NexafsBrowseSortKey => (v === "comments" ? "publications" : v),
  );

const nexafsVerificationSourceSchema = z
  .enum(["either", "publication", "atlas"])
  .default("either");

const sourcePaperDoiInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .transform((value, ctx) => {
    const normalized = normalizeDoi(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid DOI",
      });
      return z.NEVER;
    }
    return normalized;
  });

const publicationCitationOutputSchema = z.object({
  doi: z.string(),
  title: z.string(),
  journal: z.string().nullable(),
  year: z.number().nullable(),
  authors: z.array(z.string()),
});

function mapPublicationCitationToOutput(citation: PublicationCitation) {
  return publicationCitationOutputSchema.parse(citation);
}
import { hasPrivilegedRole } from "~/server/auth/privileged-role";
import {
  userMayDeleteExperiment,
  userMayTransferExperimentOwnership,
} from "~/server/nexafs/experimentManageAuthz";
import {
  assertValidCreateAttributions,
  buildContributorInsertRows,
  ensureUploaderOwnerAttribution,
  mergeContributorRowsWithExistingClaimState,
  resolveKnownCollectorUserIds,
  mapContributorRowsToDto,
  normalizeAttributionInputs,
  type ExperimentAttributionInput,
} from "~/server/nexafs/experimentAttributions";
import { contributorFlagsForClaimStatus } from "~/lib/dataset-attribution-claim";
import {
  assertUserMayEditExperiment,
  userMayEditExperiment,
} from "~/server/nexafs/experimentEditAuthz";

const experimentAttributionRoleSchema = z.union([
  dataCiteContributorTypeSchema,
  z.literal("owner"),
  z.literal("collector"),
]);

const emptyDerivedScalars = (): {
  od: Array<number | null>;
  massabsorption: Array<number | null>;
  beta: Array<number | null>;
} => ({ od: [], massabsorption: [], beta: [] });

const experimentCommentInputSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

const contributionBatchExperimentIdsSchema = z
  .array(z.string().uuid())
  .min(1)
  .max(200)
  .transform((ids) => [...new Set(ids)]);

const unifiedNormalizationRangesSchema = z.object({
  pre: z.tuple([z.number(), z.number()]).nullable(),
  post: z.tuple([z.number(), z.number()]).nullable(),
});

const perChannelNormalizationRangesSchema = z.object({
  od: unifiedNormalizationRangesSchema,
  massabsorption: unifiedNormalizationRangesSchema,
  beta: unifiedNormalizationRangesSchema,
});

const normalizationRangesInputSchema = z.union([
  unifiedNormalizationRangesSchema,
  perChannelNormalizationRangesSchema,
]);

const normalizationSchema = z.object({
  scope: z.enum(["none", "unified", "per_channel"]),
  ranges: normalizationRangesInputSchema.nullable(),
});

type ExperimentQualityComment = {
  id: string;
  userId: string;
  userName: string | null;
  text: string;
  createdAt: string;
};

function spectrumRowsHaveUploadedDerivedScalars(
  points: ReadonlyArray<{
    od?: number;
    massabsorption?: number;
    beta?: number;
  }>,
): boolean {
  if (points.length === 0) return false;
  return points.every(
    (p) =>
      typeof p.od === "number" &&
      Number.isFinite(p.od) &&
      typeof p.massabsorption === "number" &&
      Number.isFinite(p.massabsorption) &&
      typeof p.beta === "number" &&
      Number.isFinite(p.beta),
  );
}

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
                    orderBy: [{ order: "asc" }, { synonym: "asc" }],
                  },
                },
              },
            },
          },
          edges: true,
          instruments: {
            include: {
              facilities: true,
            },
          },
          polarizations: true,
          calibrationmethods: true,
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

  moleculeFormulaForExperiment: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: {
          createdby: true,
          normalizationscope: true,
          normalizationranges: true,
          uploadedchannels: true,
          kkdeltametadata: true,
          samples: {
            select: {
              id: true,
              molecules: { select: { chemicalformula: true } },
            },
          },
        },
      });
      const raw =
        row?.samples?.molecules?.chemicalformula?.trim() ?? "";
      const userId = ctx.userId;
      const canEditNormalizationMetadata =
        Boolean(userId && row?.createdby && row.createdby === userId) ||
        (Boolean(userId) && (await hasPrivilegedRole(ctx.db, userId)));
      return {
        sampleId: row?.samples?.id ?? null,
        chemicalFormula: raw.length > 0 ? raw : null,
        normalizationScope: row?.normalizationscope ?? null,
        normalizationRanges: row?.normalizationranges ?? null,
        uploadedChannels: row?.uploadedchannels ?? null,
        kkDeltaMetadata: parseKkDeltaMetadata(row?.kkdeltametadata),
        canEditNormalizationMetadata,
      };
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        sampleId: z.string().uuid().optional(),
        edgeId: z.string().uuid().optional(),
        instrumentId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        sampleid?: string;
        edgeid?: string;
        instrumentid?: string;
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
                    orderBy: [{ order: "asc" }],
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

  browseMoleculeOptions: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const base: Prisma.moleculesWhereInput = {
        samples: {
          some: {
            experiments: {
              some: {},
            },
          },
        },
      };
      const q = input.query?.trim();
      const where: Prisma.moleculesWhereInput = q
        ? {
            AND: [
              base,
              {
                OR: [
                  { iupacname: { contains: q, mode: "insensitive" } },
                  { chemicalformula: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          }
        : base;

      return ctx.db.molecules.findMany({
        where,
        select: {
          id: true,
          iupacname: true,
          chemicalformula: true,
        },
        orderBy: { iupacname: "asc" },
        take: input.limit,
      });
    }),

  browseMoleculeSummary: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.molecules.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          iupacname: true,
          chemicalformula: true,
        },
      });
    }),

  browseList: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(12),
        offset: z.number().min(0).default(0),
        sortBy: nexafsBrowseSortBySchema,
        moleculeId: z.string().uuid().optional(),
        edgeId: z.string().uuid().optional(),
        instrumentId: z.string().optional(),
        moleculeIds: z.array(z.string().uuid()).optional(),
        edgeIds: z.array(z.string().uuid()).optional(),
        instrumentIds: z.array(z.string()).optional(),
        contributorOrcids: z.array(z.string()).optional(),
        experimentType: z.nativeEnum(ExperimentType).optional(),
        verifiedOnly: z.boolean().default(false),
        verificationSource: nexafsVerificationSourceSchema,
        sourcePaperDoi: sourcePaperDoiInputSchema.optional(),
        experimentIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { groups, total } = await fetchNexafsBrowseGrouped(ctx.db, {
        viewerUserId: ctx.userId,
        filters: {
          moleculeId: input.moleculeId,
          edgeId: input.edgeId,
          instrumentId: input.instrumentId,
          moleculeIds: input.moleculeIds,
          edgeIds: input.edgeIds,
          instrumentIds: input.instrumentIds,
          contributorOrcids: input.contributorOrcids,
          experimentType: input.experimentType,
          verifiedOnly: input.verifiedOnly,
          verificationSource: input.verificationSource,
          sourcePaperDoi: input.sourcePaperDoi,
          experimentIds: input.experimentIds,
        },
        searchQuery: null,
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        groups,
        total,
        hasMore: input.offset + groups.length < total,
      };
    }),

  listFavoriteExperimentIds: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return { experimentIds: [] as string[] };
    }
    const rows = await ctx.db.experimentfavorites.findMany({
      where: { userid: ctx.userId },
      select: { experimentid: true },
      orderBy: { createdat: "desc" },
    });
    return { experimentIds: rows.map((row) => row.experimentid) };
  }),

  browseSearch: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
        sortBy: nexafsBrowseSortBySchema,
        moleculeId: z.string().uuid().optional(),
        edgeId: z.string().uuid().optional(),
        instrumentId: z.string().optional(),
        moleculeIds: z.array(z.string().uuid()).optional(),
        edgeIds: z.array(z.string().uuid()).optional(),
        instrumentIds: z.array(z.string()).optional(),
        contributorOrcids: z.array(z.string()).optional(),
        experimentType: z.nativeEnum(ExperimentType).optional(),
        verifiedOnly: z.boolean().default(false),
        verificationSource: nexafsVerificationSourceSchema,
        sourcePaperDoi: sourcePaperDoiInputSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { groups, total } = await fetchNexafsBrowseGrouped(ctx.db, {
        viewerUserId: ctx.userId,
        filters: {
          moleculeId: input.moleculeId,
          edgeId: input.edgeId,
          instrumentId: input.instrumentId,
          moleculeIds: input.moleculeIds,
          edgeIds: input.edgeIds,
          instrumentIds: input.instrumentIds,
          contributorOrcids: input.contributorOrcids,
          experimentType: input.experimentType,
          verifiedOnly: input.verifiedOnly,
          verificationSource: input.verificationSource,
          sourcePaperDoi: input.sourcePaperDoi,
        },
        searchQuery: input.query.trim(),
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
      });

      return { groups, total };
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
                        orderBy: [{ order: "asc" }],
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

  toggleFavorite: protectedProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      const existing = await findExperimentFavorite(
        ctx.db,
        input.experimentId,
        ctx.userId,
      );

      if (existing) {
        await ctx.db.$transaction(async (tx) => {
          await tx.experimentfavorites.delete({ where: { id: existing.id } });
          await tx.experimentquality.upsert({
            where: { experimentid: input.experimentId },
            create: { experimentid: input.experimentId, favorites: 0 },
            update: {
              favorites: {
                decrement: 1,
              },
            },
          });
          await tx.$executeRaw`
            UPDATE experimentquality
            SET favorites = GREATEST(favorites, 0)
            WHERE experimentid = ${input.experimentId}::uuid
          `;
        });
        const quality = await ctx.db.experimentquality.findUnique({
          where: { experimentid: input.experimentId },
          select: { favorites: true },
        });
        return { favorited: false, favoriteCount: quality?.favorites ?? 0 };
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.experimentfavorites.create({
          data: {
            experimentid: input.experimentId,
            userid: ctx.userId,
          },
        });
        await tx.experimentquality.upsert({
          where: { experimentid: input.experimentId },
          create: { experimentid: input.experimentId, favorites: 1 },
          update: {
            favorites: {
              increment: 1,
            },
          },
        });
      });

      const quality = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: { favorites: true },
      });
      return { favorited: true, favoriteCount: quality?.favorites ?? 1 };
    }),

  getQuality: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const quality = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: {
          favorites: true,
          comments: true,
        },
      });
      const comments = Array.isArray(quality?.comments)
        ? (quality.comments as ExperimentQualityComment[])
        : [];
      return {
        favorites: quality?.favorites ?? 0,
        comments,
      };
    }),

  addQualityComment: protectedProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        comment: experimentCommentInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const author = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: { name: true },
      });
      const existing = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: { comments: true, favorites: true },
      });
      const currentComments = Array.isArray(existing?.comments)
        ? (existing.comments as ExperimentQualityComment[])
        : [];
      const nextComment: ExperimentQualityComment = {
        id: crypto.randomUUID(),
        userId: ctx.userId,
        userName: author?.name ?? null,
        text: input.comment.text,
        createdAt: new Date().toISOString(),
      };
      const comments = [...currentComments, nextComment];
      await ctx.db.experimentquality.upsert({
        where: { experimentid: input.experimentId },
        create: {
          experimentid: input.experimentId,
          favorites: existing?.favorites ?? 0,
          comments,
        },
        update: {
          comments,
        },
      });
      return { comments };
    }),

  removeQualityComment: protectedProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        commentId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.experimentquality.findUnique({
        where: { experimentid: input.experimentId },
        select: { comments: true },
      });
      const currentComments = Array.isArray(existing?.comments)
        ? (existing.comments as ExperimentQualityComment[])
        : [];
      const target = currentComments.find(
        (comment) => comment.id === input.commentId,
      );
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }
      const isAuthor = target.userId === ctx.userId;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!isAuthor && !isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to remove this comment",
        });
      }
      const comments = currentComments.filter(
        (comment) => comment.id !== input.commentId,
      );
      await ctx.db.experimentquality.update({
        where: { experimentid: input.experimentId },
        data: { comments },
      });
      return { comments };
    }),

  /**
   * Returns the top-N most-measured values for each facet dimension, ordered
   * by experiment count descending. Used to populate the popularity panel in
   * the unified search bar dropdown.
   *
   * All counts reflect total experiments in the catalog with no active filters.
   * Results are capped at 30 per facet to keep the payload small.
   */
  facetCounts: publicProcedure.query(async ({ ctx }) => {
    type EdgeRow = { id: string; targetatom: string; corestate: string; count: bigint };
    type InstrumentRow = { id: string; name: string; facility_name: string | null; count: bigint };
    type MolRow = { id: string; name: string; count: bigint };
    type ContributorRow = { orcid_id: string; name: string | null; count: bigint };

    const [edgeRows, instRows, molRows, contRows] = await Promise.all([
      ctx.db.$queryRaw<EdgeRow[]>`
        SELECT ed.id, ed.targetatom, ed.corestate, COUNT(e.id)::bigint AS count
        FROM edges ed
        INNER JOIN experiments e ON e.edgeid = ed.id
        GROUP BY ed.id, ed.targetatom, ed.corestate
        ORDER BY count DESC, ed.targetatom ASC, ed.corestate ASC
        LIMIT 30
      `,
      ctx.db.$queryRaw<InstrumentRow[]>`
        SELECT i.id, i.name, f.name AS facility_name, COUNT(e.id)::bigint AS count
        FROM instruments i
        INNER JOIN experiments e ON e.instrumentid = i.id
        LEFT JOIN facilities f ON f.id = i.facilityid
        GROUP BY i.id, i.name, f.name
        ORDER BY count DESC, i.name ASC
        LIMIT 30
      `,
      ctx.db.$queryRaw<MolRow[]>`
        SELECT m.id, COALESCE(ms.synonym, m.iupacname) AS name, COUNT(e.id)::bigint AS count
        FROM molecules m
        INNER JOIN samples s ON s.moleculeid = m.id
        INNER JOIN experiments e ON e.sampleid = s.id
        LEFT JOIN LATERAL (
          SELECT ms2.synonym FROM moleculesynonyms ms2
          WHERE ms2.moleculeid = m.id
          ORDER BY ms2."order" ASC NULLS LAST, ms2.synonym ASC
          LIMIT 1
        ) ms ON TRUE
        GROUP BY m.id, m.iupacname, ms.synonym
        ORDER BY count DESC, name ASC
        LIMIT 30
      `,
      ctx.db.$queryRaw<ContributorRow[]>`
        SELECT
          ec.orcid_id,
          CASE
            WHEN u.name IS NOT NULL AND ec.claim_status = 'accepted' AND ec.is_public_profile_visible
              THEN u.name
            ELSE ec.orcid_id
          END AS name,
          COUNT(DISTINCT ec.experiment_id)::bigint AS count
        FROM experiment_contributors ec
        LEFT JOIN next_auth."user" u ON u.id = ec.user_id
        WHERE ec.claim_status NOT IN ('declined', 'unclaimed')
        GROUP BY ec.orcid_id, u.name, ec.claim_status, ec.is_public_profile_visible
        ORDER BY count DESC
        LIMIT 30
      `,
    ]);

    return {
      edges: edgeRows.map((r) => ({
        id: r.id,
        label: `${r.targetatom} ${r.corestate}`,
        count: Number(r.count),
      })),
      instruments: instRows.map((r) => ({
        id: r.id,
        label: r.facility_name ? `${r.name} (${r.facility_name})` : r.name,
        count: Number(r.count),
      })),
      molecules: molRows.map((r) => ({
        id: r.id,
        label: r.name,
        count: Number(r.count),
      })),
      contributors: contRows.map((r) => ({
        id: r.orcid_id,
        label: r.name ?? r.orcid_id,
        count: Number(r.count),
      })),
    };
  }),

  /**
   * Returns grouped typeahead matches across all four facet dimensions for a
   * given free-text query. Used to populate the unified search bar dropdown as
   * the user types.
   *
   * Matches molecule names and synonyms, edge by `targetatom`+`corestate`,
   * instrument by name and facility name, and contributor by display name or
   * ORCID iD. Each group is capped at `limitPerGroup` (default 5).
   *
   * @param input.query - Non-empty search string.
   * @param input.limitPerGroup - Maximum matches per facet group (1-20, default 5).
   */
  searchEntities: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limitPerGroup: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const pattern = `%${input.query.trim()}%`;
      const lim = input.limitPerGroup;

      type EdgeRow = { id: string; targetatom: string; corestate: string; count: bigint };
      type InstrumentRow = { id: string; name: string; facility_name: string | null; count: bigint };
      type MolRow = { id: string; name: string; count: bigint };
      type ContributorRow = { orcid_id: string; name: string | null; count: bigint };

      const [edgeRows, instRows, molRows, contRows] = await Promise.all([
        ctx.db.$queryRaw<EdgeRow[]>`
          SELECT ed.id, ed.targetatom, ed.corestate, COUNT(e.id)::bigint AS count
          FROM edges ed
          LEFT JOIN experiments e ON e.edgeid = ed.id
          WHERE ed.targetatom ILIKE ${pattern}
            OR ed.corestate ILIKE ${pattern}
            OR (ed.targetatom || ' ' || ed.corestate) ILIKE ${pattern}
          GROUP BY ed.id, ed.targetatom, ed.corestate
          ORDER BY count DESC, ed.targetatom ASC
          LIMIT ${lim}
        `,
        ctx.db.$queryRaw<InstrumentRow[]>`
          SELECT i.id, i.name, f.name AS facility_name, COUNT(e.id)::bigint AS count
          FROM instruments i
          LEFT JOIN facilities f ON f.id = i.facilityid
          LEFT JOIN experiments e ON e.instrumentid = i.id
          WHERE i.name ILIKE ${pattern} OR COALESCE(f.name, '') ILIKE ${pattern}
          GROUP BY i.id, i.name, f.name
          ORDER BY count DESC, i.name ASC
          LIMIT ${lim}
        `,
        ctx.db.$queryRaw<MolRow[]>`
          SELECT m.id, COALESCE(ms.synonym, m.iupacname) AS name, COUNT(e.id)::bigint AS count
          FROM molecules m
          INNER JOIN samples s ON s.moleculeid = m.id
          LEFT JOIN experiments e ON e.sampleid = s.id
          LEFT JOIN LATERAL (
            SELECT ms2.synonym FROM moleculesynonyms ms2
            WHERE ms2.moleculeid = m.id
            ORDER BY ms2."order" ASC NULLS LAST, ms2.synonym ASC
            LIMIT 1
          ) ms ON TRUE
          WHERE m.iupacname ILIKE ${pattern}
            OR m.chemicalformula ILIKE ${pattern}
            OR EXISTS (
              SELECT 1 FROM moleculesynonyms ms3
              WHERE ms3.moleculeid = m.id AND ms3.synonym ILIKE ${pattern}
            )
          GROUP BY m.id, m.iupacname, ms.synonym
          ORDER BY count DESC, name ASC
          LIMIT ${lim}
        `,
        ctx.db.$queryRaw<ContributorRow[]>`
          SELECT
            ec.orcid_id,
            CASE
              WHEN u.name IS NOT NULL AND ec.claim_status = 'accepted' AND ec.is_public_profile_visible
                THEN u.name
              ELSE ec.orcid_id
            END AS name,
            COUNT(DISTINCT ec.experiment_id)::bigint AS count
          FROM experiment_contributors ec
          LEFT JOIN next_auth."user" u ON u.id = ec.user_id
          WHERE ec.claim_status NOT IN ('declined', 'unclaimed')
            AND (
              ec.orcid_id ILIKE ${pattern}
              OR (
                u.name IS NOT NULL
                AND ec.claim_status = 'accepted'
                AND ec.is_public_profile_visible
                AND u.name ILIKE ${pattern}
              )
            )
          GROUP BY ec.orcid_id, u.name, ec.claim_status, ec.is_public_profile_visible
          ORDER BY count DESC
          LIMIT ${lim}
        `,
      ]);

      return {
        edges: edgeRows.map((r) => ({
          id: r.id,
          label: `${r.targetatom} ${r.corestate}`,
          count: Number(r.count),
        })),
        instruments: instRows.map((r) => ({
          id: r.id,
          label: r.facility_name ? `${r.name} (${r.facility_name})` : r.name,
          count: Number(r.count),
        })),
        molecules: molRows.map((r) => ({
          id: r.id,
          label: r.name,
          count: Number(r.count),
        })),
        contributors: contRows.map((r) => ({
          id: r.orcid_id,
          label: r.name ?? r.orcid_id,
          count: Number(r.count),
        })),
      };
    }),

  listEdges: publicProcedure.query(async ({ ctx }) => {
    const edges = await ctx.db.edges.findMany();
    const priorityRank = (e: { targetatom: string; corestate: string }) => {
      const atom = e.targetatom.trim().toUpperCase();
      const cs = e.corestate.trim().toUpperCase();
      const isK = cs === "K";
      const cEdge = isK && (atom === "C" || atom === "CARBON");
      const nEdge = isK && (atom === "N" || atom === "NITROGEN");
      const sEdge =
        isK && (atom === "S" || atom === "SULFUR" || atom === "SULPHUR");
      if (cEdge) return 0;
      if (nEdge) return 1;
      if (sEdge) return 2;
      return 3;
    };
    edges.sort((a, b) => {
      const pa = priorityRank(a);
      const pb = priorityRank(b);
      if (pa !== pb) return pa - pb;
      const t = a.targetatom.localeCompare(b.targetatom, undefined, {
        sensitivity: "base",
      });
      if (t !== 0) return t;
      return a.corestate.localeCompare(b.corestate, undefined, {
        sensitivity: "base",
      });
    });
    return { edges };
  }),

  /**
   * Returns edge catalog statistics derived from spectrum point data in the
   * database. Only edges that have at least one linked experiment with
   * measured spectrum points are included.
   *
   * Used by the periodic-edge modal to:
   * - Determine which elements are truly "in catalog" (have measurements).
   * - Drive the energy density chart (histogram + per-edge energy ranges).
   *
   * The histogram uses 80 equal-width bins spanning 100–800 eV. Bins 1..80
   * map to the half-open intervals [100 + (i-1)*8.75, 100 + i*8.75).
   */
  edgeCatalogStats: publicProcedure.query(async ({ ctx }) => {
    type CatalogEdgeRow = {
      id: string;
      targetatom: string;
      corestate: string;
      min_ev: number | null;
      max_ev: number | null;
      experiment_count: bigint;
    };
    type HistBucketRow = {
      bucket: number;
      count: bigint;
    };

    const HIST_MIN = 100;
    const HIST_MAX = 800;
    const HIST_BINS = 80;

    const [catalogRows, histRows] = await Promise.all([
      ctx.db.$queryRaw<CatalogEdgeRow[]>`
        SELECT
          e.id,
          e.targetatom,
          e.corestate,
          MIN(sp.energyev)::float AS min_ev,
          MAX(sp.energyev)::float AS max_ev,
          COUNT(DISTINCT exp.id)::bigint AS experiment_count
        FROM edges e
        INNER JOIN experiments exp ON exp.edgeid = e.id
        INNER JOIN spectrumpoints sp ON sp.experimentid = exp.id
        GROUP BY e.id, e.targetatom, e.corestate
      `,
      ctx.db.$queryRaw<HistBucketRow[]>`
        SELECT
          width_bucket(sp.energyev::float, ${HIST_MIN}::float, ${HIST_MAX}::float, ${HIST_BINS}::int) AS bucket,
          COUNT(*)::bigint AS count
        FROM spectrumpoints sp
        INNER JOIN experiments exp ON sp.experimentid = exp.id
        WHERE sp.energyev BETWEEN ${HIST_MIN} AND ${HIST_MAX}
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    const buckets = new Array<number>(HIST_BINS).fill(0);
    for (const row of histRows) {
      const idx = row.bucket - 1;
      if (idx >= 0 && idx < HIST_BINS) {
        buckets[idx] = Number(row.count);
      }
    }

    return {
      edgesInCatalog: catalogRows.map((r) => ({
        id: r.id,
        targetatom: r.targetatom,
        corestate: r.corestate,
        minEv: r.min_ev,
        maxEv: r.max_ev,
        experimentCount: Number(r.experiment_count),
      })),
      energyHistogram: {
        bucketMinEv: HIST_MIN,
        bucketMaxEv: HIST_MAX,
        bins: HIST_BINS,
        buckets,
      },
    };
  }),

  listCalibrationMethods: publicProcedure.query(async ({ ctx }) => {
    const methods = await ctx.db.calibrationmethods.findMany({
      orderBy: { name: "asc" },
    });

    return { calibrationMethods: methods };
  }),

  createEdge: protectedProcedure
    .input(
      z.object({
        targetatom: z.string().min(1, "Target atom is required"),
        corestate: z.string().min(1, "Core state is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only maintainers can create new edges",
        });
      }
      // Check if edge already exists
      const existingEdge = await ctx.db.edges.findUnique({
        where: {
          targetatom_corestate: {
            targetatom: input.targetatom,
            corestate: input.corestate,
          },
        },
      });

      if (existingEdge) {
        return existingEdge;
      }

      // Create new edge
      const edge = await ctx.db.edges.create({
        data: {
          targetatom: input.targetatom,
          corestate: input.corestate,
        },
      });

      return edge;
    }),

  createCalibrationMethod: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only maintainers can create calibration methods",
        });
      }
      // Check if calibration method already exists
      const existingMethod = await ctx.db.calibrationmethods.findUnique({
        where: { name: input.name.trim() },
      });

      if (existingMethod) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A calibration method with this name already exists",
        });
      }

      // Create new calibration method
      const method = await ctx.db.calibrationmethods.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
        },
      });

      return method;
    }),

  create: contributeWriteProcedure
    .input(
      z.object({
        sampleid: z.string().uuid(),
        instrumentid: z.string(),
        edgeid: z.string().uuid(),
        polarizationid: z.string().uuid(),
        calibrationid: z.string().uuid().optional(),
        isstandard: z.boolean().default(false),
        referencestandard: z.string().optional(),
        experimenttype: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kind =
        input.experimenttype != null
          ? await ctx.db.nexafsexperimentkinds.findUnique({
              where: { experimenttype: input.experimenttype },
              select: { id: true },
            })
          : null;

      const experimentId = crypto.randomUUID();

      const experiment = await ctx.db.experiments.create({
        data: {
          id: experimentId,
          ...input,
          createdby: ctx.userId ?? undefined,
          experimenttype: input.experimenttype ?? null,
          nexafsexperimentkindid: kind?.id ?? null,
        },
        include: {
          samples: true,
          edges: true,
          instruments: true,
        },
      });

      return experiment;
    }),

  createWithSpectrum: contributeWriteProcedure
    .input(
      z.object({
        sample: z.object({
          moleculeId: z.string().uuid(),
          identifier: z.string().optional(),
          processMethod: z.nativeEnum(ProcessMethod).optional(),
          substrate: z.string().optional(),
          solvent: z.string().optional(),
          thickness: z.number().optional(),
          molecularWeight: z.number().optional(),
          vendor: z.object({
            existingVendorId: z.string().uuid().optional(),
            name: z.string().optional(),
            url: z.string().url().optional(),
          }),
        }),
        experiment: z.object({
          instrumentId: z.string(),
          edgeId: z.string().uuid(),
          experimentType: z.nativeEnum(ExperimentType),
          calibrationId: z.string().uuid().optional(),
          referenceStandard: z.string().optional(),
          isStandard: z.boolean().optional(),
          normalization: normalizationSchema.optional(),
          uploadedChannels: z
            .array(z.enum(["rawabs", "od", "massabsorption", "beta"]))
            .optional(),
          computeKkDeltaOnSubmit: z.boolean().optional(),
          validationOverride: z
            .object({
              bypass: z.boolean(),
              reason: z.string().trim().min(1).optional(),
            })
            .optional(),
        }),
        geometry: z
          .object({
            mode: z.enum(["fixed", "csv"]),
            fixed: z
              .object({
                theta: z.number(),
                phi: z.number(),
              })
              .optional(),
            csvGeometries: z
              .array(
                z.object({
                  theta: z.number(),
                  phi: z.number(),
                }),
              )
              .optional(),
          })
          .superRefine((value, ctx) => {
            if (value.mode === "fixed" && !value.fixed) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Fixed geometry requires theta and phi values",
              });
            }
            if (
              value.mode === "csv" &&
              (!value.csvGeometries || value.csvGeometries.length === 0)
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "CSV geometry mode requires at least one geometry entry",
              });
            }
          }),
        spectrum: z.object({
          points: z
            .array(
              z.object({
                energy: z.number(),
                absorption: z.number(),
                theta: z.number().optional(),
                phi: z.number().optional(),
                i0: z.number().optional(),
                od: z.number().optional(),
                rawabsError: z.number().optional(),
                odError: z.number().optional(),
                massabsorption: z.number().optional(),
                massabsorptionError: z.number().optional(),
                beta: z.number().optional(),
                betaError: z.number().optional(),
                delta: z.number().finite().optional(),
                deltaError: z.number().optional(),
              }),
            )
            .min(1, "Spectrum CSV must contain at least one row"),
        }),
        peaksets: z
          .array(
            z.object({
              energy: z.number(),
              intensity: z.number().optional(),
              bond: z.string().optional(),
              transition: z.string().optional(),
            }),
          )
          .optional(),
        collectedByUserIds: z.array(orcidUserIdSchema).optional(),
        collectedByOrcidIds: z.array(orcidUserIdSchema).optional(),
        attributions: z
          .array(
            z.object({
              orcid: orcidUserIdSchema,
              role: experimentAttributionRoleSchema,
            }),
          )
          .optional(),
        sourcePaperDoi: sourcePaperDoiInputSchema.optional(),
        sourcePaperDois: z.array(sourcePaperDoiInputSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        sample: sampleInput,
        experiment: experimentInput,
        geometry: geometryInput,
        spectrum: spectrumInput,
        collectedByUserIds,
        collectedByOrcidIds,
        attributions: attributionsInput,
        sourcePaperDoi: sourcePaperDoiInput,
        sourcePaperDois: sourcePaperDoisInput,
      } = input;

      const sourceDoiCandidates = [
        ...(sourcePaperDoisInput ?? []),
        ...(sourcePaperDoiInput ? [sourcePaperDoiInput] : []),
      ];
      const uniqueSourceDois = [
        ...new Set(
          sourceDoiCandidates
            .map((value) => normalizeDoi(value))
            .filter((value): value is string => value != null),
        ),
      ];

      const sourcePaperCitations: PublicationCitation[] = [];
      for (const doi of uniqueSourceDois) {
        const citation = await resolvePublicationDoi(doi);
        if (!citation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Source publication DOI was not found in Crossref or DataCite. Check the identifier or try again later.",
          });
        }
        sourcePaperCitations.push(citation);
      }
      const normalizationScope: NormalizationScope =
        experimentInput.normalization?.scope ?? "none";
      const normalizationRanges: NormalizationRanges =
        experimentInput.normalization?.ranges ?? null;
      const uploadedChannels = Array.from(
        new Set<UploadedChannel>([
          ...(experimentInput.uploadedChannels ?? []),
          "rawabs",
        ]),
      );
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      const requestedCollectedBy = [
        ...new Set((collectedByUserIds ?? []).filter((id) =>
          orcidUserIdSchema.safeParse(id).success,
        )),
      ];
      const requestedCollectedByOrcid = [
        ...new Set((collectedByOrcidIds ?? []).filter((id) =>
          orcidUserIdSchema.safeParse(id).success,
        )),
      ];
      if (
        !isPrivilegedUser &&
        requestedCollectedBy.some((userId) => userId !== ctx.userId)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only attribute collection to your own user account",
        });
      }

      const moleculeRow = await ctx.db.molecules.findUnique({
        where: { id: sampleInput.moleculeId },
        select: { chemicalformula: true },
      });
      const chemicalFormula = moleculeRow?.chemicalformula ?? null;

      type SpectrumPoint = (typeof spectrumInput.points)[number];

      interface GeometryGroup {
        theta: number;
        phi: number;
        points: SpectrumPoint[];
      }

      const geometryGroups: GeometryGroup[] = [];

      if (geometryInput.mode === "fixed") {
        const fixedGeometry = geometryInput.fixed!;
        geometryGroups.push({
          theta: fixedGeometry.theta,
          phi: fixedGeometry.phi,
          points: spectrumInput.points.map((point) => ({
            ...point,
            theta: fixedGeometry.theta,
            phi: fixedGeometry.phi,
          })),
        });
      } else {
        const groupedByGeometry = new Map<string, GeometryGroup>();

        for (const point of spectrumInput.points) {
          if (point.theta === undefined || point.phi === undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Spectrum CSV must include theta and phi columns when using CSV geometry mode.",
            });
          }

          const key = `${point.theta}:${point.phi}`;
          if (!groupedByGeometry.has(key)) {
            groupedByGeometry.set(key, {
              theta: point.theta,
              phi: point.phi,
              points: [],
            });
          }

          groupedByGeometry.get(key)!.points.push(point);
        }

        if (groupedByGeometry.size === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No spectrum points with geometry information were found.",
          });
        }

        geometryGroups.push(...groupedByGeometry.values());
      }

      const derivedByGroup: Array<
        Awaited<ReturnType<typeof computeSpectrumDerivedScalarColumns>>
      > = [];

      for (const group of geometryGroups) {
        if (spectrumRowsHaveUploadedDerivedScalars(group.points)) {
          derivedByGroup.push(emptyDerivedScalars());
        } else {
          derivedByGroup.push(
            await computeSpectrumDerivedScalarColumns(
              group.points,
              chemicalFormula,
            ),
          );
        }
      }

      const transactionResult = await ctx.db.$transaction(
        async (tx) => {
          const kind =
            experimentInput.experimentType != null
              ? await tx.nexafsexperimentkinds.findUnique({
                  where: { experimenttype: experimentInput.experimentType },
                  select: { id: true },
                })
              : null;
          const normalizedCollectedBy =
            requestedCollectedBy.length > 0
              ? requestedCollectedBy
              : ctx.userId != null
                ? [ctx.userId]
                : [];
          if (normalizedCollectedBy.length > 0) {
            const existingUsers = await tx.user.findMany({
              where: { id: { in: normalizedCollectedBy } },
              select: { id: true },
            });
            if (existingUsers.length !== normalizedCollectedBy.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One or more collected-by users do not exist",
              });
            }
          }
          const normalizedCollectorOrcidIds = [
            ...new Set([...normalizedCollectedBy, ...requestedCollectedByOrcid]),
          ];

          let attributionRows: ExperimentAttributionInput[] =
            attributionsInput != null && attributionsInput.length > 0
              ? normalizeAttributionInputs(attributionsInput)
              : [];
          if (attributionRows.length === 0) {
            if (ctx.userId) {
              attributionRows.push({ orcid: ctx.userId, role: "DataCurator" });
            }
            for (const collectorOrcid of normalizedCollectorOrcidIds) {
              if (ctx.userId && collectorOrcid === ctx.userId) {
                continue;
              }
              attributionRows.push({
                orcid: collectorOrcid,
                role: "DataCollector",
              });
            }
          }
          attributionRows = ensureUploaderOwnerAttribution(
            attributionRows,
            ctx.userId,
          );
          assertValidCreateAttributions(attributionRows);
          const contributorInsertRows = await buildContributorInsertRows(
            tx,
            attributionRows,
            ctx.userId,
          );
          const collectedByFromAttributions = await resolveKnownCollectorUserIds(
            tx,
            attributionRows,
          );
          const normalizedCollectedByForExperiment =
            collectedByFromAttributions.length > 0
              ? collectedByFromAttributions
              : normalizedCollectedBy;

          // Resolve vendor
          let vendorId: string | null =
            sampleInput.vendor.existingVendorId ?? null;
          const vendorNameTrimmed = sampleInput.vendor.name?.trim();

          if (!vendorId && vendorNameTrimmed) {
            const existingVendor = await tx.vendors.findUnique({
              where: { name: vendorNameTrimmed },
            });

            if (existingVendor) {
              vendorId = existingVendor.id;
            } else {
              const newVendor = await tx.vendors.create({
                data: {
                  name: vendorNameTrimmed,
                  url: sampleInput.vendor.url?.trim() ?? null,
                },
              });
              vendorId = newVendor.id;
            }
          }

          if (!vendorId && !vendorNameTrimmed) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Please select an existing vendor or provide a new vendor name.",
            });
          }

          // Generate identifier if not provided, or ensure it's unique if provided
          let sampleIdentifier = sampleInput.identifier?.trim();

          if (!sampleIdentifier) {
            // Generate a unique identifier if not provided
            // Format: SAMPLE-{timestamp}-{random}
            const timestamp = Date.now();
            const random = Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase();
            sampleIdentifier = `SAMPLE-${timestamp}-${random}`;

            // Ensure uniqueness (very unlikely but check anyway)
            let counter = 0;
            while (counter < 10) {
              const existingSample = await tx.samples.findUnique({
                where: { identifier: sampleIdentifier },
              });

              if (!existingSample) break;

              // Regenerate if collision
              const newRandom = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();
              sampleIdentifier = `SAMPLE-${timestamp}-${newRandom}`;
              counter++;
            }
          }

          // Check if sample with this identifier already exists
          let sample = await tx.samples.findUnique({
            where: { identifier: sampleIdentifier },
          });

          if (!sample) {
            // Create new sample if it doesn't exist
            sample = await tx.samples.create({
              data: {
                moleculeid: sampleInput.moleculeId,
                identifier: sampleIdentifier,
                processmethod: sampleInput.processMethod ?? null,
                substrate: normalizeSampleSubstrate(sampleInput.substrate),
                solvent: sampleInput.solvent?.trim() ?? null,
                thickness: sampleInput.thickness ?? null,
                molecularweight: sampleInput.molecularWeight ?? null,
                vendorid: vendorId,
              },
            });
          } else {
            if (sample.moleculeid !== sampleInput.moleculeId) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "A sample with this identifier already exists for a different molecule.",
              });
            }
          }

          const polarizationIdByGeometry = new Map<string, string>();

          const getOrCreatePolarizationId = async (
            theta: number,
            phi: number,
          ) => {
            const key = `${theta}:${phi}`;
            const cached = polarizationIdByGeometry.get(key);
            if (cached) return cached;

            const existingPolarization = await tx.polarizations.findFirst({
              where: {
                polardeg: new Prisma.Decimal(theta),
                azimuthdeg: new Prisma.Decimal(phi),
              },
              select: { id: true },
            });

            if (existingPolarization) {
              polarizationIdByGeometry.set(key, existingPolarization.id);
              return existingPolarization.id;
            }

            const createdPolarization = await tx.polarizations.create({
              data: {
                polardeg: new Prisma.Decimal(theta),
                azimuthdeg: new Prisma.Decimal(phi),
              },
              select: { id: true },
            });
            polarizationIdByGeometry.set(key, createdPolarization.id);
            return createdPolarization.id;
          };

          const firstGeometry = geometryGroups[0];
          if (!firstGeometry) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "No geometry groups were resolved from the uploaded spectrum.",
            });
          }

          const defaultPolarizationId = await getOrCreatePolarizationId(
            firstGeometry.theta,
            firstGeometry.phi,
          );

          const experimentId = crypto.randomUUID();
          const validationSummary = buildValidationSummary({
            points: spectrumInput.points,
            ranges: normalizationRanges,
            scope: normalizationScope,
            override: {
              bypass: experimentInput.validationOverride?.bypass ?? false,
              reason: experimentInput.validationOverride?.reason,
            },
          });
          const qualityScores = buildQualityScores({
            points: spectrumInput.points,
            ranges: normalizationRanges,
            scope: normalizationScope,
            doiPresent: sourcePaperCitations.length > 0,
          });
          const hasDerivedValues = {
            od: derivedByGroup.some((group) =>
              group.od.some((value) => value != null),
            ),
            massabsorption: derivedByGroup.some((group) =>
              group.massabsorption.some((value) => value != null),
            ),
            beta: derivedByGroup.some((group) =>
              group.beta.some((value) => value != null),
            ),
          };
          const channelProvenance = buildChannelProvenance({
            uploadedChannels,
            hasDerivedValues,
          });

          let spectrumHasDelta = false;
          for (const group of geometryGroups) {
            for (const point of group.points) {
              const deltaVal = coalesceUploadedOrDerived(point.delta, null);
              if (deltaVal != null && Number.isFinite(deltaVal)) {
                spectrumHasDelta = true;
                break;
              }
            }
            if (spectrumHasDelta) {
              break;
            }
          }

          if (
            experimentInput.computeKkDeltaOnSubmit === true &&
            !spectrumHasDelta
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "computeKkDeltaOnSubmit requires finite delta on at least one spectrum point",
            });
          }
          if (
            experimentInput.computeKkDeltaOnSubmit === true &&
            !uploadedChannels.includes("beta")
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "computeKkDeltaOnSubmit requires beta in uploadedChannels",
            });
          }

          const kkDeltaSourceOnCreate = deriveKkDeltaSourceOnCreate({
            spectrumHasFiniteDelta: spectrumHasDelta,
            computeKkDeltaOnSubmit: experimentInput.computeKkDeltaOnSubmit,
          });
          const kkDeltaMetadataOnCreate =
            kkDeltaSourceOnCreate != null
              ? buildKkDeltaMetadata({
                  source: kkDeltaSourceOnCreate,
                  calculatedByUserId: ctx.userId,
                })
              : null;

          const experiment = await tx.experiments.create({
            data: {
              id: experimentId,
              sampleid: sample.id,
              instrumentid: experimentInput.instrumentId,
              edgeid: experimentInput.edgeId,
              polarizationid: defaultPolarizationId,
              calibrationid: experimentInput.calibrationId ?? null,
              isstandard: experimentInput.isStandard ?? false,
              referencestandard: experimentInput.referenceStandard ?? null,
              createdby: ctx.userId ?? undefined,
              experimenttype: experimentInput.experimentType,
              nexafsexperimentkindid: kind?.id ?? null,
              collectedbyuserids: normalizedCollectedByForExperiment,
              normalizationscope: normalizationScope,
              normalizationranges:
                normalizationRanges as unknown as Prisma.InputJsonValue,
              uploadedchannels:
                uploadedChannels as unknown as Prisma.InputJsonValue,
              channelprovenance:
                channelProvenance as unknown as Prisma.InputJsonValue,
              kkdeltametadata:
                kkDeltaMetadataOnCreate != null
                  ? kkDeltaMetadataToJson(kkDeltaMetadataOnCreate)
                  : undefined,
              validationsummary:
                validationSummary as unknown as Prisma.InputJsonValue,
              qualityscores: qualityScores as unknown as Prisma.InputJsonValue,
            },
            include: {
              samples: true,
              edges: true,
              instruments: true,
            },
          });

          if (contributorInsertRows.length > 0) {
            await tx.experimentcontributors.createMany({
              data: contributorInsertRows.map((row) => ({
                experimentid: experiment.id,
                orcidid: row.orcidid,
                userid: row.userid,
                role: row.role,
                claimstatus: row.claimstatus,
                isclaimed: row.isclaimed,
                ispublicprofilevisible: row.ispublicprofilevisible,
                claimedat: row.claimedat,
                detachedat: row.detachedat,
              })),
              skipDuplicates: true,
            });
          }

          let spectrumPointsCreated = 0;
          for (
            let groupIndex = 0;
            groupIndex < geometryGroups.length;
            groupIndex += 1
          ) {
            const group = geometryGroups[groupIndex]!;
            const derived = derivedByGroup[groupIndex]!;
            const polarizationId = await getOrCreatePolarizationId(
              group.theta,
              group.phi,
            );

            const spectrumData = group.points.map((point, i) => ({
              experimentid: experiment.id,
              polarizationid: polarizationId,
              energyev: point.energy,
              rawabs: point.absorption,
              od: coalesceUploadedOrDerived(point.od, derived.od[i] ?? null),
              rawabserr: coalesceUploadedOrDerived(point.rawabsError, null),
              oderr: coalesceUploadedOrDerived(point.odError, null),
              massabsorption: coalesceUploadedOrDerived(
                point.massabsorption,
                derived.massabsorption[i] ?? null,
              ),
              massabsorptionerr: coalesceUploadedOrDerived(
                point.massabsorptionError,
                null,
              ),
              beta: coalesceUploadedOrDerived(
                point.beta,
                derived.beta[i] ?? null,
              ),
              betaerr: coalesceUploadedOrDerived(point.betaError, null),
              delta: coalesceUploadedOrDerived(point.delta, null),
              deltaerr: coalesceUploadedOrDerived(point.deltaError, null),
              i0: coalesceUploadedOrDerived(point.i0, null),
            }));

            if (spectrumData.length > 0) {
              const created = await tx.spectrumpoints.createMany({
                data: spectrumData,
              });
              spectrumPointsCreated += created.count;
            }
          }

          if (input.peaksets && input.peaksets.length > 0) {
            const peaksetsData = input.peaksets.map((peak) => ({
              experimentid: experiment.id,
              energyev: peak.energy,
              intensity: peak.intensity ?? null,
              bond: peak.bond ?? null,
              transition: peak.transition ?? null,
            }));
            await tx.peaksets.createMany({ data: peaksetsData });
          }

          if (sourcePaperCitations.length > 0) {
            await syncExperimentSourcePublications(
              tx,
              experiment.id,
              sourcePaperCitations,
            );
          }

          return {
            sample,
            experiments: [
              {
                experiment,
                spectrumPointsCreated,
              },
            ],
          };
        },
        { timeout: 60000 },
      );

      return transactionResult;
    }),

  canEditExperiment: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const canManageAtlasVerification = ctx.userId
        ? await userMayManageAtlasTeamVerification(ctx.db, ctx.userId)
        : false;
      return {
        canEdit: await userMayEditExperiment(
          ctx.db,
          ctx.userId,
          input.experimentId,
        ),
        canManageAtlasVerification,
      };
    }),

  setAtlasTeamVerification: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        verified: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const mayManageAtlas = await userMayManageAtlasTeamVerification(
        ctx.db,
        ctx.userId,
      );
      if (!mayManageAtlas) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Administrator or maintainer access is required to change Atlas team verification.",
        });
      }

      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { validationsummary: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      const nextSummary = input.verified
        ? buildAtlasTeamVerificationSummary()
        : clearAtlasTeamVerificationSummary(experiment.validationsummary);

      await ctx.db.experiments.update({
        where: { id: input.experimentId },
        data: {
          validationsummary: validationSummaryToPrismaJson(nextSummary),
        },
      });

      return {
        experimentId: input.experimentId,
        atlasTeamVerified: isAtlasTeamVerifiedSummary(nextSummary),
      };
    }),

  listAttributions: protectedProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);
      const rows = await ctx.db.experimentcontributors.findMany({
        where: { experimentid: input.experimentId },
        orderBy: [{ role: "asc" }, { createdat: "asc" }],
        include: {
          user: {
            select: {
              name: true,
              image: true,
              contributionAgreementAccepted: true,
              contributionAgreementVersion: true,
              autoAcceptMode: true,
              attributionDisplayPreferences: true,
            },
          },
        },
      });
      return mapContributorRowsToDto(ctx.db, rows);
    }),

  setAttributions: protectedProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        attributions: z.array(
          z.object({
            orcid: orcidUserIdSchema,
            role: experimentAttributionRoleSchema,
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);
      const attributionRows = normalizeAttributionInputs(input.attributions);
      assertValidCreateAttributions(attributionRows);

      const existingRows = await ctx.db.experimentcontributors.findMany({
        where: { experimentid: input.experimentId },
        select: {
          orcidid: true,
          role: true,
          userid: true,
          claimstatus: true,
          isclaimed: true,
          ispublicprofilevisible: true,
          claimedat: true,
          detachedat: true,
        },
      });
      const contributorInsertRows = mergeContributorRowsWithExistingClaimState(
        await buildContributorInsertRows(ctx.db, attributionRows, ctx.userId),
        existingRows,
      );
      const collectedByFromAttributions = await resolveKnownCollectorUserIds(
        ctx.db,
        attributionRows,
      );

      await ctx.db.$transaction(async (tx) => {
        await tx.experimentcontributors.deleteMany({
          where: { experimentid: input.experimentId },
        });
        if (contributorInsertRows.length > 0) {
          await tx.experimentcontributors.createMany({
            data: contributorInsertRows.map((row) => ({
              experimentid: input.experimentId,
              orcidid: row.orcidid,
              userid: row.userid,
              role: row.role,
              claimstatus: row.claimstatus,
              isclaimed: row.isclaimed,
              ispublicprofilevisible: row.ispublicprofilevisible,
              claimedat: row.claimedat,
              detachedat: row.detachedat,
            })),
          });
        }
        await tx.experiments.update({
          where: { id: input.experimentId },
          data: { collectedbyuserids: collectedByFromAttributions },
        });
      });

      return { updatedCount: contributorInsertRows.length };
    }),

  listMyUnclaimedContributions: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.experimentcontributors.findMany({
      where: {
        orcidid: ctx.userId,
        claimstatus: "pending",
      },
      orderBy: [{ createdat: "desc" }],
      include: {
        experiments: {
          select: {
            id: true,
            createdat: true,
            samples: {
              select: {
                molecules: {
                  select: {
                    iupacname: true,
                    chemicalformula: true,
                  },
                },
              },
            },
            edges: { select: { targetatom: true, corestate: true } },
            instruments: {
              select: {
                name: true,
                facilities: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    return rows.map((row) => ({
      experimentId: row.experimentid,
      role: row.role,
      detachedAt: row.detachedat,
      createdAt: row.createdat,
      experiment: {
        id: row.experiments.id,
        createdAt: row.experiments.createdat,
        moleculeName:
          row.experiments.samples.molecules.iupacname ??
          row.experiments.samples.molecules.chemicalformula,
        edgeLabel: `${row.experiments.edges.targetatom} ${row.experiments.edges.corestate}`,
        instrumentName: row.experiments.instruments.name,
        facilityName: row.experiments.instruments.facilities?.name ?? null,
      },
    }));
  }),

  setClaimState: protectedProcedure
    .input(
      z.object({
        experimentIds: contributionBatchExperimentIdsSchema,
        claim: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetRows = await ctx.db.experimentcontributors.findMany({
        where: {
          experimentid: { in: input.experimentIds },
          orcidid: ctx.userId,
        },
        select: { id: true },
      });
      if (targetRows.length === 0) {
        return { updatedCount: 0 };
      }
      const targetIds = targetRows.map((row) => row.id);
      const update = await ctx.db.experimentcontributors.updateMany({
        where: { id: { in: targetIds } },
        data: input.claim
          ? {
              claimstatus: "accepted",
              ...contributorFlagsForClaimStatus("accepted", ctx.userId),
            }
          : {
              claimstatus: "unclaimed",
              ...contributorFlagsForClaimStatus("unclaimed", ctx.userId),
            },
      });
      return { updatedCount: update.count };
    }),

  confirmClaimContributions: protectedProcedure
    .input(
      z.object({
        experimentIds: contributionBatchExperimentIdsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const update = await ctx.db.experimentcontributors.updateMany({
        where: {
          experimentid: { in: input.experimentIds },
          orcidid: ctx.userId,
        },
        data: {
          claimstatus: "accepted",
          ...contributorFlagsForClaimStatus("accepted", ctx.userId),
        },
      });
      return { updatedCount: update.count };
    }),

  setContributionVisibility: protectedProcedure
    .input(
      z.object({
        experimentIds: contributionBatchExperimentIdsSchema,
        visibleProfile: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      const targetRows = await ctx.db.experimentcontributors.findMany({
        where: {
          experimentid: { in: input.experimentIds },
          role: { in: ["DataCollector", "collector"] },
        },
        include: {
          experiments: {
            select: { createdby: true },
          },
        },
      });
      const allowedIds = targetRows
        .filter((row) => {
          const isSelf = row.orcidid === ctx.userId;
          const isOwner = row.experiments.createdby === ctx.userId;
          return isSelf || isOwner || isPrivilegedUser;
        })
        .map((row) => row.id);
      if (allowedIds.length === 0) {
        return { updatedCount: 0 };
      }
      const now = new Date();
      if (!input.visibleProfile) {
        const update = await ctx.db.experimentcontributors.updateMany({
          where: { id: { in: allowedIds } },
          data: {
            ispublicprofilevisible: false,
            detachedat: now,
            userid: null,
            isclaimed: false,
          },
        });
        return { updatedCount: update.count };
      }
      await ctx.db.$transaction(
        targetRows
          .filter((row) => allowedIds.includes(row.id))
          .map((row) =>
            ctx.db.experimentcontributors.update({
              where: { id: row.id },
              data: {
                ispublicprofilevisible: true,
                detachedat: null,
                userid: row.userid,
                isclaimed: row.userid != null,
              },
            }),
          ),
      );
      return { updatedCount: allowedIds.length };
    }),

  updateNormalizationMetadata: protectedProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        normalization: normalizationSchema,
        uploadedChannels: z
          .array(z.enum(["rawabs", "od", "massabsorption", "beta"]))
          .optional(),
        reason: z.string().trim().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingExperiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { createdby: true },
      });
      if (!existingExperiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      const canMutate =
        existingExperiment.createdby != null &&
        ctx.userId != null &&
        existingExperiment.createdby === ctx.userId;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!canMutate && !isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to update normalization metadata for this experiment",
        });
      }

      const uploadedChannels = Array.from(
        new Set<UploadedChannel>([
          ...(input.uploadedChannels ?? []),
          "rawabs",
        ]),
      );
      const pointCount = await ctx.db.spectrumpoints.count({
        where: { experimentid: input.experimentId },
      });
      if (pointCount > SPECTRUMPOINTS_SERVER_SCAN_CAP) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Normalization revalidation supports at most ${SPECTRUMPOINTS_SERVER_SCAN_CAP} spectrum points per experiment (${pointCount} present)`,
        });
      }
      const points = await ctx.db.spectrumpoints.findMany({
        where: { experimentid: input.experimentId },
        orderBy: { energyev: "asc" },
        take: SPECTRUMPOINTS_SERVER_SCAN_CAP,
      });
      const spectrumPoints = points.map((point) => ({
        energy: point.energyev,
        absorption: point.rawabs,
        od: point.od ?? undefined,
        massabsorption: point.massabsorption ?? undefined,
        beta: point.beta ?? undefined,
      }));
      const ranges: NormalizationRanges = input.normalization.ranges ?? null;
      const validationSummary = buildValidationSummary({
        points: spectrumPoints,
        ranges,
        scope: input.normalization.scope,
        override: { bypass: false, reason: input.reason },
      });
      const qualityScores = buildQualityScores({
        points: spectrumPoints,
        ranges,
        scope: input.normalization.scope,
        doiPresent: false,
      });
      const channelProvenance = buildChannelProvenance({
        uploadedChannels,
        hasDerivedValues: {
          od: points.some((point) => point.od != null),
          massabsorption: points.some((point) => point.massabsorption != null),
          beta: points.some((point) => point.beta != null),
        },
      });

      return ctx.db.experiments.update({
        where: { id: input.experimentId },
        data: {
          normalizationscope: input.normalization.scope,
          normalizationranges: ranges as unknown as Prisma.InputJsonValue,
          uploadedchannels: uploadedChannels as unknown as Prisma.InputJsonValue,
          channelprovenance:
            channelProvenance as unknown as Prisma.InputJsonValue,
          validationsummary:
            validationSummary as unknown as Prisma.InputJsonValue,
          qualityscores: qualityScores as unknown as Prisma.InputJsonValue,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        calibrationid: z.string().uuid().optional(),
        isstandard: z.boolean().optional(),
        referencestandard: z.string().optional(),
        experimenttype: z.nativeEnum(ExperimentType).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const existingExperiment = await ctx.db.experiments.findUnique({
        where: { id },
        select: { createdby: true },
      });
      if (!existingExperiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      const canMutate =
        existingExperiment.createdby != null &&
        ctx.userId != null &&
        existingExperiment.createdby === ctx.userId;
      const isPrivilegedUser = await hasPrivilegedRole(ctx.db, ctx.userId);
      if (!canMutate && !isPrivilegedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this experiment",
        });
      }

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

  remove: privilegedWriteProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true, createdby: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      const allowed = await userMayDeleteExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this experiment",
        });
      }

      await ctx.db.experiments.delete({
        where: { id: input.experimentId },
      });

      return { success: true };
    }),

  transferOwnership: privilegedWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        newCreatorId: orcidUserIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true, createdby: true },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      const allowed = await userMayTransferExperimentOwnership(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the dataset owner can transfer ownership",
        });
      }

      if (input.newCreatorId === ctx.userId) {
        return { success: true };
      }

      const newUser = await ctx.db.user.findUnique({
        where: { id: input.newCreatorId },
        select: { id: true },
      });

      if (!newUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selected recipient user not found",
        });
      }

      await ctx.db.experiments.update({
        where: { id: input.experimentId },
        data: { createdby: input.newCreatorId },
      });

      return { success: true };
    }),

  getDeleteDataPointImpact: privilegedWriteProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { createdby: true },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      const allowed = await userMayDeleteExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view delete impact",
        });
      }

      const dataPointsRemoved = await ctx.db.spectrumpoints.count({
        where: { experimentid: input.experimentId },
      });

      return { dataPointsRemoved };
    }),

  removeCollector: privilegedWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        collectorUserId: orcidUserIdSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const targetUserId = input.collectorUserId ?? ctx.userId;
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: {
          id: true,
          createdby: true,
          collectedbyuserids: true,
        },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (!experiment.collectedbyuserids.includes(targetUserId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not listed as a collector on this dataset",
        });
      }

      const isOwner = experiment.createdby === ctx.userId;
      const isSelf = targetUserId === ctx.userId;
      if (!isOwner && !isSelf) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only remove your own collector listing",
        });
      }

      const nextCollectorIds = experiment.collectedbyuserids.filter(
        (id) => id !== targetUserId,
      );

      await ctx.db.experiments.update({
        where: { id: input.experimentId },
        data: { collectedbyuserids: nextCollectorIds },
      });

      return { success: true };
    }),

  lookupPublicationDoi: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(512) }))
    .query(async ({ input }) => {
      const result = await fetchPublicationDoiLookup(input.query);
      if (result.kind === "resolved") {
        return {
          kind: "resolved" as const,
          citation: mapPublicationCitationToOutput(result.citation),
        };
      }
      if (result.kind === "suggestions") {
        return {
          kind: "suggestions" as const,
          suggestions: result.suggestions.map(mapPublicationCitationToOutput),
        };
      }
      return { kind: "not_found" as const };
    }),

  getSourcePaperDoi: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const metrics = await ctx.db.experimentmetrics.findUnique({
        where: { experimentid: input.experimentId },
        select: {
          originaldatadoi: true,
          hasoriginaldatadoi: true,
          sourcepaperdoiverified: true,
        },
      });
      const rows = await listExperimentSourcePublications(
        ctx.db,
        input.experimentId,
      );
      const publications = rows.map((row) => mapPublicationCitationToOutput(row));
      const primaryDoi = metrics?.originaldatadoi?.trim() ?? publications[0]?.doi ?? "";
      const primaryCitation =
        publications.find((publication) => publication.doi === primaryDoi) ??
        publications[0] ??
        null;

      if (!primaryDoi) {
        return {
          experimentId: input.experimentId,
          doi: null,
          citation: null,
          publications,
          hasOriginalDataDoi: false,
          sourcePaperDoiVerified: false,
        };
      }

      return {
        experimentId: input.experimentId,
        doi: primaryDoi,
        citation: primaryCitation,
        publications,
        hasOriginalDataDoi: metrics?.hasoriginaldatadoi ?? true,
        sourcePaperDoiVerified: metrics?.sourcepaperdoiverified ?? false,
      };
    }),

  listSourcePublications: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await listExperimentSourcePublications(
        ctx.db,
        input.experimentId,
      );
      return {
        experimentId: input.experimentId,
        publications: rows.map((row) => mapPublicationCitationToOutput(row)),
      };
    }),

  addSourcePublication: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        doi: sourcePaperDoiInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );

      const citation = await resolvePublicationDoi(input.doi);
      if (!citation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Source publication DOI was not found in Crossref or DataCite. Check the identifier or try again later.",
        });
      }

      const primaryDoi = await addExperimentSourcePublication(
        ctx.db,
        input.experimentId,
        citation,
      );
      const rows = await listExperimentSourcePublications(
        ctx.db,
        input.experimentId,
      );

      return {
        experimentId: input.experimentId,
        primaryDoi,
        publications: rows.map((row) => mapPublicationCitationToOutput(row)),
        citation: mapPublicationCitationToOutput(citation),
      };
    }),

  removeSourcePublication: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        doi: sourcePaperDoiInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );

      const primaryDoi = await removeExperimentSourcePublication(
        ctx.db,
        input.experimentId,
        input.doi,
      );
      const rows = await listExperimentSourcePublications(
        ctx.db,
        input.experimentId,
      );

      return {
        experimentId: input.experimentId,
        primaryDoi,
        publications: rows.map((row) => mapPublicationCitationToOutput(row)),
      };
    }),

  setSourcePaperDoi: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        doi: sourcePaperDoiInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );

      const citation = await resolvePublicationDoi(input.doi);
      if (!citation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Source publication DOI was not found in Crossref or DataCite. Check the identifier or try again later.",
        });
      }

      await syncExperimentSourcePaperDoi(
        ctx.db,
        input.experimentId,
        citation,
      );

      const metrics = await ctx.db.experimentmetrics.findUnique({
        where: { experimentid: input.experimentId },
        select: {
          originaldatadoi: true,
          hasoriginaldatadoi: true,
          sourcepaperdoiverified: true,
        },
      });

      return {
        experimentId: input.experimentId,
        originalDataDoi: metrics?.originaldatadoi ?? citation.doi,
        hasOriginalDataDoi: metrics?.hasoriginaldatadoi ?? true,
        sourcePaperDoiVerified: metrics?.sourcepaperdoiverified ?? false,
        citation: mapPublicationCitationToOutput(citation),
      };
    }),

  clearSourcePaperDoi: contributeWriteProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      await assertUserMayEditExperiment(
        ctx.db,
        ctx.userId,
        input.experimentId,
      );

      await clearExperimentSourcePaperDoi(ctx.db, input.experimentId);

      return {
        experimentId: input.experimentId,
        originalDataDoi: null,
        hasOriginalDataDoi: false,
        sourcePaperDoiVerified: false,
        citation: null,
      };
    }),

  verifySourcePaperDoi: adminProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const metrics = await ctx.db.experimentmetrics.findUnique({
        where: { experimentid: input.experimentId },
        select: { originaldatadoi: true },
      });
      if (!metrics?.originaldatadoi) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Experiment has no source paper DOI to verify",
        });
      }

      const updated = await ctx.db.experimentmetrics.update({
        where: { experimentid: input.experimentId },
        data: {
          sourcepaperdoiverified: true,
          sourcepaperdoiverifiedat: new Date(),
          sourcepaperdoiverifiedby: ctx.userId,
        },
      });

      return {
        experimentId: input.experimentId,
        sourcePaperDoiVerified: updated.sourcepaperdoiverified,
        sourcePaperDoiVerifiedAt:
          updated.sourcepaperdoiverifiedat?.toISOString() ?? null,
        sourcePaperDoiVerifiedBy: updated.sourcepaperdoiverifiedby,
      };
    }),
});
