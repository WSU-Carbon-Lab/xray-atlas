/**
 * Default optical model of a dataset.
 *
 * Owns creating the one public default model per dataset (the uploader's normalization, no peaks,
 * published as version 1 and approved by the uploader) and appending a new published version when
 * the dataset's normalization changes. The default model is an ordinary model afterwards: it can
 * be forked and its owner can edit it. Does not run inside the transaction that creates or edits a
 * dataset; callers sync after that transaction commits, because a database error inside an
 * interactive transaction aborts all of it.
 */

import { Prisma } from "~/prisma/client";
import type { PrismaClient } from "~/prisma/client";
import { TRPCError } from "@trpc/server";
import { canonicalJsonChecksum } from "~/server/nexafs/apply-versioned-change";
import { formatDatasetVersion } from "~/server/nexafs/dataset-versioning";
import { normalizationSpecFromDataset } from "~/server/optical-models/dataset-normalization";
import {
  allocateOpticalModelTag,
  lockModelRow,
  versionContentCreateData,
} from "~/server/optical-models/persist-helpers";
import {
  computeVersionChecksum,
  peakRowToJson,
} from "~/server/optical-models/version-checksum";

const ORCID_ID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
const MAX_CREATE_ATTEMPTS = 3;

/**
 * Creates the default model of a dataset when it does not exist.
 *
 * The owner is the dataset's owner contributor, falling back to `createdby`; when neither is a
 * valid ORCID iD no model is created. The model is public, owned and signed by that ORCID, has one
 * published version 1 with the dataset's current normalization (or none when the dataset's
 * normalization cannot be expressed as a model spec), no peaks, the dataset pinned at its current
 * version, and an `approved` review of its own dataset. Safe to call repeatedly and concurrently.
 *
 * @param db - Shared Prisma client (not a transaction client).
 * @param experimentId - Dataset (experiment) primary key.
 * @returns The model id and tag, or `null` when no owner ORCID can be determined.
 * @throws TRPCError `NOT_FOUND` when the dataset does not exist.
 */
export async function ensureDefaultOpticalModel(
  db: PrismaClient,
  experimentId: string,
): Promise<{ modelId: string; tag: string } | null> {
  const existing = await db.opticalModel.findUnique({
    where: { defaultForExperimentId: experimentId },
    select: { id: true, tag: true },
  });
  if (existing) return { modelId: existing.id, tag: existing.tag };

  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      createdby: true,
      canonicalslug: true,
      normalizationscope: true,
      normalizationranges: true,
      datasetVersionMajor: true,
      datasetVersionMinor: true,
      datasetVersionPatch: true,
      experimentcontributors: {
        where: { role: "owner", detachedat: null },
        select: { orcidid: true },
        orderBy: { createdat: "asc" },
        take: 1,
      },
    },
  });
  if (!experiment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
  }
  const ownerOrcid = [
    experiment.experimentcontributors[0]?.orcidid,
    experiment.createdby,
  ].find(
    (candidate): candidate is string => !!candidate && ORCID_ID.test(candidate),
  );
  if (!ownerOrcid) return null;

  const owner = await db.user.findUnique({
    where: { id: ownerOrcid },
    select: { id: true, name: true },
  });
  const spec = normalizationSpecFromDataset(
    experiment.normalizationscope,
    experiment.normalizationranges,
  );
  const checksum = computeVersionChecksum({
    normalization: spec as Prisma.InputJsonValue | null,
    peaks: [],
    datasets: [
      {
        experimentId,
        pinned: formatDatasetVersion({
          major: experiment.datasetVersionMajor,
          minor: experiment.datasetVersionMinor,
          patch: experiment.datasetVersionPatch,
        }),
        role: "primary",
      },
    ],
    tensorSha256: null,
  });
  const now = new Date();

  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      const created = await db.opticalModel.create({
        data: {
          tag: await allocateOpticalModelTag(db),
          title:
            `Default model: ${experiment.canonicalslug ?? experimentId}`.slice(
              0,
              200,
            ),
          ownerOrcid,
          ownerUserId: owner?.id ?? null,
          visibility: "public",
          defaultForExperimentId: experimentId,
          authors: {
            create: {
              orcid: ownerOrcid,
              userId: owner?.id ?? null,
              role: "owner",
              signature: "signed",
              signedAt: now,
            },
          },
          reviews: {
            create: {
              experimentId,
              state: "approved",
              reviewerUserId: owner?.id ?? null,
              reviewedAt: now,
            },
          },
          versions: {
            create: {
              status: "published",
              versionNumber: 1,
              normalization: spec
                ? (spec as Prisma.InputJsonValue)
                : Prisma.DbNull,
              publishedAt: now,
              checksum,
              authorsSnapshot: [
                {
                  orcid: ownerOrcid,
                  name: owner?.name ?? null,
                  role: "owner",
                  signed: true,
                },
              ],
              datasets: {
                create: {
                  experimentId,
                  pinnedMajor: experiment.datasetVersionMajor,
                  pinnedMinor: experiment.datasetVersionMinor,
                  pinnedPatch: experiment.datasetVersionPatch,
                  role: "primary",
                },
              },
            },
          },
        },
        select: { id: true, tag: true },
      });
      return { modelId: created.id, tag: created.tag };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await db.opticalModel.findUnique({
          where: { defaultForExperimentId: experimentId },
          select: { id: true, tag: true },
        });
        if (raced) return { modelId: raced.id, tag: raced.tag };
        if (attempt < MAX_CREATE_ATTEMPTS) continue;
      }
      throw error;
    }
  }
  throw new Error("Default optical model create exhausted retries");
}

/**
 * Appends a published version to the dataset's default model when the dataset has a normalization
 * revision newer than the version the latest published version pins and the normalization differs.
 * A normalization its owner published on the default model is therefore never reverted by a sync
 * that follows no new dataset revision.
 *
 * The new version copies the latest version's peaks, tensor, and extra dataset links, replaces the
 * normalization with the dataset's current one, and re-pins this dataset at its current version.
 * Does nothing when the default model does not exist or the normalization is unchanged.
 *
 * @param db - Shared Prisma client (not a transaction client).
 * @param experimentId - Dataset (experiment) primary key.
 */
export async function publishDefaultVersionIfChanged(
  db: PrismaClient,
  experimentId: string,
): Promise<void> {
  const model = await db.opticalModel.findUnique({
    where: { defaultForExperimentId: experimentId },
    select: { id: true },
  });
  if (!model) return;
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      normalizationscope: true,
      normalizationranges: true,
      datasetVersionMajor: true,
      datasetVersionMinor: true,
      datasetVersionPatch: true,
    },
  });
  if (!experiment) return;
  const spec = normalizationSpecFromDataset(
    experiment.normalizationscope,
    experiment.normalizationranges,
  );
  const specJson = spec as Prisma.InputJsonValue | null;

  await db.$transaction(async (tx) => {
    await lockModelRow(tx, model.id);
    const latest = await tx.opticalModelVersion.findFirst({
      where: { modelId: model.id, status: "published" },
      orderBy: { versionNumber: "desc" },
      include: { datasets: true, peaks: true, tensor: true },
    });
    if (!latest) return;
    const latestNormalizationRevision = await tx.experimentRevision.findFirst({
      where: { experimentId, changeKind: "normalization" },
      orderBy: [
        { versionMajor: "desc" },
        { versionMinor: "desc" },
        { versionPatch: "desc" },
      ],
      select: { versionMajor: true, versionMinor: true, versionPatch: true },
    });
    if (!latestNormalizationRevision) return;
    const thisLink = latest.datasets.find(
      (dataset) => dataset.experimentId === experimentId,
    );
    if (thisLink) {
      const behind =
        latestNormalizationRevision.versionMajor - thisLink.pinnedMajor ||
        latestNormalizationRevision.versionMinor - thisLink.pinnedMinor ||
        latestNormalizationRevision.versionPatch - thisLink.pinnedPatch;
      if (behind <= 0) return;
    }
    const storedState = canonicalJsonChecksum({
      normalization: (latest.normalization ??
        null) as Prisma.InputJsonValue | null,
    });
    const currentState = canonicalJsonChecksum({ normalization: specJson });
    if (storedState === currentState) return;

    const datasets = latest.datasets.map((dataset) => {
      const isThis = dataset.experimentId === experimentId;
      return {
        experimentId: dataset.experimentId,
        pinnedMajor: isThis
          ? experiment.datasetVersionMajor
          : dataset.pinnedMajor,
        pinnedMinor: isThis
          ? experiment.datasetVersionMinor
          : dataset.pinnedMinor,
        pinnedPatch: isThis
          ? experiment.datasetVersionPatch
          : dataset.pinnedPatch,
        role: dataset.role,
      };
    });
    const peaks = [...latest.peaks].sort((a, b) => a.ordinal - b.ordinal);
    const checksum = computeVersionChecksum({
      normalization: specJson,
      peaks: peaks.map(peakRowToJson),
      datasets: datasets.map((dataset) => ({
        experimentId: dataset.experimentId,
        pinned: formatDatasetVersion({
          major: dataset.pinnedMajor,
          minor: dataset.pinnedMinor,
          patch: dataset.pinnedPatch,
        }),
        role: dataset.role,
      })),
      tensorSha256: latest.tensor?.sha256 ?? null,
    });
    const authors = await tx.opticalModelAuthor.findMany({
      where: { modelId: model.id },
      include: { user: { select: { name: true } } },
      orderBy: [{ role: "asc" }, { orcid: "asc" }],
    });

    await tx.opticalModelVersion.create({
      data: {
        modelId: model.id,
        status: "published",
        versionNumber: (latest.versionNumber ?? 0) + 1,
        publishedAt: new Date(),
        checksum,
        authorsSnapshot: authors.map((author) => ({
          orcid: author.orcid,
          name: author.user?.name ?? null,
          role: author.role,
          signed: author.signature === "signed",
        })),
        ...versionContentCreateData(latest),
        normalization: spec ? (spec as Prisma.InputJsonValue) : Prisma.DbNull,
        datasets: { create: datasets },
      },
    });
  });
}

/**
 * Creates the default model if missing, then appends a version when the normalization changed.
 *
 * @param db - Shared Prisma client (not a transaction client).
 * @param experimentId - Dataset (experiment) primary key.
 * @throws Any error from {@link ensureDefaultOpticalModel} or {@link publishDefaultVersionIfChanged}.
 */
export async function syncDefaultOpticalModel(
  db: PrismaClient,
  experimentId: string,
): Promise<void> {
  await ensureDefaultOpticalModel(db, experimentId);
  await publishDefaultVersionIfChanged(db, experimentId);
}

/**
 * {@link syncDefaultOpticalModel} that logs and swallows failures.
 *
 * For call sites that must not fail a dataset upload or edit because default-model sync failed;
 * the next listing of the dataset's models retries.
 *
 * @param db - Shared Prisma client (not a transaction client).
 * @param experimentId - Dataset (experiment) primary key.
 */
export async function trySyncDefaultOpticalModel(
  db: PrismaClient,
  experimentId: string,
): Promise<void> {
  try {
    await syncDefaultOpticalModel(db, experimentId);
  } catch (error) {
    console.error("[optical-models] default model sync failed", {
      experimentId,
      error,
    });
  }
}
