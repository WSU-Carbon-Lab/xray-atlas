import { NextResponse } from "next/server";
import {
  createV1Caller,
  handleV1,
  requireBearerScope,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

/**
 * Opens an auxiliary-file upload session for one dataset.
 *
 * Requires `Authorization: Bearer` with the `write` scope and edit rights on the dataset
 * (`experimentFile.openUploadSession`). Files committed into the session do not bump the
 * version; closing the session applies one bump. Responds 201 with `{ sessionId }`.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ experimentId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const { experimentId } = await context.params;
    const caller = createV1Caller(bearer, request);
    const result = await caller.experimentFile.openUploadSession({
      experimentId,
    });
    return NextResponse.json(result, {
      status: 201,
      headers: { "cache-control": "no-store" },
    });
  });
}
