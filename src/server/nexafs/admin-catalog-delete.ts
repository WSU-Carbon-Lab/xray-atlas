/**
 * Hard-deletes catalog molecules and NEXAFS experiments for administrators.
 * Samples do not cascade from molecules, so molecule removal deletes dependent
 * experiments and samples first. Auxiliary storage objects are removed after
 * the database transaction. Zenodo records are not unpublished.
 */

import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "~/prisma/client";
import type { AdminCatalogDeleteImpact } from "~/lib/nexafs/admin-catalog-types";
import { deleteMoleculeImage } from "~/server/storage";
import {
  EXPERIMENT_AUX_BUCKET,
  SAMPLE_AUX_BUCKET,
  removeAuxStorageObjects,
} from "~/server/aux-storage";
import { emitAuditEvent, type AuditRequestMeta } from "~/server/audit";
import { userHasAppPermission } from "~/server/auth/privileged-role";
import type { AppPermissionKey } from "~/lib/app-role-permissions";

type CatalogDb = PrismaClient | Prisma.TransactionClient;

const CATALOG_DELETE_TRANSACTION_OPTIONS = {
  maxWait: 15_000,
  timeout: 120_000,
} as const;

function mapCatalogDeletePrismaError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Related catalog rows blocked this delete. Retry after those links are cleared.",
      });
    }
    if (error.code === "P2025") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Record not found",
      });
    }
  }
  throw error;
}

/**
 * Throws `FORBIDDEN` when the session lacks `permission`.
 *
 * @param db - Prisma client.
 * @param userId - Authenticated ORCID user id.
 * @param permission - `molecule_delete` or `data_delete`.
 */
export async function assertAdminCatalogPermission(
  db: PrismaClient,
  userId: string,
  permission: Extract<AppPermissionKey, "molecule_delete" | "data_delete">,
): Promise<void> {
  const allowed = await userHasAppPermission(db, userId, permission);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        permission === "molecule_delete"
          ? "Your roles do not include molecule_delete."
          : "Your roles do not include data_delete.",
    });
  }
}

/**
 * Loads delete-impact counts for one experiment without mutating the database.
 *
 * @param db - Prisma client.
 * @param experimentId - Experiment UUID.
 */
export async function previewExperimentCatalogDelete(
  db: PrismaClient,
  experimentId: string,
): Promise<AdminCatalogDeleteImpact> {
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      id: true,
      canonicalslug: true,
      atlasdatasetid: true,
      samples: {
        select: {
          molecules: {
            select: {
              iupacname: true,
              moleculesynonyms: {
                orderBy: { order: "asc" },
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
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Experiment not found",
    });
  }
  const [spectrumPointCount, experimentAuxFileCount, zenodoDepositCount] =
    await Promise.all([
      db.spectrumpoints.count({ where: { experimentid: experimentId } }),
      db.experimentfile.count({ where: { experimentid: experimentId } }),
      db.experimentzenododeposits.count({
        where: { experimentid: experimentId },
      }),
    ]);
  const moleculeName =
    experiment.samples.molecules.moleculesynonyms[0]?.synonym ??
    experiment.samples.molecules.iupacname;
  const label =
    experiment.canonicalslug ??
    experiment.atlasdatasetid ??
    `${moleculeName} (${experiment.id.slice(0, 8)})`;
  return {
    label,
    experimentCount: 1,
    sampleCount: 0,
    spectrumPointCount,
    experimentAuxFileCount,
    sampleAuxFileCount: 0,
    zenodoDepositCount,
  };
}

/**
 * Loads delete-impact counts for a molecule and all linked samples/experiments.
 *
 * @param db - Prisma client.
 * @param moleculeId - Molecule UUID.
 */
export async function previewMoleculeCatalogDelete(
  db: PrismaClient,
  moleculeId: string,
): Promise<AdminCatalogDeleteImpact> {
  const molecule = await db.molecules.findUnique({
    where: { id: moleculeId },
    select: {
      iupacname: true,
      moleculesynonyms: {
        orderBy: { order: "asc" },
        take: 1,
        select: { synonym: true },
      },
      samples: { select: { id: true } },
    },
  });
  if (!molecule) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Molecule not found",
    });
  }
  const sampleIds = molecule.samples.map((row) => row.id);
  const experiments =
    sampleIds.length === 0
      ? []
      : await db.experiments.findMany({
          where: { sampleid: { in: sampleIds } },
          select: { id: true },
        });
  const experimentIds = experiments.map((row) => row.id);
  const [
    spectrumPointCount,
    experimentAuxFileCount,
    sampleAuxFileCount,
    zenodoDepositCount,
  ] = await Promise.all([
    experimentIds.length === 0
      ? Promise.resolve(0)
      : db.spectrumpoints.count({
          where: { experimentid: { in: experimentIds } },
        }),
    experimentIds.length === 0
      ? Promise.resolve(0)
      : db.experimentfile.count({
          where: { experimentid: { in: experimentIds } },
        }),
    sampleIds.length === 0
      ? Promise.resolve(0)
      : db.samplefile.count({
          where: { sampleid: { in: sampleIds } },
        }),
    experimentIds.length === 0
      ? Promise.resolve(0)
      : db.experimentzenododeposits.count({
          where: { experimentid: { in: experimentIds } },
        }),
  ]);
  return {
    label: molecule.moleculesynonyms[0]?.synonym ?? molecule.iupacname,
    experimentCount: experimentIds.length,
    sampleCount: sampleIds.length,
    spectrumPointCount,
    experimentAuxFileCount,
    sampleAuxFileCount,
    zenodoDepositCount,
  };
}

async function collectExperimentAuxPaths(
  db: CatalogDb,
  experimentIds: readonly string[],
): Promise<string[]> {
  if (experimentIds.length === 0) {
    return [];
  }
  const rows = await db.experimentfile.findMany({
    where: { experimentid: { in: [...experimentIds] } },
    select: { storagepath: true },
  });
  return rows.map((row) => row.storagepath);
}

async function collectSampleAuxPaths(
  db: CatalogDb,
  sampleIds: readonly string[],
): Promise<string[]> {
  if (sampleIds.length === 0) {
    return [];
  }
  const rows = await db.samplefile.findMany({
    where: { sampleid: { in: [...sampleIds] } },
    select: { storagepath: true },
  });
  return rows.map((row) => row.storagepath);
}

/**
 * Permanently deletes one experiment and related rows, then removes aux objects.
 *
 * @param db - Prisma client.
 * @param args.experimentId - Experiment UUID.
 * @param args.actorUserId - Administrator ORCID.
 * @param args.requestMeta - Audit request metadata.
 */
export async function deleteExperimentFromCatalog(
  db: PrismaClient,
  args: {
    experimentId: string;
    actorUserId: string;
    requestMeta: AuditRequestMeta;
  },
): Promise<AdminCatalogDeleteImpact> {
  const impact = await previewExperimentCatalogDelete(db, args.experimentId);
  const auxPaths: string[] = [];
  try {
    await db.$transaction(async (tx) => {
      auxPaths.push(
        ...(await collectExperimentAuxPaths(tx, [args.experimentId])),
      );
      await tx.experiments.delete({
        where: { id: args.experimentId },
      });
      await emitAuditEvent({
        db: tx,
        eventType: "takedown.execute",
        eventScope: "admin.deleteExperiment",
        actorUserId: args.actorUserId,
        payload: {
          kind: "experiment",
          experimentId: args.experimentId,
          label: impact.label,
          spectrumPointCount: impact.spectrumPointCount,
          zenodoDepositCount: impact.zenodoDepositCount,
        },
        requestMeta: args.requestMeta,
      });
    }, CATALOG_DELETE_TRANSACTION_OPTIONS);
  } catch (error) {
    mapCatalogDeletePrismaError(error);
  }
  await removeAuxStorageObjects({
    bucket: EXPERIMENT_AUX_BUCKET,
    paths: auxPaths,
  });
  return impact;
}

/**
 * Permanently deletes a molecule, its samples, and all linked experiments.
 *
 * @param db - Prisma client.
 * @param args.moleculeId - Molecule UUID.
 * @param args.actorUserId - Administrator ORCID.
 * @param args.requestMeta - Audit request metadata.
 */
export async function deleteMoleculeFromCatalog(
  db: PrismaClient,
  args: {
    moleculeId: string;
    actorUserId: string;
    requestMeta: AuditRequestMeta;
  },
): Promise<AdminCatalogDeleteImpact> {
  const impact = await previewMoleculeCatalogDelete(db, args.moleculeId);
  const experimentAuxPaths: string[] = [];
  const sampleAuxPaths: string[] = [];
  let imageUrl: string | null = null;

  try {
    await db.$transaction(async (tx) => {
      const molecule = await tx.molecules.findUnique({
        where: { id: args.moleculeId },
        select: {
          imageurl: true,
          samples: { select: { id: true } },
        },
      });
      if (!molecule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Molecule not found",
        });
      }
      imageUrl = molecule.imageurl;
      const sampleIds = molecule.samples.map((row) => row.id);
      const experiments =
        sampleIds.length === 0
          ? []
          : await tx.experiments.findMany({
              where: { sampleid: { in: sampleIds } },
              select: { id: true },
            });
      const experimentIds = experiments.map((row) => row.id);
      experimentAuxPaths.push(
        ...(await collectExperimentAuxPaths(tx, experimentIds)),
      );
      sampleAuxPaths.push(...(await collectSampleAuxPaths(tx, sampleIds)));

      if (sampleIds.length > 0) {
        await tx.experiments.deleteMany({
          where: { sampleid: { in: sampleIds } },
        });
        await tx.samples.deleteMany({
          where: { id: { in: sampleIds } },
        });
      }
      await tx.molecules.delete({
        where: { id: args.moleculeId },
      });
      await emitAuditEvent({
        db: tx,
        eventType: "takedown.execute",
        eventScope: "admin.deleteMolecule",
        actorUserId: args.actorUserId,
        payload: {
          kind: "molecule",
          moleculeId: args.moleculeId,
          label: impact.label,
          experimentCount: impact.experimentCount,
          sampleCount: impact.sampleCount,
          spectrumPointCount: impact.spectrumPointCount,
          zenodoDepositCount: impact.zenodoDepositCount,
        },
        requestMeta: args.requestMeta,
      });
    }, CATALOG_DELETE_TRANSACTION_OPTIONS);
  } catch (error) {
    mapCatalogDeletePrismaError(error);
  }

  await removeAuxStorageObjects({
    bucket: EXPERIMENT_AUX_BUCKET,
    paths: experimentAuxPaths,
  });
  await removeAuxStorageObjects({
    bucket: SAMPLE_AUX_BUCKET,
    paths: sampleAuxPaths,
  });
  if (imageUrl) {
    try {
      await deleteMoleculeImage(imageUrl);
    } catch (error) {
      console.error(
        "Failed to delete molecule image after catalog delete:",
        error,
      );
    }
  }
  return impact;
}
