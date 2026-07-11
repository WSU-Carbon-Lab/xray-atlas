/**
 * Persistence helpers for opaque Atlas dataset ids used by `/d/{id}` URLs.
 */

import type { PrismaClient } from "~/prisma/client";
import {
  generateAtlasDatasetId,
  normalizeAtlasDatasetId,
} from "~/lib/atlas-dataset-id";

const MAX_ASSIGN_ATTEMPTS = 12;

/**
 * Returns the experiment’s Atlas dataset id, assigning one when missing.
 *
 * Assignment is compare-and-set only (`atlas_dataset_id IS NULL`). Concurrent
 * callers never overwrite a non-null id, so published `/d/{id}` and Zenodo
 * `isIdenticalTo` links stay stable.
 *
 * @param db - Prisma client.
 * @param experimentId - Experiment UUID.
 * @returns Normalized 8-character id.
 * @throws When the experiment does not exist or assignment exhausts retries.
 */
export async function ensureAtlasDatasetId(
  db: PrismaClient,
  experimentId: string,
): Promise<string> {
  const existing = await db.experiments.findUnique({
    where: { id: experimentId },
    select: { atlasdatasetid: true },
  });
  if (!existing) {
    throw new Error(`Experiment not found: ${experimentId}`);
  }
  const current = normalizeAtlasDatasetId(existing.atlasdatasetid);
  if (current) return current;

  for (let attempt = 0; attempt < MAX_ASSIGN_ATTEMPTS; attempt += 1) {
    const candidate = generateAtlasDatasetId();
    try {
      const assigned = await db.experiments.updateMany({
        where: { id: experimentId, atlasdatasetid: null },
        data: { atlasdatasetid: candidate },
      });
      if (assigned.count === 1) {
        return candidate;
      }
      const raced = await db.experiments.findUnique({
        where: { id: experimentId },
        select: { atlasdatasetid: true },
      });
      const won = normalizeAtlasDatasetId(raced?.atlasdatasetid);
      if (won) return won;
    } catch {
      // Unique violation on candidate — retry with a new id.
    }
  }
  throw new Error(
    `Could not assign atlas_dataset_id for experiment ${experimentId}`,
  );
}

/**
 * Reads an experiment’s Atlas dataset id without assigning one.
 *
 * @param db - Prisma client.
 * @param experimentId - Experiment UUID.
 * @returns Normalized id, or `null` when missing / unknown experiment.
 */
export async function readAtlasDatasetId(
  db: PrismaClient,
  experimentId: string,
): Promise<string | null> {
  const row = await db.experiments.findUnique({
    where: { id: experimentId },
    select: { atlasdatasetid: true },
  });
  return normalizeAtlasDatasetId(row?.atlasdatasetid ?? null);
}

/**
 * Resolves an experiment UUID from an Atlas dataset id path segment.
 *
 * @param db - Prisma client.
 * @param atlasDatasetId - Path segment (case-insensitive).
 * @returns Experiment UUID, or `null` when not found / invalid.
 */
export async function findExperimentIdByAtlasDatasetId(
  db: PrismaClient,
  atlasDatasetId: string,
): Promise<string | null> {
  const id = normalizeAtlasDatasetId(atlasDatasetId);
  if (!id) return null;
  const row = await db.experiments.findFirst({
    where: { atlasdatasetid: id },
    select: { id: true },
  });
  return row?.id ?? null;
}
