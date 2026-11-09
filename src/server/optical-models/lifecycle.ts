/**
 * Forking and draft editing of optical models.
 *
 * Owns creating a model as a fork of a visible published version, opening a draft on a model, and
 * replacing draft content. Publishing, lineage, and deletion live in sibling modules. Published
 * versions are never modified here: every edit targets the single draft of a model, which is
 * created from the latest published version when none exists.
 */

import { TRPCError } from "@trpc/server";
import { Prisma } from "~/prisma/client";
import type { PrismaClient } from "~/prisma/client";
import type { DraftContent, ModelPeak } from "~/lib/optical-models/schemas";
import { loadOwnedModelByTag } from "~/server/optical-models/authz";
import {
  allocateOpticalModelTag,
  lockModelRow,
  versionContentCreateData,
} from "~/server/optical-models/persist-helpers";
import { loadVisibleModelByTag } from "~/server/optical-models/visibility";

/** Input of {@link forkModel}. */
export interface ForkModelInput {
  /** Authenticated user id (bare ORCID iD) who becomes the owner of the fork. */
  actorUserId: string;
  /** Tag of the model to fork; it must be visible to the actor. */
  sourceTag: string;
  /** Published version number to fork; defaults to the latest published version. */
  fromVersion?: number;
  /** Title of the fork; defaults to the source title followed by ` (fork)`. */
  title?: string;
}

/**
 * Creates a new private model as a fork of a published version.
 *
 * The fork is owned by the actor, has the actor as signed owner author, and starts with one draft
 * that copies the source version's normalization, dataset links with their pins, peaks, and
 * tensor row. A `fork` parent link records the source version.
 *
 * @param db - Shared Prisma client.
 * @param input - Fork parameters.
 * @returns The tag of the new model.
 * @throws TRPCError `NOT_FOUND` when the source model is not visible to the actor or has no such
 * published version.
 */
export async function forkModel(
  db: PrismaClient,
  input: ForkModelInput,
): Promise<{ tag: string }> {
  const source = await loadVisibleModelByTag(
    db,
    { userId: input.actorUserId },
    input.sourceTag,
  );
  const sourceVersion = await db.opticalModelVersion.findFirst({
    where: {
      modelId: source.id,
      status: "published",
      ...(input.fromVersion !== undefined
        ? { versionNumber: input.fromVersion }
        : {}),
    },
    orderBy: { versionNumber: "desc" },
    include: { datasets: true, peaks: true, tensor: true },
  });
  if (!sourceVersion) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Model version not found.",
    });
  }

  const title = (input.title?.trim() || `${source.title} (fork)`).slice(0, 200);
  return db.$transaction(async (tx) => {
    const tag = await allocateOpticalModelTag(tx);
    await tx.opticalModel.create({
      data: {
        tag,
        title,
        description: source.description,
        ownerOrcid: input.actorUserId,
        ownerUserId: input.actorUserId,
        visibility: "private",
        forkedFromVersionId: sourceVersion.id,
        authors: {
          create: {
            orcid: input.actorUserId,
            userId: input.actorUserId,
            role: "owner",
            signature: "signed",
            signedAt: new Date(),
          },
        },
        versions: {
          create: {
            status: "draft",
            ...versionContentCreateData(sourceVersion),
            parents: {
              create: { parentVersionId: sourceVersion.id, kind: "fork" },
            },
          },
        },
      },
    });
    return { tag };
  });
}

/** Returns the draft version id of a model, creating the draft from the latest published version. */
async function ensureDraftVersion(
  tx: Prisma.TransactionClient,
  modelId: string,
): Promise<string> {
  const existing = await tx.opticalModelVersion.findFirst({
    where: { modelId, status: "draft" },
    select: { id: true },
  });
  if (existing) return existing.id;
  const latest = await tx.opticalModelVersion.findFirst({
    where: { modelId, status: "published" },
    orderBy: { versionNumber: "desc" },
    include: { datasets: true, peaks: true, tensor: true },
  });
  if (!latest) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Model has no version to edit.",
    });
  }
  const draft = await tx.opticalModelVersion.create({
    data: {
      modelId,
      status: "draft",
      ...versionContentCreateData(latest),
    },
    select: { id: true },
  });
  return draft.id;
}

/** Replaces the draft's dataset links; existing links keep their pin, new links pin the current dataset version. */
async function replaceDraftDatasets(
  tx: Prisma.TransactionClient,
  draftId: string,
  links: NonNullable<DraftContent["datasets"]>,
): Promise<void> {
  const existing = await tx.opticalModelDataset.findMany({
    where: { versionId: draftId },
  });
  const priorByExperiment = new Map(
    existing.map((dataset) => [dataset.experimentId, dataset]),
  );
  const found = await tx.experiments.findMany({
    where: { id: { in: links.map((link) => link.experimentId) } },
    select: {
      id: true,
      datasetVersionMajor: true,
      datasetVersionMinor: true,
      datasetVersionPatch: true,
    },
  });
  const currentByExperiment = new Map(
    found.map((experiment) => [experiment.id, experiment]),
  );
  if (currentByExperiment.size !== links.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "A linked dataset does not exist.",
    });
  }
  await tx.opticalModelDataset.deleteMany({ where: { versionId: draftId } });
  await tx.opticalModelDataset.createMany({
    data: links.map((link) => {
      const prior = priorByExperiment.get(link.experimentId);
      const current = currentByExperiment.get(link.experimentId)!;
      return {
        versionId: draftId,
        experimentId: link.experimentId,
        pinnedMajor: prior?.pinnedMajor ?? current.datasetVersionMajor,
        pinnedMinor: prior?.pinnedMinor ?? current.datasetVersionMinor,
        pinnedPatch: prior?.pinnedPatch ?? current.datasetVersionPatch,
        role: link.role,
      };
    }),
  });
}

/** Replaces the draft's peaks, numbering them in the given order. */
async function replaceDraftPeaks(
  tx: Prisma.TransactionClient,
  draftId: string,
  peaks: ModelPeak[],
): Promise<void> {
  await tx.opticalModelPeak.deleteMany({ where: { versionId: draftId } });
  await tx.opticalModelPeak.createMany({
    data: peaks.map((peak, ordinal) => ({
      versionId: draftId,
      ordinal,
      experimentId: peak.experimentId ?? null,
      polarizationId: peak.polarizationId ?? null,
      centerEv: peak.centerEv,
      kind: peak.kind,
      transition: peak.transition ?? null,
      amplitude: peak.amplitude ?? null,
      width: peak.width ?? null,
      shape: peak.shape ?? null,
      centerErr: peak.centerErr ?? null,
      amplitudeErr: peak.amplitudeErr ?? null,
      widthErr: peak.widthErr ?? null,
      params: peak.params ?? Prisma.DbNull,
      fitProvenance: peak.fitProvenance ?? Prisma.DbNull,
    })),
  });
}

/** Rejects a draft whose peaks name a dataset that the draft does not link. */
async function assertPeakDatasetsLinked(
  tx: Prisma.TransactionClient,
  draftId: string,
): Promise<void> {
  const peaks = await tx.opticalModelPeak.findMany({
    where: { versionId: draftId, experimentId: { not: null } },
    select: { experimentId: true },
  });
  if (peaks.length === 0) return;
  const links = await tx.opticalModelDataset.findMany({
    where: { versionId: draftId },
    select: { experimentId: true },
  });
  const linked = new Set(links.map((link) => link.experimentId));
  const orphan = peaks.find(
    (peak) => peak.experimentId !== null && !linked.has(peak.experimentId),
  );
  if (orphan) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A peak references a dataset that is not linked to this model.",
    });
  }
}

/** Input of {@link saveDraft}. */
export interface SaveDraftInput {
  /** Authenticated user id (bare ORCID iD); must own the model. */
  actorUserId: string;
  /** Tag of the model whose draft to edit. */
  tag: string;
  /** Fields to replace; absent fields are left unchanged. */
  content: DraftContent;
}

/**
 * Replaces the fields present in `content` on the model's draft, creating the draft from the
 * latest published version when none exists.
 *
 * `title` and `description` update the model. `normalization` (a value or `null`), `datasets`,
 * and `peaks` replace the draft's stored value. Datasets already linked keep their pin; newly
 * linked datasets pin the dataset's current version. Peaks are numbered in array order.
 *
 * @param db - Shared Prisma client.
 * @param input - Edit parameters.
 * @throws TRPCError `NOT_FOUND` when the model is not visible or a linked dataset does not exist,
 * `FORBIDDEN` when the actor does not own the model, `BAD_REQUEST` when a peak names an unlinked
 * dataset, `CONFLICT` when two edits create a draft at the same time.
 */
export async function saveDraft(
  db: PrismaClient,
  input: SaveDraftInput,
): Promise<void> {
  const model = await loadOwnedModelByTag(db, input.actorUserId, input.tag);
  const { content } = input;
  try {
    await db.$transaction(async (tx) => {
      await lockModelRow(tx, model.id);
      const draftId = await ensureDraftVersion(tx, model.id);
      if (content.title !== undefined || content.description !== undefined) {
        await tx.opticalModel.update({
          where: { id: model.id },
          data: {
            ...(content.title !== undefined ? { title: content.title } : {}),
            ...(content.description !== undefined
              ? { description: content.description }
              : {}),
          },
        });
      }
      if (content.normalization !== undefined) {
        await tx.opticalModelVersion.update({
          where: { id: draftId },
          data: {
            normalization:
              content.normalization === null
                ? Prisma.DbNull
                : (content.normalization as Prisma.InputJsonValue),
          },
        });
      }
      if (content.datasets !== undefined) {
        await replaceDraftDatasets(tx, draftId, content.datasets);
      }
      if (content.peaks !== undefined) {
        await replaceDraftPeaks(tx, draftId, content.peaks);
      }
      await assertPeakDatasetsLinked(tx, draftId);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The draft changed at the same time; retry.",
      });
    }
    throw error;
  }
}
