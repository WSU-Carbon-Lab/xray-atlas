import { NextResponse } from "next/server";
import {
  createV1Caller,
  handleV1,
  requireBearerScope,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

/**
 * Previews the version bump closing an upload session would apply; writes nothing.
 *
 * Requires `Authorization: Bearer` with the `write` scope; only the session opener may call it
 * (`experimentFile.previewUploadSessionBump`). Responds with `currentVersion`, `nextVersion`,
 * `level` (null for an empty session), `hasChanges`, `hasDeposit`, and `willMintDoi`. Pass
 * `currentVersion` as `confirmVersionBump.fromVersion` when closing. The session id alone
 * identifies the dataset; the `experimentId` path segment is not cross-checked.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ experimentId: string; sessionId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const { sessionId } = await context.params;
    const caller = createV1Caller(bearer, request);
    const result = await caller.experimentFile.previewUploadSessionBump({
      sessionId,
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
