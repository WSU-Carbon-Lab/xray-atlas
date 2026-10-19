import { NextResponse } from "next/server";
import {
  createV1Caller,
  handleV1,
  readJsonBody,
  requireBearerScope,
  requireJsonObject,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

type Caller = ReturnType<typeof createV1Caller>["experimentFile"];

type CommitInput = Parameters<Caller["commitUpload"]>[0];

/**
 * Commits an uploaded auxiliary file after its bytes reached storage.
 *
 * Requires `Authorization: Bearer` with the `write` scope. Body: `{ commit: { fileId,
 * checksumSha256 }, sessionId?, confirmVersionBump?, initialUpload? }`. With `sessionId` the
 * addition is registered in that session and the version does not change. Without it,
 * `confirmVersionBump` is required (422 otherwise) and the commit bumps the minor version.
 * Responds with the committed file row.
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
    const result = await caller.experimentFile.commitUpload({
      ...body,
      experimentId,
    } as unknown as CommitInput);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
