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

type UploadUrlInput = Parameters<Caller["requestUploadUrl"]>[0];

/**
 * Registers an auxiliary file and returns a signed storage upload URL.
 *
 * Requires `Authorization: Bearer` with the `write` scope and edit rights. Body: `{ upload:
 * { originalFilename, mimeType, sizeBytes, kind, description? } }`. A `sessionId` is not used
 * at this step (sessions attach at commit) and is ignored. Responds with `{ fileId, signedUrl,
 * token, storagePath }`; the client PUTs the bytes to `signedUrl`, then calls commit.
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
    const result = await caller.experimentFile.requestUploadUrl({
      ...body,
      experimentId,
    } as unknown as UploadUrlInput);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
