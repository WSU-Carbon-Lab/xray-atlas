/**
 * Read paths for optical models: dataset-scoped lists, paged personal lists, and version detail.
 *
 * Owns every query that returns models to a viewer and applies `visibleModelWhere` inside the
 * Prisma `where`, so counts and pages never include models the viewer cannot see. Does not
 * mutate anything, except that listing a dataset's models first tries to heal a missing default
 * model.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { OpticalModel, Prisma, PrismaClient } from "~/prisma/client";
import { normalizeAtlasDatasetId } from "~/lib/atlas-dataset-id";
import { trySyncDefaultOpticalModel } from "~/server/optical-models/default-model";
import {
  authorsForVersion,
  modelSummaryInclude,
  toModelSummary,
  toVersionDto,
  versionDetailInclude,
  type ModelSummaryRow,
  type OpticalModelDetail,
  type OpticalModelSummary,
  type VersionDetailRow,
} from "~/server/optical-models/dto";
import {
  loadVisibleModelByTag,
  visibleModelWhere,
  type ModelViewer,
} from "~/server/optical-models/visibility";

/** Which of the visible models a dataset list returns. */
export type ModelListScope = "public" | "mine" | "shared" | "all";

/** Which version of a model to load: the latest published, the owner's draft, or a number. */
export type ModelVersionSelector = "latest" | "draft" | number;

/** One page of a model list. `nextCursor` is `null` on the last page. */
export interface ModelPage {
  items: OpticalModelSummary[];
  nextCursor: string | null;
}

const MATCH_NOTHING: Prisma.OpticalModelWhereInput = { id: { in: [] } };

/**
 * Experiment id for an Atlas dataset id or an experiment UUID.
 *
 * @param db - Shared Prisma client.
 * @param dataset - Atlas dataset id (8 characters, any case) or experiment UUID.
 * @returns The experiment primary key.
 * @throws TRPCError `NOT_FOUND` when no dataset matches.
 */
export async function resolveDatasetToExperimentId(
  db: PrismaClient,
  dataset: string,
): Promise<string> {
  const atlasId = normalizeAtlasDatasetId(dataset);
  if (atlasId) {
    const row = await db.experiments.findFirst({
      where: { atlasdatasetid: atlasId },
      select: { id: true },
    });
    if (row) return row.id;
  }
  if (z.string().uuid().safeParse(dataset).success) {
    const row = await db.experiments.findUnique({
      where: { id: dataset },
      select: { id: true },
    });
    if (row) return row.id;
  }
  throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
}

function scopeFilter(
  viewer: ModelViewer,
  scope: ModelListScope,
): Prisma.OpticalModelWhereInput {
  switch (scope) {
    case "public":
      return { visibility: "public" };
    case "mine":
      return viewer.userId ? { ownerOrcid: viewer.userId } : MATCH_NOTHING;
    case "shared":
      return viewer.userId
        ? {
            visibility: "shared",
            ownerOrcid: { not: viewer.userId },
            shares: { some: { granteeOrcid: viewer.userId } },
          }
        : MATCH_NOTHING;
    case "all":
      return {};
    default: {
      const exhaustive: never = scope;
      throw new Error(`Unhandled list scope: ${String(exhaustive)}`);
    }
  }
}

/**
 * Ids of the parent models among `rows` that `viewer` can see.
 *
 * @param db - Shared Prisma client.
 * @param viewer - The caller reading the list.
 * @param rows - Model rows whose `forkedFromVersion` parents are checked.
 * @returns Parent model ids visible to `viewer`.
 */
async function visibleParentModelIds(
  db: PrismaClient,
  viewer: ModelViewer,
  rows: readonly ModelSummaryRow[],
): Promise<Set<string>> {
  const parentIds = rows.flatMap((row) =>
    row.forkedFromVersion ? [row.forkedFromVersion.model.id] : [],
  );
  if (parentIds.length === 0) return new Set();
  const visible = await db.opticalModel.findMany({
    where: { AND: [{ id: { in: parentIds } }, visibleModelWhere(viewer)] },
    select: { id: true },
  });
  return new Set(visible.map((model) => model.id));
}

/**
 * Models visible to `viewer` that have a published version linking `experimentId`.
 *
 * Tries to create or refresh the dataset's default model first, so datasets that predate default
 * models still list one. The default model is listed first; the rest are newest first. At most 200
 * models are returned.
 *
 * @param db - Shared Prisma client.
 * @param viewer - The caller reading the list.
 * @param experimentId - Dataset (experiment) primary key.
 * @param scope - `public`, `mine`, `shared` (shared with the viewer by someone else), or `all`.
 * @returns Summaries whose `reviewState` is the review on `experimentId`.
 */
export async function listModelsForDataset(
  db: PrismaClient,
  viewer: ModelViewer,
  experimentId: string,
  scope: ModelListScope,
): Promise<OpticalModelSummary[]> {
  await trySyncDefaultOpticalModel(db, experimentId);
  const linkedWhere: Prisma.OpticalModelWhereInput = {
    AND: [
      visibleModelWhere(viewer),
      scopeFilter(viewer, scope),
      {
        versions: {
          some: {
            status: "published",
            datasets: { some: { experimentId } },
          },
        },
      },
    ],
  };
  const rows = await db.opticalModel.findMany({
    where: linkedWhere,
    include: modelSummaryInclude,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const defaultRow = await db.opticalModel.findFirst({
    where: { AND: [linkedWhere, { defaultForExperimentId: experimentId }] },
    include: modelSummaryInclude,
  });
  const allRows =
    defaultRow && !rows.some((row) => row.tag === defaultRow.tag)
      ? [defaultRow, ...rows]
      : rows;
  const visibleParents = await visibleParentModelIds(db, viewer, allRows);
  const items = allRows.map((row) =>
    toModelSummary(row, experimentId, visibleParents),
  );
  items.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  return items;
}

async function pageModels(
  db: PrismaClient,
  viewer: ModelViewer,
  where: Prisma.OpticalModelWhereInput,
  cursor: string | undefined,
  limit: number,
): Promise<ModelPage> {
  const rows = await db.opticalModel.findMany({
    where,
    include: modelSummaryInclude,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const visibleParents = await visibleParentModelIds(db, viewer, slice);
  return {
    items: slice.map((row) => toModelSummary(row, null, visibleParents)),
    nextCursor: hasMore ? slice[slice.length - 1]!.id : null,
  };
}

/**
 * Models owned by `userId`, including drafts-only models, newest first.
 *
 * @param db - Shared Prisma client.
 * @param userId - Owner ORCID iD.
 * @param cursor - `nextCursor` of the previous page, or undefined for the first page.
 * @param limit - Page size, 1 to 100.
 */
export async function listMyModels(
  db: PrismaClient,
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<ModelPage> {
  return pageModels(db, { userId }, { ownerOrcid: userId }, cursor, limit);
}

/**
 * Published `shared` models that someone else shared with `userId`, newest first.
 *
 * @param db - Shared Prisma client.
 * @param userId - Grantee ORCID iD.
 * @param cursor - `nextCursor` of the previous page, or undefined for the first page.
 * @param limit - Page size, 1 to 100.
 */
export async function listModelsSharedWithUser(
  db: PrismaClient,
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<ModelPage> {
  return pageModels(
    db,
    { userId },
    {
      visibility: "shared",
      ownerOrcid: { not: userId },
      shares: { some: { granteeOrcid: userId } },
      versions: { some: { status: "published" } },
    },
    cursor,
    limit,
  );
}

/** A visible model with one selected version loaded. */
export interface LoadedModelVersion {
  model: OpticalModel;
  version: VersionDetailRow;
  isOwner: boolean;
}

/**
 * Loads a visible model and one of its versions.
 *
 * `latest` is the highest published version, a number is that published version, and `draft` is
 * the draft, which only the owner can see.
 *
 * @param db - Shared Prisma client.
 * @param viewer - The caller reading the model.
 * @param tag - Model tag, any case.
 * @param selector - Which version to load.
 * @throws TRPCError `NOT_FOUND` when the model is invisible, the version does not exist, or a
 * non-owner asks for the draft.
 */
export async function loadModelVersion(
  db: PrismaClient,
  viewer: ModelViewer,
  tag: string,
  selector: ModelVersionSelector,
): Promise<LoadedModelVersion> {
  const model = await loadVisibleModelByTag(db, viewer, tag);
  const isOwner = viewer.userId !== null && model.ownerOrcid === viewer.userId;
  let where: Prisma.OpticalModelVersionWhereInput;
  if (selector === "draft") {
    if (!isOwner) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Model not found." });
    }
    where = { modelId: model.id, status: "draft" };
  } else if (selector === "latest") {
    where = { modelId: model.id, status: "published" };
  } else {
    where = { modelId: model.id, status: "published", versionNumber: selector };
  }
  const version = await db.opticalModelVersion.findFirst({
    where,
    orderBy: { versionNumber: "desc" },
    include: versionDetailInclude,
  });
  if (!version) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Model version not found.",
    });
  }
  return { model, version, isOwner };
}

/**
 * Model detail for one version.
 *
 * @param db - Shared Prisma client.
 * @param viewer - The caller reading the model.
 * @param tag - Model tag, any case.
 * @param selector - Which version to load.
 * @returns The model summary, description, the selected version, all published version numbers,
 * and whether the owner has a draft.
 * @throws TRPCError `NOT_FOUND` as {@link loadModelVersion}.
 */
export async function loadModelDetail(
  db: PrismaClient,
  viewer: ModelViewer,
  tag: string,
  selector: ModelVersionSelector,
): Promise<OpticalModelDetail> {
  const { model, version, isOwner } = await loadModelVersion(
    db,
    viewer,
    tag,
    selector,
  );
  const summaryRow = await db.opticalModel.findUniqueOrThrow({
    where: { id: model.id },
    include: modelSummaryInclude,
  });
  const authors = await db.opticalModelAuthor.findMany({
    where: { modelId: model.id },
    include: { user: { select: { name: true } } },
    orderBy: [{ role: "asc" }, { orcid: "asc" }],
  });
  const published = await db.opticalModelVersion.findMany({
    where: { modelId: model.id, status: "published" },
    orderBy: { versionNumber: "asc" },
    select: { versionNumber: true },
  });
  const draftCount = isOwner
    ? await db.opticalModelVersion.count({
        where: { modelId: model.id, status: "draft" },
      })
    : 0;
  return {
    ...toModelSummary(
      summaryRow,
      null,
      await visibleParentModelIds(db, viewer, [summaryRow]),
    ),
    description: model.description,
    version: toVersionDto(version, authorsForVersion(version, authors)),
    versions: published.flatMap((entry) =>
      entry.versionNumber === null ? [] : [entry.versionNumber],
    ),
    hasDraft: draftCount > 0,
  };
}
