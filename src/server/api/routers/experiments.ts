import { z } from "zod";
import {
  createExperimentWithSpectrumDetailed,
  createWithSpectrumInputSchema,
  experimentAttributionRoleSchema,
  normalizationSchema,
  sourcePaperDoiInputSchema,
} from "~/server/nexafs/create-experiment-with-spectrum";
import {
  adminProcedure,
  contributeWriteProcedure,
  createTRPCRouter,
  destructiveWriteProcedure,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { ensureAtlasDatasetId } from "~/server/nexafs/atlas-dataset-id";
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
} from "~/server/nexafs/syncExperimentSourcePaperDoi";
import {
  isZenodoMintingEnabled,
  mintExperimentDatasetDoi,
  scheduleZenodoDepositSync,
} from "~/server/zenodo";
import { syncAfterEdit } from "~/server/zenodo/zenodo-sync-queue";
import { coerceZenodoDepositUiState } from "~/lib/zenodo-doi-button-mode";
import type { PublicationCitation } from "~/lib/publication-citation";
import { orcidUserIdSchema } from "~/lib/orcid";
import {
  edgeLabelFromAtomCore,
  evaluateEdgeEnergyConsistency,
} from "~/lib/nexafs/edge-energy-bands";
import { sampleAuxFieldsFromPrismaRow } from "~/lib/sample-aux-from-prisma";
import {
  energySpanJaccard,
  DATASET_SIMILARITY_WARN_THRESHOLD,
  enumerateDatasetSimilarPairs,
  evaluateMergeCandidacy,
  NEXAFS_MERGE_EXPERIMENT_TYPES,
  parseNexafsMergeExperimentType,
  type DatasetSimilarityMatch,
  type DatasetSimilarPair,
} from "~/lib/nexafs/dataset-similarity";
import { geometryKeysByExperimentId } from "~/server/nexafs/similar-experiment-pairs";
import { plotPeakToPeaksetWrite } from "~/lib/nexafs/peakset-kind";
import { TRPCError } from "@trpc/server";
import { ExperimentType, type Prisma } from "~/prisma/client";
import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import {
  getCachedNexafsBrowseList,
  getCachedNexafsBrowseSearch,
  overlayNexafsBrowseFavoriteFlags,
} from "~/server/cache/nexafs-browse-public-cache";
import { loadNexafsFacetCounts } from "~/server/nexafs/nexafsFacetCounts";
import {
  buildChannelProvenance,
  buildQualityScores,
  buildValidationSummary,
  type NormalizationRanges,
  type UploadedChannel,
} from "~/server/nexafs/normalizationMetadata";
import { type NexafsBrowseSortKey } from "~/server/nexafs/nexafsBrowseGroups";
import {
  applyVersionedChange,
  canonicalJsonChecksum,
  confirmVersionBumpSchema,
  datasetChangeKindSchema,
  experimentHasZenodoDeposit,
  readDatasetVersion,
  resolveBumpLevel,
} from "~/server/nexafs/apply-versioned-change";
import {
  formatDatasetVersion,
  nextDatasetVersion,
} from "~/server/nexafs/dataset-versioning";
import { persistExperimentMetricsTables } from "~/server/nexafs/persistExperimentMetricsTables";
import { findExperimentFavorite } from "~/server/db/engagement-queries";
import { parseKkDeltaMetadata } from "~/server/nexafs/kkDeltaMetadata";
import { SPECTRUMPOINTS_SERVER_SCAN_CAP } from "~/server/nexafs/spectrumpointLimits";
import {
  buildAtlasTeamVerificationSummary,
  clearAtlasTeamVerificationSummary,
  isAtlasTeamVerifiedSummary,
  userMayManageAtlasTeamVerification,
  validationSummaryToPrismaJson,
} from "~/server/nexafs/atlasTeamVerification";
import { mergeRedundantExperiments } from "~/server/nexafs/merge-redundant-experiments";
import { auditRequestMetaFromTrpcContext } from "~/server/audit/request-meta";

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
  .transform((v): NexafsBrowseSortKey =>
    v === "comments" ? "publications" : v,
  );

const nexafsVerificationSourceSchema = z
  .enum(["either", "publication", "atlas"])
  .default("either");

const publicationCitationOutputSchema = z.object({
  doi: z.string(),
  title: z.string(),
  journal: z.string().nullable(),
  year: z.number().nullable(),
  authors: z.array(z.string()),
});

const STORED_UPLOADED_CHANNELS: readonly UploadedChannel[] = [
  "rawabs",
  "od",
  "massabsorption",
  "beta",
];

/** Channel names in the stored `uploaded_channels` JSON; anything unrecognised is dropped. */
function storedUploadedChannels(
  value: Prisma.JsonValue | null,
): UploadedChannel[] {
  if (!Array.isArray(value)) return [];
  return STORED_UPLOADED_CHANNELS.filter((channel) => value.includes(channel));
}

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
  mergeContributorRowsWithExistingClaimState,
  resolveKnownCollectorUserIds,
  mapContributorRowsToDto,
  normalizeAttributionInputs,
} from "~/server/nexafs/experimentAttributions";
import { contributorFlagsForClaimStatus } from "~/lib/dataset-attribution-claim";
import {
  assertUserMayEditExperiment,
  userMayEditExperiment,
} from "~/server/nexafs/experimentEditAuthz";

const experimentCommentInputSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

const contributionBatchExperimentIdsSchema = z
  .array(z.string().uuid())
  .min(1)
  .max(200)
  .transform((ids) => [...new Set(ids)]);

type ExperimentQualityComment = {
  id: string;
  userId: string;
  userName: string | null;
  text: string;
  createdAt: string;
};

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
          normalizationscope: true,
          normalizationranges: true,
          uploadedchannels: true,
          kkdeltametadata: true,
          datasetVersionMajor: true,
          datasetVersionMinor: true,
          datasetVersionPatch: true,
          zenodoVersions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { versionLabel: true, status: true },
          },
          samples: {
            select: {
              id: true,
              molecules: { select: { chemicalformula: true } },
            },
          },
        },
      });
      const raw = row?.samples?.molecules?.chemicalformula?.trim() ?? "";
      const userId = ctx.userId;
      const canEditNormalizationMetadata = await userMayEditExperiment(
        ctx.db,
        userId,
        input.experimentId,
      );
      return {
        sampleId: row?.samples?.id ?? null,
        chemicalFormula: raw.length > 0 ? raw : null,
        normalizationScope: row?.normalizationscope ?? null,
        normalizationRanges: row?.normalizationranges ?? null,
        uploadedChannels: row?.uploadedchannels ?? null,
        kkDeltaMetadata: parseKkDeltaMetadata(row?.kkdeltametadata),
        datasetVersion: row
          ? `${row.datasetVersionMajor}.${row.datasetVersionMinor}.${row.datasetVersionPatch}`
          : null,
        latestZenodoVersion: row?.zenodoVersions[0] ?? null,
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
      const page = await getCachedNexafsBrowseList(ctx.db, input);
      const groups = await overlayNexafsBrowseFavoriteFlags(
        ctx.db,
        ctx.userId,
        page.groups,
      );

      return {
        groups,
        total: page.total,
        hasMore: input.offset + groups.length < page.total,
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
        query: z.string().min(1).max(200),
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
      const page = await getCachedNexafsBrowseSearch(ctx.db, {
        ...input,
        query: input.query.trim(),
      });
      const groups = await overlayNexafsBrowseFavoriteFlags(
        ctx.db,
        ctx.userId,
        page.groups,
      );
      return { groups, total: page.total };
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
    const loadCached = cachePublicCatalogRead(
      "nexafs-facet-counts-v1",
      ["nexafs-facet-counts"],
      () => loadNexafsFacetCounts(ctx.db),
      90,
    );
    return loadCached();
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

      type EdgeRow = {
        id: string;
        targetatom: string;
        corestate: string;
        count: bigint;
      };
      type InstrumentRow = {
        id: string;
        name: string;
        facility_name: string | null;
        count: bigint;
      };
      type MolRow = { id: string; name: string; count: bigint };
      type ContributorRow = {
        orcid_id: string;
        name: string | null;
        count: bigint;
      };

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
    const loadCached = cachePublicCatalogRead(
      "nexafs-edges-list-v1",
      ["nexafs-edges"],
      async () => {
        const edges = await ctx.db.edges.findMany();
        const priorityRank = (edge: {
          targetatom: string;
          corestate: string;
        }) => {
          const atom = edge.targetatom.trim().toUpperCase();
          const coreState = edge.corestate.trim().toUpperCase();
          const isK = coreState === "K";
          const cEdge = isK && (atom === "C" || atom === "CARBON");
          const nEdge = isK && (atom === "N" || atom === "NITROGEN");
          const sEdge =
            isK && (atom === "S" || atom === "SULFUR" || atom === "SULPHUR");
          if (cEdge) return 0;
          if (nEdge) return 1;
          if (sEdge) return 2;
          return 3;
        };
        edges.sort((left, right) => {
          const leftPriority = priorityRank(left);
          const rightPriority = priorityRank(right);
          if (leftPriority !== rightPriority)
            return leftPriority - rightPriority;
          const targetCompare = left.targetatom.localeCompare(
            right.targetatom,
            undefined,
            {
              sensitivity: "base",
            },
          );
          if (targetCompare !== 0) return targetCompare;
          return left.corestate.localeCompare(right.corestate, undefined, {
            sensitivity: "base",
          });
        });
        return { edges };
      },
      3600,
    );
    return loadCached();
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
      await ensureAtlasDatasetId(ctx.db, experiment.id);

      return experiment;
    }),

  createWithSpectrum: contributeWriteProcedure
    .input(createWithSpectrumInputSchema)
    .mutation(async ({ ctx, input }) =>
      createExperimentWithSpectrumDetailed(
        { db: ctx.db, userId: ctx.userId },
        input,
      ),
    ),

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

  /**
   * Loads edge, instrument, and measurement-mode descriptors for one experiment.
   * Used by browse/molecule dataset panels so authorized editors can correct broken ingest metadata.
   */
  getDescriptors: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const experiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: {
          id: true,
          experimenttype: true,
          edgeid: true,
          instrumentid: true,
          nexafsexperimentkindid: true,
          calibrationid: true,
          edges: {
            select: { id: true, targetatom: true, corestate: true },
          },
          instruments: {
            select: {
              id: true,
              name: true,
              facilities: { select: { name: true } },
            },
          },
          nexafsexperimentkind: {
            select: { id: true, token: true, label: true },
          },
          calibrationmethods: {
            select: { id: true, name: true },
          },
          samples: {
            select: {
              id: true,
              processmethod: true,
              substrate: true,
              patterninglayer: true,
              solvent: true,
              thickness: true,
              molecularweight: true,
              vendors: { select: { name: true, url: true } },
              sampleaux: true,
              molecules: {
                select: {
                  id: true,
                  iupacname: true,
                  chemicalformula: true,
                  casnumber: true,
                  inchi: true,
                  moleculesynonyms: {
                    select: { synonym: true },
                    orderBy: [{ order: "asc" }, { synonym: "asc" }],
                    take: 6,
                  },
                },
              },
            },
          },
          experimentpublications: {
            where: { role: "source" },
            select: {
              publications: {
                select: {
                  doi: true,
                  title: true,
                  journal: true,
                  year: true,
                },
              },
            },
          },
        },
      });
      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      const energyAgg = await ctx.db.spectrumpoints.aggregate({
        where: { experimentid: input.experimentId },
        _min: { energyev: true },
        _max: { energyev: true },
      });
      const sample = experiment.samples;
      const molecule = sample.molecules;
      return {
        experimentId: experiment.id,
        edgeId: experiment.edgeid,
        instrumentId: experiment.instrumentid,
        experimentType: experiment.experimenttype,
        nexafsExperimentKindId: experiment.nexafsexperimentkindid,
        spectrumEnergyMin: energyAgg._min.energyev ?? null,
        spectrumEnergyMax: energyAgg._max.energyev ?? null,
        edge: {
          id: experiment.edges.id,
          targetatom: experiment.edges.targetatom,
          corestate: experiment.edges.corestate,
        },
        instrument: {
          id: experiment.instruments.id,
          name: experiment.instruments.name,
          facilityName: experiment.instruments.facilities?.name ?? null,
        },
        experimentKind: experiment.nexafsexperimentkind
          ? {
              id: experiment.nexafsexperimentkind.id,
              token: experiment.nexafsexperimentkind.token,
              label: experiment.nexafsexperimentkind.label,
            }
          : null,
        calibration: experiment.calibrationmethods
          ? {
              id: experiment.calibrationmethods.id,
              name: experiment.calibrationmethods.name,
            }
          : null,
        molecule: {
          id: molecule.id,
          iupacName: molecule.iupacname,
          chemicalFormula: molecule.chemicalformula,
          casNumber: molecule.casnumber,
          inchi: molecule.inchi,
          synonyms: molecule.moleculesynonyms.map((row) => row.synonym),
        },
        sample: {
          id: sample.id,
          processMethod: sample.processmethod,
          substrate: sample.substrate,
          patterningLayer: sample.patterninglayer,
          solvent: sample.solvent,
          thickness: sample.thickness,
          molecularWeight: sample.molecularweight,
          vendorName: sample.vendors?.name ?? null,
          vendorUrl: sample.vendors?.url ?? null,
          aux: sample.sampleaux
            ? sampleAuxFieldsFromPrismaRow(sample.sampleaux)
            : null,
        },
        sourcePublications: experiment.experimentpublications.map((row) => ({
          doi: row.publications.doi,
          title: row.publications.title,
          journal: row.publications.journal,
          year: row.publications.year,
        })),
      };
    }),

  /**
   * Updates edge, instrument, and/or measurement mode (`ExperimentType` + linked
   * `nexafsexperimentkinds` row) for an experiment the caller may edit.
   * Requires contribute-write enrollment and {@link assertUserMayEditExperiment}.
   */
  updateDescriptors: contributeWriteProcedure
    .input(
      z
        .object({
          experimentId: z.string().uuid(),
          edgeId: z.string().uuid().optional(),
          instrumentId: z.string().min(1).optional(),
          experimentType: z.nativeEnum(ExperimentType).optional(),
        })
        .refine(
          (value) =>
            value.edgeId !== undefined ||
            value.instrumentId !== undefined ||
            value.experimentType !== undefined,
          {
            message:
              "Provide at least one of edgeId, instrumentId, or experimentType",
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      const existing = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (input.edgeId !== undefined) {
        const edge = await ctx.db.edges.findUnique({
          where: { id: input.edgeId },
          select: { id: true, targetatom: true, corestate: true },
        });
        if (!edge) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Edge not found",
          });
        }

        const energyAgg = await ctx.db.spectrumpoints.aggregate({
          where: { experimentid: input.experimentId },
          _min: { energyev: true },
          _max: { energyev: true },
        });
        const minEv = energyAgg._min.energyev;
        const maxEv = energyAgg._max.energyev;
        if (
          minEv != null &&
          maxEv != null &&
          Number.isFinite(minEv) &&
          Number.isFinite(maxEv)
        ) {
          const consistency = evaluateEdgeEnergyConsistency({
            edgeLabel: edgeLabelFromAtomCore(edge.targetatom, edge.corestate),
            minEv,
            maxEv,
          });
          if (!consistency.ok) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: consistency.message,
            });
          }
        }
      }

      if (input.instrumentId !== undefined) {
        const instrument = await ctx.db.instruments.findUnique({
          where: { id: input.instrumentId },
          select: { id: true },
        });
        if (!instrument) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Instrument not found",
          });
        }
      }

      let nexafsExperimentKindId: string | null | undefined;
      if (input.experimentType !== undefined) {
        const kind = await ctx.db.nexafsexperimentkinds.findUnique({
          where: { experimenttype: input.experimentType },
          select: { id: true },
        });
        if (!kind) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "NEXAFS experiment kind not found for measurement mode",
          });
        }
        nexafsExperimentKindId = kind.id;
      }

      const updated = await ctx.db.experiments.update({
        where: { id: input.experimentId },
        data: {
          ...(input.edgeId !== undefined ? { edgeid: input.edgeId } : {}),
          ...(input.instrumentId !== undefined
            ? { instrumentid: input.instrumentId }
            : {}),
          ...(input.experimentType !== undefined
            ? {
                experimenttype: input.experimentType,
                nexafsexperimentkindid: nexafsExperimentKindId ?? null,
              }
            : {}),
          updatedat: new Date(),
        },
        select: {
          id: true,
          experimenttype: true,
          edgeid: true,
          instrumentid: true,
          nexafsexperimentkindid: true,
          edges: {
            select: { id: true, targetatom: true, corestate: true },
          },
          instruments: {
            select: {
              id: true,
              name: true,
              facilities: { select: { name: true } },
            },
          },
          nexafsexperimentkind: {
            select: { id: true, token: true, label: true },
          },
        },
      });

      scheduleZenodoDepositSync(ctx.db, input.experimentId, {
        mode: "metadata",
      });

      return {
        experimentId: updated.id,
        edgeId: updated.edgeid,
        instrumentId: updated.instrumentid,
        experimentType: updated.experimenttype,
        nexafsExperimentKindId: updated.nexafsexperimentkindid,
        edge: {
          id: updated.edges.id,
          targetatom: updated.edges.targetatom,
          corestate: updated.edges.corestate,
        },
        instrument: {
          id: updated.instruments.id,
          name: updated.instruments.name,
          facilityName: updated.instruments.facilities?.name ?? null,
        },
        experimentKind: updated.nexafsexperimentkind
          ? {
              id: updated.nexafsexperimentkind.id,
              token: updated.nexafsexperimentkind.token,
              label: updated.nexafsexperimentkind.label,
            }
          : null,
      };
    }),

  /**
   * Replaces all `peaksets` rows for an experiment the caller may edit.
   * Empty `peaks` clears assignments. Requires contribute-write enrollment and
   * {@link assertUserMayEditExperiment}.
   */
  replacePeaksets: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        peaks: z.array(
          z.object({
            energy: z.number().finite(),
            intensity: z.number().finite().optional(),
            peakKind: z.string().nullable().optional(),
            bond: z.string().optional(),
            transition: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      const existing = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      const rows = input.peaks.map((peak) => {
        const mapped = plotPeakToPeaksetWrite(peak);
        return {
          experimentid: input.experimentId,
          energyev: mapped.energyev,
          intensity: mapped.intensity,
          bond: mapped.bond,
          transition: mapped.transition,
        };
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.peaksets.deleteMany({
          where: { experimentid: input.experimentId },
        });
        if (rows.length > 0) {
          await tx.peaksets.createMany({ data: rows });
        }
      });

      await syncAfterEdit({ experimentId: input.experimentId, bump: null });

      return { count: rows.length };
    }),

  setAtlasTeamVerification: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        verified: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.tokenScopes !== null) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Atlas team verification is only available from the website",
        });
      }
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

      await syncAfterEdit({ experimentId: input.experimentId, bump: null });

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

  /**
   * Finds experiments on the same molecule that the signed-in contributor is
   * already associated with, overlap the uploaded energy span, share detection
   * mode when both are set, and have overlapping polarization geometries.
   */
  findSimilarForContributor: protectedProcedure
    .input(
      z.object({
        moleculeId: z.string().uuid(),
        minEv: z.number().finite(),
        maxEv: z.number().finite(),
        limit: z.number().int().min(1).max(20).default(5),
        geometryKeys: z.array(z.string().min(1)).max(64).optional(),
        experimentType: z.enum(NEXAFS_MERGE_EXPERIMENT_TYPES).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const spanMin = Math.min(input.minEv, input.maxEv);
      const spanMax = Math.max(input.minEv, input.maxEv);
      const orcid = ctx.userId;
      const uploadType = parseNexafsMergeExperimentType(input.experimentType);
      const uploadGeometryKeys = input.geometryKeys ?? [];
      const candidates = await ctx.db.experiments.findMany({
        where: {
          samples: { moleculeid: input.moleculeId },
          OR: [
            { createdby: orcid },
            {
              experimentcontributors: {
                some: {
                  OR: [{ orcidid: orcid }, { userid: orcid }],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          canonicalslug: true,
          experimenttype: true,
        },
        take: 80,
        orderBy: { createdat: "desc" },
      });
      if (candidates.length === 0) {
        return { matches: [] as DatasetSimilarityMatch[] };
      }
      const ids = candidates.map((row) => row.id);
      const energyRows = await ctx.db.spectrumpoints.groupBy({
        by: ["experimentid"],
        where: { experimentid: { in: ids } },
        _min: { energyev: true },
        _max: { energyev: true },
      });
      const energyById = new Map(
        energyRows.map((row) => [
          row.experimentid,
          {
            minEv: row._min.energyev,
            maxEv: row._max.energyev,
          },
        ]),
      );
      const geometryById = await geometryKeysByExperimentId(ctx.db, ids);
      const matches: DatasetSimilarityMatch[] = [];
      for (const candidate of candidates) {
        const energy = energyById.get(candidate.id);
        if (
          energy?.minEv == null ||
          energy.maxEv == null ||
          !Number.isFinite(energy.minEv) ||
          !Number.isFinite(energy.maxEv)
        ) {
          continue;
        }
        const score = energySpanJaccard(
          spanMin,
          spanMax,
          energy.minEv,
          energy.maxEv,
        );
        if (score <= 0) {
          continue;
        }
        if (uploadGeometryKeys.length > 0 || uploadType != null) {
          const candidacy = evaluateMergeCandidacy({
            energyScore: score,
            energyThreshold: DATASET_SIMILARITY_WARN_THRESHOLD,
            geometryKeysA: uploadGeometryKeys,
            geometryKeysB: geometryById.get(candidate.id) ?? [],
            experimentTypeA: uploadType,
            experimentTypeB: parseNexafsMergeExperimentType(
              candidate.experimenttype,
            ),
          });
          if (!candidacy.ok) {
            continue;
          }
        }
        matches.push({
          experimentId: candidate.id,
          canonicalSlug: candidate.canonicalslug,
          score,
          minEv: energy.minEv,
          maxEv: energy.maxEv,
        });
      }
      matches.sort((left, right) => right.score - left.score);
      return { matches: matches.slice(0, input.limit) };
    }),

  /**
   * Lists pairwise similar experiments on a molecule that the session user may
   * edit on both sides (energy Jaccard, same detection mode, overlapping
   * geometries).
   */
  listSimilarPairsForMolecule: protectedProcedure
    .input(
      z.object({
        moleculeId: z.string().uuid(),
        threshold: z
          .number()
          .finite()
          .min(0)
          .max(1)
          .default(DATASET_SIMILARITY_WARN_THRESHOLD),
        limit: z.number().int().min(1).max(20).default(12),
        candidateCap: z.number().int().min(2).max(40).default(40),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orcid = ctx.userId;
      const candidates = await ctx.db.experiments.findMany({
        where: {
          samples: { moleculeid: input.moleculeId },
          OR: [
            { createdby: orcid },
            {
              experimentcontributors: {
                some: {
                  OR: [{ orcidid: orcid }, { userid: orcid }],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          canonicalslug: true,
          createdat: true,
          experimenttype: true,
        },
        take: input.candidateCap,
        orderBy: { createdat: "desc" },
      });

      const editable: typeof candidates = [];
      for (const row of candidates) {
        if (await userMayEditExperiment(ctx.db, orcid, row.id)) {
          editable.push(row);
        }
      }
      if (editable.length < 2) {
        return { pairs: [] as DatasetSimilarPair[] };
      }

      const ids = editable.map((row) => row.id);
      const energyRows = await ctx.db.spectrumpoints.groupBy({
        by: ["experimentid"],
        where: { experimentid: { in: ids } },
        _min: { energyev: true },
        _max: { energyev: true },
      });
      const energyById = new Map(
        energyRows.map((row) => [
          row.experimentid,
          {
            minEv: row._min.energyev,
            maxEv: row._max.energyev,
          },
        ]),
      );
      const geometryKeysById = await geometryKeysByExperimentId(ctx.db, ids);
      const pairs = enumerateDatasetSimilarPairs({
        rows: editable.map((row) => ({
          id: row.id,
          canonicalslug: row.canonicalslug,
          createdat: row.createdat,
          experimenttype: parseNexafsMergeExperimentType(row.experimenttype),
        })),
        energyById,
        geometryKeysById,
        threshold: input.threshold,
      });
      return { pairs: pairs.slice(0, input.limit) };
    }),

  /**
   * Absorbs a redundant experiment into a keep experiment (geometry + metadata),
   * then hard-deletes the absorb row. Requires edit rights on both and AAL2.
   */
  mergeRedundant: destructiveWriteProcedure
    .input(
      z.object({
        keepExperimentId: z.string().uuid(),
        absorbExperimentId: z.string().uuid(),
        geometryResolutions: z.array(
          z.object({
            key: z.string().min(1),
            source: z.enum(["keep", "absorb"]),
          }),
        ),
        metadataResolutions: z.array(
          z.object({
            field: z.enum([
              "edge",
              "instrument",
              "type",
              "researchers",
              "substrate",
              "processMethod",
              "thickness",
              "solvent",
              "patterningLayer",
            ]),
            source: z.enum(["keep", "absorb", "both"]),
          }),
        ),
        attributionsWhenBoth: z
          .array(
            z.object({
              orcid: orcidUserIdSchema,
              role: experimentAttributionRoleSchema,
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return mergeRedundantExperiments(ctx.db, {
        keepExperimentId: input.keepExperimentId,
        absorbExperimentId: input.absorbExperimentId,
        geometryResolutions: input.geometryResolutions,
        metadataResolutions: input.metadataResolutions,
        attributionsWhenBoth: input.attributionsWhenBoth,
        actorUserId: ctx.userId,
        requestMeta: auditRequestMetaFromTrpcContext({
          clientIp: ctx.clientIp,
          userAgent: ctx.userAgent,
        }),
      });
    }),

  /**
   * Summarizes similar editable experiment pairs across molecules the session
   * user can edit (for account attributions entry points). Uses the same
   * merge-candidacy gates as molecule similar-pair listing.
   */
  listMySimilarPairsSummary: protectedProcedure
    .input(
      z.object({
        threshold: z
          .number()
          .finite()
          .min(0)
          .max(1)
          .default(DATASET_SIMILARITY_WARN_THRESHOLD),
        sampleLimit: z.number().int().min(1).max(10).default(5),
        moleculeCap: z.number().int().min(1).max(40).default(24),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orcid = ctx.userId;
      const experiments = await ctx.db.experiments.findMany({
        where: {
          OR: [
            { createdby: orcid },
            {
              experimentcontributors: {
                some: {
                  OR: [{ orcidid: orcid }, { userid: orcid }],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          canonicalslug: true,
          createdat: true,
          experimenttype: true,
          samples: {
            select: {
              moleculeid: true,
              molecules: {
                select: {
                  id: true,
                  moleculesynonyms: {
                    orderBy: { order: "asc" },
                    take: 1,
                    select: { slug: true, synonym: true },
                  },
                },
              },
            },
          },
        },
        take: 200,
        orderBy: { createdat: "desc" },
      });

      const byMolecule = new Map<
        string,
        {
          moleculeId: string;
          moleculeSlug: string | null;
          moleculeName: string | null;
          rows: Array<{
            id: string;
            canonicalslug: string | null;
            createdat: Date;
            experimenttype: ReturnType<typeof parseNexafsMergeExperimentType>;
          }>;
        }
      >();

      for (const row of experiments) {
        const moleculeId = row.samples.moleculeid;
        if (!(await userMayEditExperiment(ctx.db, orcid, row.id))) {
          continue;
        }
        const synonym = row.samples.molecules.moleculesynonyms[0];
        const bucket = byMolecule.get(moleculeId) ?? {
          moleculeId,
          moleculeSlug: synonym?.slug ?? null,
          moleculeName: synonym?.synonym ?? null,
          rows: [],
        };
        bucket.rows.push({
          id: row.id,
          canonicalslug: row.canonicalslug,
          createdat: row.createdat,
          experimenttype: parseNexafsMergeExperimentType(row.experimenttype),
        });
        byMolecule.set(moleculeId, bucket);
      }

      const moleculeEntries = [...byMolecule.values()].slice(
        0,
        input.moleculeCap,
      );
      const samples: Array<{
        moleculeId: string;
        moleculeSlug: string | null;
        moleculeName: string | null;
        pair: DatasetSimilarPair;
      }> = [];
      let totalPairs = 0;

      for (const molecule of moleculeEntries) {
        if (molecule.rows.length < 2) {
          continue;
        }
        const ids = molecule.rows.map((r) => r.id);
        const energyRows = await ctx.db.spectrumpoints.groupBy({
          by: ["experimentid"],
          where: { experimentid: { in: ids } },
          _min: { energyev: true },
          _max: { energyev: true },
        });
        const energyById = new Map(
          energyRows.map((row) => [
            row.experimentid,
            {
              minEv: row._min.energyev,
              maxEv: row._max.energyev,
            },
          ]),
        );
        const geometryKeysById = await geometryKeysByExperimentId(ctx.db, ids);
        const moleculePairs = enumerateDatasetSimilarPairs({
          rows: molecule.rows,
          energyById,
          geometryKeysById,
          threshold: input.threshold,
        });
        totalPairs += moleculePairs.length;
        for (const pair of moleculePairs) {
          if (samples.length >= input.sampleLimit) {
            break;
          }
          samples.push({
            moleculeId: molecule.moleculeId,
            moleculeSlug: molecule.moleculeSlug,
            moleculeName: molecule.moleculeName,
            pair,
          });
        }
      }

      return { totalPairs, samples };
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

      scheduleZenodoDepositSync(ctx.db, input.experimentId, {
        mode: "metadata",
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
        select: { id: true, experimentid: true },
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
      const experimentIds = [
        ...new Set(targetRows.map((row) => row.experimentid)),
      ];
      for (const experimentId of experimentIds) {
        scheduleZenodoDepositSync(ctx.db, experimentId, { mode: "metadata" });
      }
      return { updatedCount: update.count };
    }),

  confirmClaimContributions: protectedProcedure
    .input(
      z.object({
        experimentIds: contributionBatchExperimentIdsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetRows = await ctx.db.experimentcontributors.findMany({
        where: {
          experimentid: { in: input.experimentIds },
          orcidid: ctx.userId,
        },
        select: { experimentid: true },
      });
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
      const experimentIds = [
        ...new Set(targetRows.map((row) => row.experimentid)),
      ];
      for (const experimentId of experimentIds) {
        scheduleZenodoDepositSync(ctx.db, experimentId, { mode: "metadata" });
      }
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

  /**
   * Previews the version bump a set of changes would cause for one experiment.
   * Requires contribute-write enrollment and {@link assertUserMayEditExperiment}.
   * `willMintDoi` equals `hasDeposit`: a bump never creates a first Zenodo deposit.
   */
  previewVersionBump: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        changes: z.array(datasetChangeKindSchema).min(1).max(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);
      const current = await readDatasetVersion(ctx.db, input.experimentId);
      const { level } = resolveBumpLevel(input.changes);
      const hasDeposit = await experimentHasZenodoDeposit(
        ctx.db,
        input.experimentId,
      );
      return {
        currentVersion: formatDatasetVersion(current),
        nextVersion: formatDatasetVersion(nextDatasetVersion(current, level)),
        level,
        hasDeposit,
        willMintDoi: hasDeposit,
      };
    }),

  updateNormalizationMetadata: contributeWriteProcedure
    .input(
      z.object({
        experimentId: z.string().uuid(),
        normalization: normalizationSchema,
        uploadedChannels: z
          .array(z.enum(["rawabs", "od", "massabsorption", "beta"]))
          .optional(),
        reason: z.string().trim().min(1).optional(),
        confirmVersionBump: confirmVersionBumpSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingExperiment = await ctx.db.experiments.findUnique({
        where: { id: input.experimentId },
        select: {
          id: true,
          normalizationscope: true,
          normalizationranges: true,
          uploadedchannels: true,
        },
      });
      if (!existingExperiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      // An omitted channel list keeps the stored one; defaulting to rawabs alone would
      // silently mark every uploaded OD, mass absorption, and beta column as derived.
      const storedChannels = storedUploadedChannels(
        existingExperiment.uploadedchannels,
      );
      const uploadedChannels = Array.from(
        new Set<UploadedChannel>([
          ...(input.uploadedChannels ?? storedChannels),
          "rawabs",
        ]),
      );
      const ranges: NormalizationRanges = input.normalization.ranges ?? null;
      const requestedState = canonicalJsonChecksum(
        JSON.parse(
          JSON.stringify({
            scope: input.normalization.scope,
            ranges,
            uploadedChannels: [...uploadedChannels].sort(),
          }),
        ) as Prisma.InputJsonValue,
      );
      const storedState = canonicalJsonChecksum(
        JSON.parse(
          JSON.stringify({
            scope: String(existingExperiment.normalizationscope),
            ranges: existingExperiment.normalizationranges ?? null,
            uploadedChannels: Array.from(
              new Set<UploadedChannel>([...storedChannels, "rawabs"]),
            ).sort(),
          }),
        ) as Prisma.InputJsonValue,
      );
      if (requestedState === storedState) {
        // Identical scope, windows, and channels are not a numerical change: no revision,
        // no version bump, and no new Zenodo version.
        return ctx.db.experiments.findUniqueOrThrow({
          where: { id: input.experimentId },
        });
      }
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

      const derivedOutput = JSON.parse(
        JSON.stringify({
          normalizationscope: input.normalization.scope,
          normalizationranges: ranges,
          uploadedchannels: uploadedChannels,
          channelprovenance: channelProvenance,
          validationsummary: validationSummary,
          qualityscores: qualityScores,
        }),
      ) as Prisma.InputJsonValue;

      const updated = await ctx.db.$transaction(async (tx) => {
        const row = await tx.experiments.update({
          where: { id: input.experimentId },
          data: {
            normalizationscope: input.normalization.scope,
            normalizationranges: ranges as unknown as Prisma.InputJsonValue,
            uploadedchannels:
              uploadedChannels as unknown as Prisma.InputJsonValue,
            channelprovenance:
              channelProvenance as unknown as Prisma.InputJsonValue,
            validationsummary:
              validationSummary as unknown as Prisma.InputJsonValue,
            qualityscores: qualityScores as unknown as Prisma.InputJsonValue,
          },
        });
        const bump = await applyVersionedChange(tx, {
          experimentId: input.experimentId,
          actorUserId: ctx.userId,
          changes: ["normalization"],
          parameters: JSON.parse(
            JSON.stringify({
              normalization: {
                scope: input.normalization.scope,
                ranges,
              },
              uploadedChannels,
              reason: input.reason ?? null,
            }),
          ) as Prisma.InputJsonValue,
          derivedChecksum: canonicalJsonChecksum(derivedOutput),
          confirmFromVersion: input.confirmVersionBump.fromVersion,
        });
        return { row, bump };
      });

      await syncAfterEdit({
        experimentId: input.experimentId,
        bump: { to: updated.bump.to },
      });

      // The bump and its Zenodo job are already committed; a metrics recompute failure must
      // not report the edit as failed (a retry would hit a stale-version conflict).
      try {
        await persistExperimentMetricsTables(ctx.db, input.experimentId);
      } catch (error) {
        console.error("[experiments] metrics recompute failed after bump", {
          experimentId: input.experimentId,
          error,
        });
      }

      return updated.row;
    }),

  update: contributeWriteProcedure
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
        select: { id: true },
      });
      if (!existingExperiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }
      await assertUserMayEditExperiment(ctx.db, ctx.userId, id);

      const experiment = await ctx.db.experiments.update({
        where: { id },
        data: updateData,
        include: {
          samples: true,
          edges: true,
          instruments: true,
        },
      });

      if (input.experimenttype !== undefined) {
        await syncAfterEdit({ experimentId: id, bump: null });
      }

      return experiment;
    }),

  remove: destructiveWriteProcedure
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

  transferOwnership: destructiveWriteProcedure
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

  getDeleteDataPointImpact: protectedProcedure
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

  removeCollector: destructiveWriteProcedure
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
      const publications = rows.map((row) =>
        mapPublicationCitationToOutput(row),
      );
      const primaryDoi =
        metrics?.originaldatadoi?.trim() ?? publications[0]?.doi ?? "";
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

      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

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

      scheduleZenodoDepositSync(ctx.db, input.experimentId, {
        mode: "metadata",
      });

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

      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      const primaryDoi = await removeExperimentSourcePublication(
        ctx.db,
        input.experimentId,
        input.doi,
      );
      const rows = await listExperimentSourcePublications(
        ctx.db,
        input.experimentId,
      );

      scheduleZenodoDepositSync(ctx.db, input.experimentId, {
        mode: "metadata",
      });

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

      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      const citation = await resolvePublicationDoi(input.doi);
      if (!citation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Source publication DOI was not found in Crossref or DataCite. Check the identifier or try again later.",
        });
      }

      await syncExperimentSourcePaperDoi(ctx.db, input.experimentId, citation);

      const metrics = await ctx.db.experimentmetrics.findUnique({
        where: { experimentid: input.experimentId },
        select: {
          originaldatadoi: true,
          hasoriginaldatadoi: true,
          sourcepaperdoiverified: true,
        },
      });

      scheduleZenodoDepositSync(ctx.db, input.experimentId, {
        mode: "metadata",
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

      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);

      await clearExperimentSourcePaperDoi(ctx.db, input.experimentId);

      scheduleZenodoDepositSync(ctx.db, input.experimentId, {
        mode: "metadata",
      });

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

  /**
   * Mints (or resumes) a Zenodo dataset DOI for an experiment the caller may edit.
   * Non-blocking for contribute UX: returns failure state instead of failing the upload.
   */
  mintZenodoDatasetDoi: contributeWriteProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertUserMayEditExperiment(ctx.db, ctx.userId, input.experimentId);
      const result = await mintExperimentDatasetDoi(ctx.db, input.experimentId);
      return {
        experimentId: input.experimentId,
        mintingEnabled: isZenodoMintingEnabled(),
        state: result.state,
        doi: result.doi,
        recordUrl: result.recordUrl,
        error: result.error,
        zenodoDepositionId: result.zenodoDepositionId,
      };
    }),

  /**
   * Public deposit status for browse UI polling while a Zenodo mint is in flight.
   * Stale `pending`/`depositing` rows are coerced to failed so clients exit busy.
   */
  getZenodoDepositStatus: publicProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [deposit, metrics] = await Promise.all([
        ctx.db.experimentzenododeposits.findUnique({
          where: { experimentid: input.experimentId },
          select: {
            state: true,
            doi: true,
            recordurl: true,
            errormessage: true,
            zenododepositionid: true,
            publishedat: true,
            attemptcount: true,
            lastattemptat: true,
          },
        }),
        ctx.db.experimentmetrics.findUnique({
          where: { experimentid: input.experimentId },
          select: {
            datasetdoi: true,
            hasdatasetdoi: true,
          },
        }),
      ]);

      if (!deposit && !metrics?.datasetdoi) {
        return {
          experimentId: input.experimentId,
          mintingEnabled: isZenodoMintingEnabled(),
          state: null as
            | "pending"
            | "depositing"
            | "published"
            | "failed"
            | null,
          doi: null as string | null,
          recordUrl: null as string | null,
          error: null as string | null,
          publishedAt: null as string | null,
          attemptCount: 0,
          lastAttemptAt: null as string | null,
        };
      }

      const doi = deposit?.doi ?? metrics?.datasetdoi ?? null;
      const rawState = deposit?.state ?? (doi ? ("published" as const) : null);
      const state = coerceZenodoDepositUiState({
        state: rawState,
        lastAttemptAt: deposit?.lastattemptat ?? null,
        attemptCount: deposit?.attemptcount ?? 0,
      });
      const staleFailed =
        state === "failed" &&
        (rawState === "pending" || rawState === "depositing");
      const depositError = deposit?.errormessage?.trim() ?? "";

      return {
        experimentId: input.experimentId,
        mintingEnabled: isZenodoMintingEnabled(),
        state,
        doi,
        recordUrl: deposit?.recordurl ?? null,
        error: staleFailed
          ? depositError.length > 0
            ? depositError
            : "Zenodo mint stalled (no progress within the expected window)"
          : (deposit?.errormessage ?? null),
        publishedAt: deposit?.publishedat?.toISOString() ?? null,
        attemptCount: deposit?.attemptcount ?? 0,
        lastAttemptAt: deposit?.lastattemptat?.toISOString() ?? null,
      };
    }),
});
