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

type CloseInput = Parameters<Caller["closeUploadSession"]>[0];

/**
 * Closes an upload session and applies one version bump for all its changes.
 *
 * Requires `Authorization: Bearer` with the `write` scope. Body: `{ confirmVersionBump:
 * { fromVersion } }`, required unless the session is empty. A stale `fromVersion` answers 409
 * and leaves the session open; a closed session answers 422. Responds with `{ from, to }`
 * (equal for an empty session).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ experimentId: string; sessionId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const { sessionId } = await context.params;
    const body = requireJsonObject(await readJsonBody(request));
    const caller = createV1Caller(bearer, request);
    const result = await caller.experimentFile.closeUploadSession({
      ...body,
      sessionId,
    } as unknown as CloseInput);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
