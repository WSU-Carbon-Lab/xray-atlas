/**
 * Admin catalog search and hard-delete procedures. Nested under `admin.catalog`.
 * Mutations require {@link adminProcedure} plus `molecule_delete` or `data_delete`.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import { auditRequestMetaFromTrpcContext } from "~/server/audit";
import { userHasAppPermission } from "~/server/auth/privileged-role";
import {
  assertAdminCatalogPermission,
  deleteExperimentFromCatalog,
  deleteMoleculeFromCatalog,
  previewExperimentCatalogDelete,
  previewMoleculeCatalogDelete,
} from "~/server/nexafs/admin-catalog-delete";
import { fetchNexafsBrowseGrouped } from "~/server/nexafs/nexafsBrowseGroups";
import { edgeLabelFromAtomCore } from "~/lib/nexafs/edge-energy-bands";
import type { Prisma } from "~/prisma/client";

const catalogQuerySchema = z.object({
  query: z.string().max(200).default(""),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

const uuidSchema = z.string().uuid();

/**
 * Catalog search and destructive deletes for administrators.
 */
export const adminCatalogRouter = createTRPCRouter({
  /**
   * Reports whether the session may delete molecules and/or datasets.
   */
  capabilities: adminProcedure.query(async ({ ctx }) => {
    const [canDeleteMolecules, canDeleteDatasets] = await Promise.all([
      userHasAppPermission(ctx.db, ctx.userId, "molecule_delete"),
      userHasAppPermission(ctx.db, ctx.userId, "data_delete"),
    ]);
    return { canDeleteMolecules, canDeleteDatasets };
  }),

  /**
   * Lists molecules for the admin catalog, newest first, optionally filtered.
   */
  listMolecules: adminProcedure
    .input(catalogQuerySchema)
    .query(async ({ ctx, input }) => {
      await assertAdminCatalogPermission(ctx.db, ctx.userId, "molecule_delete");
      const trimmed = input.query.trim();
      const uuidMatch = uuidSchema.safeParse(trimmed);
      const where: Prisma.moleculesWhereInput =
        trimmed.length === 0
          ? {}
          : uuidMatch.success
            ? { id: uuidMatch.data }
            : {
                OR: [
                  {
                    iupacname: {
                      contains: trimmed,
                      mode: "insensitive",
                    },
                  },
                  {
                    chemicalformula: {
                      contains: trimmed,
                      mode: "insensitive",
                    },
                  },
                  {
                    moleculesynonyms: {
                      some: {
                        synonym: {
                          contains: trimmed,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                  {
                    moleculesynonyms: {
                      some: {
                        slug: {
                          contains: trimmed.toLowerCase(),
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                ],
              };

      const [total, rows] = await Promise.all([
        ctx.db.molecules.count({ where }),
        ctx.db.molecules.findMany({
          where,
          orderBy: { createdat: "desc" },
          skip: input.offset,
          take: input.limit,
          select: {
            id: true,
            iupacname: true,
            chemicalformula: true,
            createdat: true,
            moleculesynonyms: {
              orderBy: { order: "asc" },
              take: 1,
              select: { synonym: true, slug: true },
            },
            _count: { select: { samples: true } },
            samples: {
              select: {
                _count: { select: { experiments: true } },
              },
            },
          },
        }),
      ]);

      return {
        total,
        molecules: rows.map((row) => ({
          id: row.id,
          displayName: row.moleculesynonyms[0]?.synonym ?? row.iupacname,
          slug: row.moleculesynonyms[0]?.slug ?? null,
          iupacname: row.iupacname,
          chemicalformula: row.chemicalformula,
          createdat: row.createdat,
          sampleCount: row._count.samples,
          experimentCount: row.samples.reduce(
            (sum, sample) => sum + sample._count.experiments,
            0,
          ),
        })),
      };
    }),

  /**
   * Lists NEXAFS experiments for the admin catalog (browse grouping, newest).
   */
  listDatasets: adminProcedure
    .input(catalogQuerySchema)
    .query(async ({ ctx, input }) => {
      await assertAdminCatalogPermission(ctx.db, ctx.userId, "data_delete");
      const trimmed = input.query.trim();
      const uuidMatch = uuidSchema.safeParse(trimmed);
      const { groups, total } = await fetchNexafsBrowseGrouped(ctx.db, {
        viewerUserId: ctx.userId,
        filters: uuidMatch.success ? { experimentIds: [uuidMatch.data] } : {},
        searchQuery: trimmed.length > 0 && !uuidMatch.success ? trimmed : null,
        sortBy: "newest",
        limit: input.limit,
        offset: input.offset,
      });
      return {
        total,
        datasets: groups.map((group) => ({
          experimentId: group.experimentId,
          moleculeId: group.molecule.id,
          moleculeName: group.molecule.displayName,
          edgeLabel: edgeLabelFromAtomCore(
            group.edge.targetatom,
            group.edge.corestate,
          ),
          instrumentName: group.instrument.name,
          experimentType: group.experimenttype,
          atlasDatasetId: group.atlasDatasetId,
          createdat: group.createdat,
          polarizationCount: group.polarizationCount,
        })),
      };
    }),

  /**
   * Counts rows that would be removed if this molecule were deleted.
   */
  previewMoleculeDelete: adminProcedure
    .input(z.object({ moleculeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertAdminCatalogPermission(ctx.db, ctx.userId, "molecule_delete");
      return previewMoleculeCatalogDelete(ctx.db, input.moleculeId);
    }),

  /**
   * Counts rows that would be removed if this experiment were deleted.
   */
  previewExperimentDelete: adminProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertAdminCatalogPermission(ctx.db, ctx.userId, "data_delete");
      return previewExperimentCatalogDelete(ctx.db, input.experimentId);
    }),

  /**
   * Permanently deletes a molecule and all linked samples and experiments.
   */
  deleteMolecule: adminProcedure
    .input(z.object({ moleculeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await assertAdminCatalogPermission(ctx.db, ctx.userId, "molecule_delete");
      const impact = await deleteMoleculeFromCatalog(ctx.db, {
        moleculeId: input.moleculeId,
        actorUserId: ctx.userId,
        requestMeta: auditRequestMetaFromTrpcContext({
          clientIp: ctx.clientIp,
          userAgent: ctx.userAgent,
        }),
      });
      return { success: true as const, impact };
    }),

  /**
   * Permanently deletes one NEXAFS experiment. The parent molecule remains.
   */
  deleteExperiment: adminProcedure
    .input(z.object({ experimentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await assertAdminCatalogPermission(ctx.db, ctx.userId, "data_delete");
      const impact = await deleteExperimentFromCatalog(ctx.db, {
        experimentId: input.experimentId,
        actorUserId: ctx.userId,
        requestMeta: auditRequestMetaFromTrpcContext({
          clientIp: ctx.clientIp,
          userAgent: ctx.userAgent,
        }),
      });
      return { success: true as const, impact };
    }),
});
