/**
 * Permanent short link `/m/{tag}` for an optical model.
 *
 * Redirects (308) to the primary dataset of the model's latest published version at
 * `/d/{atlasDatasetId}?model={tag}` until a dedicated model page exists. The redirect targets the
 * canonical public Atlas origin. Only public models resolve; every other tag, malformed or not
 * visible to anonymous readers, answers 404. The handler never assigns Atlas dataset ids.
 */

import { NextResponse } from "next/server";
import { normalizeOpticalModelTag } from "~/lib/optical-models/tag";
import { db } from "~/server/db";
import { readAtlasDatasetId } from "~/server/nexafs/atlas-dataset-id";
import { getAtlasPublicSiteOrigin } from "~/server/zenodo/atlas-public-site-origin";

export const dynamic = "force-dynamic";

/** Redirects a public model tag to its primary dataset page. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ tag: string }> },
): Promise<Response> {
  const { tag: rawTag } = await context.params;
  const tag = normalizeOpticalModelTag(rawTag);
  if (!tag) {
    return new NextResponse("Not found", { status: 404 });
  }
  const model = await db.opticalModel.findFirst({
    where: { tag, visibility: "public" },
    select: { id: true },
  });
  if (!model) {
    return new NextResponse("Not found", { status: 404 });
  }
  const orderBy = [
    { version: { versionNumber: "desc" as const } },
    { experimentId: "asc" as const },
  ];
  const versionWhere = { modelId: model.id, status: "published" as const };
  const link =
    (await db.opticalModelDataset.findFirst({
      where: { role: "primary", version: versionWhere },
      orderBy,
      select: { experimentId: true },
    })) ??
    (await db.opticalModelDataset.findFirst({
      where: { version: versionWhere },
      orderBy,
      select: { experimentId: true },
    }));
  if (!link) {
    return new NextResponse("Not found", { status: 404 });
  }
  const atlasId = await readAtlasDatasetId(db, link.experimentId);
  if (!atlasId) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.redirect(
    new URL(`/d/${atlasId}?model=${tag}`, getAtlasPublicSiteOrigin()),
    308,
  );
}
