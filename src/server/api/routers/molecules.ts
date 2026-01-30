import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { moleculeUploadSchema, moleculeUploadDataToPrismaInput } from "~/types/upload";
import { uploadMoleculeImage, deleteMoleculeImage } from "~/server/storage";
import type { db } from "~/server/db";
import { isDevMockUser } from "~/lib/dev-mock-data";

async function checkCanEdit(
  prisma: typeof db,
  moleculeId: string,
  userId: string,
  createdby: string | null,
): Promise<boolean> {
  if (createdby === userId) return true;
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { orcid: true },
  });
  if (!userRow?.orcid) return false;
  const contributor = await prisma.moleculecontributors.findUnique({
    where: {
      moleculeid_userid: { moleculeid: moleculeId, userid: userId },
    },
  });
  return !!contributor;
}

export const moleculesRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, "Query is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const searchTerm = input.query.trim();

      // Use PostgreSQL full-text search with GIN indexes for optimal performance
      // Searches across: iupacname + chemicalformula (idx_molecule_ft), synonyms (idx_moleculeSynonym_ft), and CAS number (exact)
      const allMolecules = await ctx.db.$queryRaw<
        Array<{
          id: string;
          iupacname: string;
          inchi: string;
          smiles: string;
          chemicalformula: string;
          casnumber: string | null;
          pubchemcid: string | null;
          imageurl: string | null;
          createdat: Date;
          updatedat: Date;
          relevance: number;
        }>
      >`
        WITH search_results AS (
          -- Full-text search on molecules (uses idx_molecule_ft)
          SELECT
            m.*,
            ts_rank(
              to_tsvector('english', m.iupacname || ' ' || COALESCE(m.chemicalformula, '')),
              plainto_tsquery('english', ${searchTerm})
            ) as relevance
          FROM "molecules" m
          WHERE
            to_tsvector('english', m.iupacname || ' ' || COALESCE(m.chemicalformula, ''))
            @@ plainto_tsquery('english', ${searchTerm})
          OR
            -- Exact CAS number match (fast with unique index)
            LOWER(COALESCE(m.casnumber, '')) = LOWER(${searchTerm})
          OR
            -- Full-text search on synonyms (uses idx_moleculeSynonym_ft)
            EXISTS (
              SELECT 1 FROM "moleculesynonyms" ms
              WHERE ms."moleculeid" = m."id"
              AND to_tsvector('english', ms.synonym)
              @@ plainto_tsquery('english', ${searchTerm})
            )
        )
        SELECT * FROM search_results
        ORDER BY relevance DESC, iupacname ASC
        LIMIT 10
      `;

      if (allMolecules.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No molecules found in database",
        });
      }

      // Get the best match (highest relevance)
      const molecule = allMolecules[0];
      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No molecules found in database",
        });
      }

      // Get synonyms for this molecule, prioritizing order=0 (primary name)
      const synonyms = await ctx.db.moleculesynonyms.findMany({
        where: { moleculeid: molecule.id },
        select: { synonym: true, order: true },
        orderBy: [{ order: "asc" }, { synonym: "asc" }], // Order=0 first, then alphabetical
      });

      // Find primary synonym (order=0) or use first one, fallback to IUPAC name
      const primarySynonym = synonyms.find((s) => s.order === 0);
      const commonName =
        primarySynonym?.synonym ?? synonyms[0]?.synonym ?? molecule.iupacname;

      return {
        ok: true,
        data: {
          id: molecule.id,
          iupacName: molecule.iupacname,
          commonName,
          synonyms: synonyms.map((s) => s.synonym),
          inchi: molecule.inchi,
          smiles: molecule.smiles,
          chemicalFormula: molecule.chemicalformula,
          casNumber: molecule.casnumber,
          pubChemCid: molecule.pubchemcid,
          imageUrl: molecule.imageurl ?? undefined,
          source: "database",
        },
      };
    }),

  create: protectedProcedure
    .input(moleculeUploadSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if molecule already exists by searching for one with matching IUPAC name
      const existingMolecule = await ctx.db.molecules.findFirst({
        where: { iupacname: input.iupacName },
      });

      if (existingMolecule) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A molecule with this IUPAC name already exists",
        });
      }

      // Convert to Prisma input format
      const prismaInput = moleculeUploadDataToPrismaInput(input);

      // Validate required fields
      if (!prismaInput.iupacname?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "IUPAC name cannot be empty",
        });
      }
      if (!prismaInput.inchi?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "InChI cannot be empty",
        });
      }
      if (!prismaInput.smiles?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SMILES cannot be empty",
        });
      }
      if (!prismaInput.chemicalformula?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chemical formula cannot be empty",
        });
      }
      if (
        !prismaInput.moleculesynonyms ||
        !Array.isArray(prismaInput.moleculesynonyms.create) ||
        prismaInput.moleculesynonyms.create.length === 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one synonym (common name) is required",
        });
      }

      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const tagIds = input.tagIds ?? [];
      const molecule = await ctx.db.molecules.create({
        data: {
          ...prismaInput,
          createdby: ctx.userId,
          moleculecontributors: {
            create: {
              userid: ctx.userId,
              contributiontype: "creator",
            },
          },
          ...(tagIds.length > 0
            ? {
                moleculetags: {
                  create: tagIds.map((tagId) => ({
                    tagid: tagId,
                  })),
                },
              }
            : {}),
        },
      });

      return {
        success: true,
        molecule: {
          id: molecule.id,
          iupacName: molecule.iupacname,
        },
        updated: false,
      };
    }),

  uploadImage: protectedProcedure
    .input(
      z.object({
        moleculeId: z.string().uuid(),
        imageData: z.string(), // Base64-encoded image data (data:image/jpeg;base64,...)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if molecule exists
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: input.moleculeId },
      });

      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Molecule not found",
        });
      }

      // Parse base64 data URL
      const base64Regex = /^data:([^;]+);base64,(.+)$/;
      const base64Match = base64Regex.exec(input.imageData);
      if (!base64Match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid image data format. Expected data URL with base64 encoding.",
        });
      }

      const [, mimeType, base64Data] = base64Match;
      const imageBuffer = Buffer.from(base64Data ?? "", "base64");

      // Delete old image if it exists
      if (molecule.imageurl) {
        try {
          await deleteMoleculeImage(molecule.imageurl);
        } catch (error) {
          // Log error but continue - deletion failure shouldn't block upload
          console.error("Failed to delete old image:", error);
        }
      }

      // Upload new image
      const imageUrl = await uploadMoleculeImage(
        input.moleculeId,
        imageBuffer,
        mimeType ?? "",
      );

      // Update molecule with image URL
      const updatedMolecule = await ctx.db.molecules.update({
        where: { id: input.moleculeId },
        data: { imageurl: imageUrl },
      });

      return {
        success: true,
        imageUrl: updatedMolecule.imageurl,
      };
    }),

  deleteImage: protectedProcedure
    .input(z.object({ moleculeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if molecule exists
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: input.moleculeId },
      });

      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Molecule not found",
        });
      }

      if (!molecule.imageurl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Molecule has no image to delete",
        });
      }

      // Delete image from storage
      await deleteMoleculeImage(molecule.imageurl);

      // Update molecule to remove image URL
      await ctx.db.molecules.update({
        where: { id: input.moleculeId },
        data: { imageurl: null },
      });

      return {
        success: true,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: input.id },
        include: {
          moleculesynonyms: {
            orderBy: [{ order: "asc" }, { synonym: "asc" }],
          },
          samples: true,
          moleculecontributors: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
            orderBy: { contributedat: "asc" },
          },
          moleculetags: {
            include: { tags: true },
          },
        },
      });

      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Molecule not found",
        });
      }

      let userHasFavorited = false;
      if (ctx.userId) {
        const favorite = await ctx.db.moleculefavorites.findUnique({
          where: {
            moleculeid_userid: {
              moleculeid: molecule.id,
              userid: ctx.userId,
            },
          },
        });
        userHasFavorited = !!favorite;
      }

      return {
        ...molecule,
        favoriteCount: molecule.favoritecount,
        userHasFavorited,
        contributors: molecule.moleculecontributors.map((c) => ({
          id: c.id,
          userId: c.userid,
          contributionType: c.contributiontype,
          contributedAt: c.contributedat,
          user: c.user,
        })),
        tags: molecule.moleculetags.map((mt) => ({
          id: mt.tags.id,
          name: mt.tags.name,
          slug: mt.tags.slug,
          color: mt.tags.color,
        })),
        viewCount: molecule.viewcount,
      };
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        sortBy: z.enum(["created", "favorites"]).default("created"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderBy =
        input.sortBy === "favorites"
          ? [{ favoritecount: "desc" as const }, { createdat: "desc" as const }]
          : [{ createdat: "desc" as const }];

      const molecules = await ctx.db.molecules.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          moleculesynonyms: {
            orderBy: [{ order: "asc" }], // Order=0 first - we'll sort by length after
          },
        },
        orderBy,
      });

      // Sort synonyms by length (shortest first) within each molecule, keeping order=0 first
      const moleculesWithSortedSynonyms = molecules.map((molecule) => ({
        ...molecule,
        moleculesynonyms: [
          // Order=0 synonyms first
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order === 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
          // Then other synonyms, sorted by length
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order !== 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
        ],
      }));

      let nextCursor: string | undefined = undefined;
      if (moleculesWithSortedSynonyms.length > input.limit) {
        const nextItem = moleculesWithSortedSynonyms.pop();
        nextCursor = nextItem?.id;
      }

      return {
        molecules: moleculesWithSortedSynonyms,
        nextCursor,
      };
    }),

  searchAdvanced: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, "Query is required"),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
        searchCasNumber: z.boolean().default(true),
        searchPubChemCid: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const searchTerm = input.query.trim();
      const searchTermLower = searchTerm.toLowerCase();
      const searchPattern = `${searchTermLower}%`; // For prefix matching

      // Optimized search with prefix matching, full-text search, and early LIMIT
      // Supports partial matches like "IT" matching "ITIC"
      const results = await ctx.db.$queryRaw<
        Array<{
          id: string;
          iupacname: string;
          inchi: string;
          smiles: string;
          chemicalformula: string;
          casnumber: string | null;
          pubchemcid: string | null;
          imageurl: string | null;
          createdat: Date;
          updatedat: Date;
          relevance: number;
          matchtype: string;
        }>
      >`
        WITH candidate_molecules AS (
          SELECT DISTINCT m.*
          FROM "molecules" m
          WHERE
            -- Fast exact matches first (indexed)
            (${input.searchCasNumber} AND LOWER(COALESCE(m.casnumber, '')) = ${searchTermLower})
            OR
            (${input.searchPubChemCid} AND LOWER(COALESCE(m.pubchemcid, '')) = ${searchTermLower})
            OR
            -- Prefix matching on IUPAC name (fast with index on iupacname)
            LOWER(m.iupacname) LIKE ${searchPattern}
            OR
            -- Prefix matching on chemical formula
            LOWER(m.chemicalformula) LIKE ${searchPattern}
            OR
            -- Prefix matching on synonyms (optimized with EXISTS)
            EXISTS (
              SELECT 1 FROM "moleculesynonyms" ms
              WHERE ms."moleculeid" = m."id"
              AND LOWER(ms.synonym) LIKE ${searchPattern}
            )
            OR
            -- Full-text search on molecules (for multi-word queries)
            (LENGTH(${searchTerm}) >= 3 AND to_tsvector('english', m.iupacname || ' ' || COALESCE(m.chemicalformula, ''))
            @@ plainto_tsquery('english', ${searchTerm}))
            OR
            -- Full-text search on synonyms (for multi-word queries)
            (LENGTH(${searchTerm}) >= 3 AND EXISTS (
              SELECT 1 FROM "moleculesynonyms" ms
              WHERE ms."moleculeid" = m."id"
              AND to_tsvector('english', ms.synonym)
              @@ plainto_tsquery('english', ${searchTerm})
            ))
          LIMIT ${input.limit * 5}
        ),
        search_results AS (
          SELECT
            cm.*,
            GREATEST(
              -- Prefix match relevance (higher for exact prefix matches)
              CASE
                WHEN LOWER(cm.iupacname) = ${searchTermLower} THEN 10.0
                WHEN LOWER(cm.iupacname) LIKE ${searchPattern} THEN 5.0
                ELSE 0
              END,
              -- Synonym prefix match relevance
              COALESCE((
                SELECT CASE
                  WHEN LOWER(ms.synonym) = ${searchTermLower} THEN 10.0
                  WHEN LOWER(ms.synonym) LIKE ${searchPattern} THEN 5.0
                  ELSE 0
                END
                FROM "moleculesynonyms" ms
                WHERE ms."moleculeid" = cm."id"
                AND (LOWER(ms.synonym) = ${searchTermLower} OR LOWER(ms.synonym) LIKE ${searchPattern})
                ORDER BY
                  CASE WHEN LOWER(ms.synonym) = ${searchTermLower} THEN 0 ELSE 1 END,
                  ms."order" ASC,
                  LENGTH(ms.synonym) ASC
                LIMIT 1
              ), 0),
              -- Full-text search relevance (only for longer queries)
              CASE WHEN LENGTH(${searchTerm}) >= 3 THEN
                GREATEST(
                  ts_rank(
                    to_tsvector('english', cm.iupacname || ' ' || COALESCE(cm.chemicalformula, '')),
                    plainto_tsquery('english', ${searchTerm})
                  ),
                  COALESCE((
                    SELECT MAX(ts_rank(
                      to_tsvector('english', ms.synonym),
                      plainto_tsquery('english', ${searchTerm})
                    ))
                    FROM "moleculesynonyms" ms
                    WHERE ms."moleculeid" = cm."id"
                    AND to_tsvector('english', ms.synonym) @@ plainto_tsquery('english', ${searchTerm})
                    LIMIT 1
                  ), 0)
                )
              ELSE 0 END
            ) as relevance,
            CASE
              WHEN LOWER(COALESCE(cm.casnumber, '')) = ${searchTermLower} THEN 'cas_exact'
              WHEN ${input.searchPubChemCid} AND LOWER(COALESCE(cm.pubchemcid, '')) = ${searchTermLower} THEN 'pubchem_exact'
              WHEN LOWER(cm.iupacname) = ${searchTermLower} OR EXISTS (
                SELECT 1 FROM "moleculesynonyms" ms
                WHERE ms."moleculeid" = cm."id"
                AND LOWER(ms.synonym) = ${searchTermLower}
              ) THEN 'name_exact'
              WHEN LOWER(cm.iupacname) LIKE ${searchPattern} OR EXISTS (
                SELECT 1 FROM "moleculesynonyms" ms
                WHERE ms."moleculeid" = cm."id"
                AND LOWER(ms.synonym) LIKE ${searchPattern}
              ) THEN 'name_prefix'
              WHEN LENGTH(${searchTerm}) >= 3 AND to_tsvector('english', cm.iupacname || ' ' || COALESCE(cm.chemicalformula, ''))
                   @@ plainto_tsquery('english', ${searchTerm}) THEN 'molecule_fts'
              ELSE 'synonym_fts'
            END as matchtype
          FROM candidate_molecules cm
        )
        SELECT * FROM search_results
        ORDER BY
          CASE matchtype
            WHEN 'cas_exact' THEN 1
            WHEN 'pubchem_exact' THEN 2
            WHEN 'name_exact' THEN 3
            WHEN 'name_prefix' THEN 4
            WHEN 'molecule_fts' THEN 5
            ELSE 6
          END,
          relevance DESC,
          iupacname ASC
        LIMIT ${input.limit}
        OFFSET ${input.offset}
      `;

      // Get synonyms for all results in batch, prioritizing order=0 names
      const moleculeIds = results.map((r) => r.id);
      const allSynonyms = await ctx.db.moleculesynonyms.findMany({
        where: { moleculeid: { in: moleculeIds } },
        select: { moleculeid: true, synonym: true, order: true },
        orderBy: [{ order: "asc" }, { synonym: "asc" }], // Order=0 first, then alphabetical
      });

      // Group synonyms by molecule ID, keeping order=0 separate
      const synonymsByMolecule = allSynonyms.reduce(
        (acc, syn) => {
          acc[syn.moleculeid] ??= { primary: null as string | null, all: [] };
          if (syn.order === 0 && !acc[syn.moleculeid]!.primary) {
            acc[syn.moleculeid]!.primary = syn.synonym;
          }
          acc[syn.moleculeid]!.all.push(syn.synonym);
          return acc;
        },
        {} as Record<string, { primary: string | null; all: string[] }>,
      );

      return {
        results: results.map((molecule) => {
          const synData = synonymsByMolecule[molecule.id] ?? {
            primary: null,
            all: [],
          };
          const commonName =
            synData.primary ?? synData.all[0] ?? molecule.iupacname;

          return {
            id: molecule.id,
            iupacName: molecule.iupacname,
            commonName,
            synonyms: synData.all,
            inchi: molecule.inchi,
            smiles: molecule.smiles,
            chemicalFormula: molecule.chemicalformula,
            casNumber: molecule.casnumber,
            pubChemCid: molecule.pubchemcid,
            imageUrl: molecule.imageurl ?? undefined,
            relevance: molecule.relevance,
            matchType: molecule.matchtype,
          };
        }),
        total: results.length,
        hasMore: results.length === input.limit,
      };
    }),

  getTopFavorited: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const molecules = await ctx.db.molecules.findMany({
        take: input.limit,
        include: {
          moleculesynonyms: {
            orderBy: [{ order: "asc" }],
          },
        },
        orderBy: [{ favoritecount: "desc" }, { createdat: "desc" }],
      });

      const moleculesWithSortedSynonyms = molecules.map((molecule) => ({
        ...molecule,
        moleculesynonyms: [
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order === 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order !== 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
        ],
        favoriteCount: molecule.favoritecount,
      }));

      return {
        molecules: moleculesWithSortedSynonyms,
      };
    }),

  getAllPaginated: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(12),
        offset: z.number().min(0).default(0),
        sortBy: z.enum(["favorites", "created", "name"]).default("favorites"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderBy =
        input.sortBy === "favorites"
          ? [{ favoritecount: "desc" as const }, { createdat: "desc" as const }]
          : input.sortBy === "name"
            ? [{ iupacname: "asc" as const }]
            : [{ createdat: "desc" as const }];

      const [molecules, totalCount] = await Promise.all([
        ctx.db.molecules.findMany({
          take: input.limit,
          skip: input.offset,
          include: {
            moleculesynonyms: {
              orderBy: [{ order: "asc" }],
            },
          },
          orderBy,
        }),
        ctx.db.molecules.count(),
      ]);

      const moleculesWithSortedSynonyms = molecules.map((molecule) => ({
        ...molecule,
        moleculesynonyms: [
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order === 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order !== 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
        ],
        favoriteCount: molecule.favoritecount,
      }));

      return {
        molecules: moleculesWithSortedSynonyms,
        total: totalCount,
        hasMore: input.offset + molecules.length < totalCount,
      };
    }),

  canEdit: protectedProcedure
    .input(z.object({ moleculeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: input.moleculeId },
        select: { createdby: true },
      });
      if (!molecule || !ctx.userId) return { canEdit: false };
      const allowed = await checkCanEdit(
        ctx.db,
        input.moleculeId,
        ctx.userId,
        molecule.createdby,
      );
      return { canEdit: allowed };
    }),

  getContributors: publicProcedure
    .input(z.object({ moleculeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contributors = await ctx.db.moleculecontributors.findMany({
        where: { moleculeid: input.moleculeId },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: [
          { contributiontype: "asc" },
          { contributedat: "asc" },
        ],
      });
      return contributors.map((c) => ({
        id: c.id,
        userId: c.userid,
        contributionType: c.contributiontype,
        contributedAt: c.contributedat,
        user: c.user,
      }));
    }),

  getTags: publicProcedure
    .input(z.object({ moleculeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const moleculeTags = await ctx.db.moleculetags.findMany({
        where: { moleculeid: input.moleculeId },
        include: { tags: true },
      });
      return moleculeTags.map((mt) => ({
        id: mt.tags.id,
        name: mt.tags.name,
        slug: mt.tags.slug,
        color: mt.tags.color,
      }));
    }),

  listTags: publicProcedure.query(async ({ ctx }) => {
    const tags = await ctx.db.tags.findMany({
      orderBy: { name: "asc" },
    });
    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
    }));
  }),

  setTags: protectedProcedure
    .input(
      z.object({
        moleculeId: z.string().uuid(),
        tagIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: input.moleculeId },
      });
      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Molecule not found",
        });
      }
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const allowed = await checkCanEdit(
        ctx.db,
        input.moleculeId,
        ctx.userId,
        molecule.createdby,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this molecule",
        });
      }
      await ctx.db.$transaction(async (tx) => {
        await tx.moleculetags.deleteMany({
          where: { moleculeid: input.moleculeId },
        });
        if (input.tagIds.length > 0) {
          await tx.moleculetags.createMany({
            data: input.tagIds.map((tagId) => ({
              moleculeid: input.moleculeId,
              tagid: tagId,
            })),
          });
        }
      });
      return { success: true };
    }),

  trackView: publicProcedure
    .input(
      z.object({
        moleculeId: z.string().uuid(),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: input.moleculeId },
      });
      if (!molecule) return { recorded: false };
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const dedupWhere = ctx.userId
        ? { userid: ctx.userId }
        : input.sessionId
          ? { userid: null, sessionid: input.sessionId }
          : { userid: null, sessionid: null };
      const existingView = await ctx.db.moleculeviews.findFirst({
        where: {
          moleculeid: input.moleculeId,
          viewedat: { gte: oneHourAgo },
          ...dedupWhere,
        },
      });
      if (existingView) return { recorded: false };
      await ctx.db.moleculeviews.create({
        data: {
          moleculeid: input.moleculeId,
          userid: ctx.userId ?? null,
          sessionid: input.sessionId ?? null,
        },
      });
      await ctx.db.molecules.update({
        where: { id: input.moleculeId },
        data: { viewcount: { increment: 1 } },
      });
      return { recorded: true };
    }),

  getByCreator: publicProcedure
    .input(
      z.object({
        creatorId: z.string(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.isDevMock && isDevMockUser(input.creatorId)) {
        const requestedLimit = input.limit;
        const molecules = await ctx.db.molecules.findMany({
          take: Math.min(requestedLimit + 1, 11),
          cursor: input.cursor ? { id: input.cursor } : undefined,
          include: {
            moleculesynonyms: {
              orderBy: [{ order: "asc" }],
            },
          },
          orderBy: {
            createdat: "desc",
          },
        });

        const moleculesWithSortedSynonyms = molecules.map((molecule) => ({
          ...molecule,
          moleculesynonyms: [
            ...molecule.moleculesynonyms
              .filter((syn) => syn.order === 0)
              .sort((a, b) => a.synonym.length - b.synonym.length),
            ...molecule.moleculesynonyms
              .filter((syn) => syn.order !== 0)
              .sort((a, b) => a.synonym.length - b.synonym.length),
          ],
        }));

        let nextCursor: string | undefined = undefined;
        if (moleculesWithSortedSynonyms.length > input.limit) {
          const nextItem = moleculesWithSortedSynonyms.pop();
          nextCursor = nextItem?.id;
        }

        return {
          molecules: moleculesWithSortedSynonyms,
          nextCursor,
        };
      }

      const molecules = await ctx.db.molecules.findMany({
        where: {
          createdby: input.creatorId,
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          moleculesynonyms: {
            orderBy: [{ order: "asc" }],
          },
        },
        orderBy: {
          createdat: "desc",
        },
      });

      // Sort synonyms by length (shortest first)
      const moleculesWithSortedSynonyms = molecules.map((molecule) => ({
        ...molecule,
        moleculesynonyms: [
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order === 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order !== 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
        ],
      }));

      let nextCursor: string | undefined = undefined;
      if (moleculesWithSortedSynonyms.length > input.limit) {
        const nextItem = moleculesWithSortedSynonyms.pop();
        nextCursor = nextItem?.id;
      }

      return {
        molecules: moleculesWithSortedSynonyms,
        nextCursor,
      };
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ moleculeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: input.moleculeId },
      });
      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Molecule not found",
        });
      }
      const existing = await ctx.db.moleculefavorites.findUnique({
        where: {
          moleculeid_userid: {
            moleculeid: input.moleculeId,
            userid: ctx.userId,
          },
        },
      });
      if (existing) {
        await ctx.db.moleculefavorites.delete({
          where: {
            moleculeid_userid: {
              moleculeid: input.moleculeId,
              userid: ctx.userId,
            },
          },
        });
        const updated = await ctx.db.molecules.findUnique({
          where: { id: input.moleculeId },
          select: { favoritecount: true },
        });
        return {
          favorited: false,
          favoriteCount: updated?.favoritecount ?? molecule.favoritecount - 1,
        };
      }
      await ctx.db.moleculefavorites.create({
        data: {
          moleculeid: input.moleculeId,
          userid: ctx.userId,
        },
      });
      const updated = await ctx.db.molecules.findUnique({
        where: { id: input.moleculeId },
        select: { favoritecount: true },
      });
      return {
        favorited: true,
        favoriteCount: updated?.favoritecount ?? molecule.favoritecount + 1,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        moleculeId: z.string().uuid(),
        iupacName: z.string().optional(),
        commonNames: z.array(z.string()).optional(),
        chemicalFormula: z.string().optional(),
        SMILES: z.string().optional(),
        InChI: z.string().optional(),
        casNumber: z.string().nullable().optional(),
        pubChemCid: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { moleculeId, ...updateData } = input;

      // Check if molecule exists and user is the creator
      const molecule = await ctx.db.molecules.findUnique({
        where: { id: moleculeId },
      });

      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Molecule not found",
        });
      }

      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const allowed = await checkCanEdit(
        ctx.db,
        moleculeId,
        ctx.userId,
        molecule.createdby,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this molecule",
        });
      }

      // Prepare update data
      const prismaUpdateData: {
        iupacname?: string;
        chemicalformula?: string;
        smiles?: string;
        inchi?: string;
        casnumber?: string | null;
        pubchemcid?: string | null;
        moleculesynonyms?: {
          deleteMany: Record<string, never>;
          create: Array<{ synonym: string; order: number }>;
        };
      } = {};

      if (updateData.iupacName)
        prismaUpdateData.iupacname = updateData.iupacName;
      if (updateData.chemicalFormula)
        prismaUpdateData.chemicalformula = updateData.chemicalFormula;
      if (updateData.SMILES) prismaUpdateData.smiles = updateData.SMILES;
      if (updateData.InChI) prismaUpdateData.inchi = updateData.InChI;
      if (updateData.casNumber !== undefined)
        prismaUpdateData.casnumber = updateData.casNumber;
      if (updateData.pubChemCid !== undefined)
        prismaUpdateData.pubchemcid = updateData.pubChemCid;

      // Update synonyms if provided
      if (updateData.commonNames && updateData.commonNames.length > 0) {
        const commonNameTrimmed = updateData.commonNames[0]?.trim() ?? "";
        prismaUpdateData.moleculesynonyms = {
          deleteMany: {},
          create: updateData.commonNames.map((synonym, idx) => ({
            synonym: synonym.trim(),
            order: idx === 0 || synonym.trim() === commonNameTrimmed ? 0 : idx,
          })),
        };
      }

      // Note: updatedat is automatically handled by Prisma @updatedAt directive

      const updatedMolecule = await ctx.db.molecules.update({
        where: { id: moleculeId },
        data: prismaUpdateData,
        include: {
          moleculesynonyms: {
            orderBy: [{ order: "asc" }, { synonym: "asc" }],
          },
        },
      });

      const existingContributor = await ctx.db.moleculecontributors.findUnique({
        where: {
          moleculeid_userid: { moleculeid: moleculeId, userid: ctx.userId },
        },
      });
      if (!existingContributor) {
        await ctx.db.moleculecontributors.create({
          data: {
            moleculeid: moleculeId,
            userid: ctx.userId,
            contributiontype: "editor",
          },
        });
      }

      return {
        success: true,
        molecule: updatedMolecule,
      };
    }),
});
