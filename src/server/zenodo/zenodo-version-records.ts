/**
 * Persistence helpers that keep `experiment_zenodo_versions` and the concept
 * identifiers on `experiment_zenodo_deposits` aligned with Zenodo responses.
 *
 * Responsible for: reading the concept DOI and concept record id from a Zenodo
 * deposition payload, building the Prisma write for the published version row,
 * and reading the experiment's current dataset version label. Does not call
 * Zenodo and does not decide when a version is minted (see
 * `zenodo-sync-queue.ts`).
 */

import type { Prisma, PrismaClient } from "~/prisma/client";
import { normalizeDoi } from "~/lib/doi";
import {
  formatDatasetVersion,
  parseDatasetVersion,
} from "~/server/nexafs/dataset-versioning";
import type { ZenodoDeposition } from "~/server/zenodo/zenodo-client";

/** Concept identifiers shared by every version of one Zenodo record. */
export interface ZenodoConceptIdentifiers {
  conceptDoi: string | null;
  conceptRecordId: string | null;
}

/**
 * Concept DOI and concept record id for a Zenodo deposition.
 *
 * The concept record id comes from `conceptrecid`. The concept DOI comes from
 * `conceptdoi` when the payload carries it; otherwise it is derived by
 * replacing the numeric suffix of the version DOI (`<prefix>zenodo.<recid>`)
 * with the concept record id, which is how Zenodo mints concept DOIs. Either
 * field is `null` when it cannot be determined.
 *
 * @param deposition - Zenodo deposition or record payload.
 * @returns Normalized concept identifiers.
 */
export function resolveConceptIdentifiers(
  deposition: ZenodoDeposition,
): ZenodoConceptIdentifiers {
  const rawRecordId = deposition.conceptrecid;
  const conceptRecordId =
    rawRecordId === undefined || rawRecordId === null
      ? null
      : String(rawRecordId).trim() || null;

  const explicit = normalizeDoi(deposition.conceptdoi ?? null);
  if (explicit) {
    return { conceptDoi: explicit, conceptRecordId };
  }
  const versionDoi = normalizeDoi(deposition.doi ?? null);
  if (versionDoi && conceptRecordId) {
    const match = /^(.*zenodo\.)\d+$/i.exec(versionDoi);
    if (match?.[1]) {
      return { conceptDoi: `${match[1]}${conceptRecordId}`, conceptRecordId };
    }
  }
  return { conceptDoi: null, conceptRecordId };
}

/**
 * Prisma `data` fragment for `experimentzenododeposits` carrying the concept
 * identifiers. Fields that could not be resolved are omitted so an earlier
 * stored value is never overwritten with `null`.
 *
 * @param deposition - Zenodo deposition or record payload.
 * @returns Partial update data with `conceptDoi` and `conceptRecordId`.
 */
export function conceptDepositData(
  deposition: ZenodoDeposition,
): Pick<
  Prisma.experimentzenododepositsUncheckedUpdateInput,
  "conceptDoi" | "conceptRecordId"
> {
  const { conceptDoi, conceptRecordId } = resolveConceptIdentifiers(deposition);
  return {
    ...(conceptDoi ? { conceptDoi } : {}),
    ...(conceptRecordId ? { conceptRecordId } : {}),
  };
}

/** Input for {@link upsertPublishedVersionOperation}. */
export interface PublishedVersionInput {
  experimentId: string;
  /** Atlas dataset version label `M.m.p` the Zenodo version carries. */
  versionLabel: string;
  /** Normalized version DOI. */
  doi: string;
  recordId: number | null;
  depositionId: number;
  publishedAt: Date;
}

/**
 * Prisma operation that creates or promotes the `experiment_zenodo_versions`
 * row for `(experimentId, versionLabel)` to `published`. A row that is already
 * `pending` or `failed` is updated in place, so the revision link made when the
 * bump was recorded stays intact and retries never create a second row.
 *
 * @param db - Prisma client used to build the operation (not executed here).
 * @param input - Version, DOI, and record identifiers from the publish response.
 * @returns A Prisma promise suitable for `db.$transaction([...])`.
 */
export function upsertPublishedVersionOperation(
  db: PrismaClient,
  input: PublishedVersionInput,
) {
  const fields = {
    doi: input.doi,
    recordId: input.recordId === null ? null : String(input.recordId),
    depositionId: String(input.depositionId),
    status: "published",
    publishedAt: input.publishedAt,
  };
  return db.experimentZenodoVersion.upsert({
    where: {
      experimentId_versionLabel: {
        experimentId: input.experimentId,
        versionLabel: input.versionLabel,
      },
    },
    create: {
      experimentId: input.experimentId,
      versionLabel: input.versionLabel,
      ...fields,
    },
    update: fields,
  });
}

/**
 * Current dataset version of an experiment as `M.m.p`.
 *
 * @param db - Prisma client.
 * @param experimentId - Atlas experiment UUID.
 * @returns Version label, or `null` when the experiment does not exist.
 */
export async function readExperimentVersionLabel(
  db: PrismaClient,
  experimentId: string,
): Promise<string | null> {
  const row = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      datasetVersionMajor: true,
      datasetVersionMinor: true,
      datasetVersionPatch: true,
    },
  });
  if (!row) return null;
  return formatDatasetVersion({
    major: row.datasetVersionMajor,
    minor: row.datasetVersionMinor,
    patch: row.datasetVersionPatch,
  });
}

/**
 * Orders two dataset version labels numerically.
 *
 * @param a - Label `M.m.p`.
 * @param b - Label `M.m.p`.
 * @returns Negative, zero, or positive like `Array.prototype.sort`; `null` when either label is not a valid `M.m.p` (for example `legacy-<recordId>`).
 */
export function compareVersionLabels(a: string, b: string): number | null {
  try {
    const left = parseDatasetVersion(a);
    const right = parseDatasetVersion(b);
    return (
      left.major - right.major ||
      left.minor - right.minor ||
      left.patch - right.patch
    );
  } catch {
    return null;
  }
}

/**
 * Label of the newest `published` Zenodo version row of an experiment, which
 * is the version the live Zenodo record carries.
 *
 * @param db - Prisma client.
 * @param experimentId - Atlas experiment UUID.
 * @returns Label of the row with the latest `publishedAt`, or `null` when none exists.
 */
export async function latestPublishedVersionLabel(
  db: PrismaClient,
  experimentId: string,
): Promise<string | null> {
  const row = await db.experimentZenodoVersion.findFirst({
    where: { experimentId, status: "published" },
    orderBy: [
      { publishedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: { versionLabel: true },
  });
  return row?.versionLabel ?? null;
}

/**
 * Rejects a publish that would attach a DOI already carried by a different
 * version row of the same experiment, which means the sync re-used an older
 * record instead of minting a new Zenodo version.
 *
 * @param db - Prisma client.
 * @param experimentId - Atlas experiment UUID.
 * @param versionLabel - Label about to be marked published.
 * @param doi - Normalized DOI of the publish response.
 * @throws {Error} When another version row of the experiment already holds `doi`.
 */
export async function assertVersionDoiUnique(
  db: PrismaClient,
  experimentId: string,
  versionLabel: string,
  doi: string,
): Promise<void> {
  const clash = await db.experimentZenodoVersion.findFirst({
    where: { experimentId, doi, versionLabel: { not: versionLabel } },
    select: { versionLabel: true },
  });
  if (clash) {
    throw new Error(
      `Zenodo returned DOI ${doi} for version ${versionLabel}, but it already belongs to version ${clash.versionLabel}; no new Zenodo version was minted`,
    );
  }
}
