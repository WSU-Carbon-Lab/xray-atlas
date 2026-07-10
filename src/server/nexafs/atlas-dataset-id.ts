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
      const updated = await db.experiments.update({
        where: { id: experimentId },
        data: { atlasdatasetid: candidate },
        select: { atlasdatasetid: true },
      });
      const assigned = normalizeAtlasDatasetId(updated.atlasdatasetid);
      if (assigned) return assigned;
    } catch {
      // Unique violation — retry with a new candidate.
    }
  }
  throw new Error(
    `Could not assign atlas_dataset_id for experiment ${experimentId}`,
  );
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
