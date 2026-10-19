import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { readDatasetVersion } from "~/server/nexafs/apply-versioned-change";
import { formatDatasetVersion } from "~/server/nexafs/dataset-versioning";
import {
  createV1Caller,
  handleV1,
  readJsonBody,
  requireBearerScope,
  requireJsonObject,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

type NormalizationInput = Parameters<
  ReturnType<
    typeof createV1Caller
  >["experiments"]["updateNormalizationMetadata"]
>[0];

/**
 * Replaces the normalization scope and pre/post-edge windows of one dataset and advances its
 * patch version.
 *
 * Requires `Authorization: Bearer` with the `write` scope. The JSON body is the
 * `experiments.updateNormalizationMetadata` input without `experimentId`: `normalization`,
 * optional `uploadedChannels` and `reason`, and `confirmVersionBump: { fromVersion }`. A missing
 * confirmation is 422 with `VERSION_BUMP_CONFIRMATION_REQUIRED`; a stale `fromVersion` is 409.
 * Responds with `{ experimentId, version, normalizationScope, normalizationRanges }` where `version` is the stored version after the edit. Authorization and agreement checks are those of the procedure.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ experimentId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const { experimentId } = await context.params;
    const body = requireJsonObject(await readJsonBody(request));
    const caller = createV1Caller(bearer, request);
    const result = await caller.experiments.updateNormalizationMetadata({
      ...body,
      experimentId,
    } as unknown as NormalizationInput);
    const version = formatDatasetVersion(
      await readDatasetVersion(db, experimentId),
    );
    return NextResponse.json(
      {
        experimentId: result.id,
        version,
        normalizationScope: result.normalizationscope,
        normalizationRanges: result.normalizationranges,
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
