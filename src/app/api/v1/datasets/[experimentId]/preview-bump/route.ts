import { NextResponse } from "next/server";
import {
  createV1Caller,
  handleV1,
  readJsonBody,
  requireBearerScope,
  requireJsonObject,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

type PreviewInput = Parameters<
  ReturnType<typeof createV1Caller>["experiments"]["previewVersionBump"]
>[0];

/**
 * Previews the version a set of changes would produce, without writing.
 *
 * Requires `Authorization: Bearer` with the `write` scope. The JSON body is
 * `{ changes: DatasetChangeKind[] }` (1 to 5 of `normalization`, `kk_first_calculation`,
 * `kk_recalculation`, `aux_added`, `aux_removed`). Responds with `currentVersion`,
 * `nextVersion`, `level`, `hasDeposit`, and `willMintDoi`. Clients pass `currentVersion` back as
 * `confirmVersionBump.fromVersion` on the mutating route.
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
    const result = await caller.experiments.previewVersionBump({
      ...body,
      experimentId,
    } as unknown as PreviewInput);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
