import { NextResponse } from "next/server";
import {
  createV1Caller,
  handleV1,
  readJsonBody,
  requireBearerScope,
  requireJsonObject,
  type JsonValue,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

type DeleteInput = Parameters<
  ReturnType<typeof createV1Caller>["experimentFile"]["softDelete"]
>[0];

/**
 * Soft-deletes one auxiliary file of a dataset.
 *
 * Requires `Authorization: Bearer` with the `write` scope. Optional JSON body (or the
 * `sessionId` query parameter): `{ sessionId?, confirmVersionBump? }`. With a session the
 * removal is registered there without a bump; without one `confirmVersionBump` is required and
 * the deletion bumps the minor version. Responds with the procedure result.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ experimentId: string; fileId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const { experimentId, fileId } = await context.params;
    const text = (await request.clone().text()).trim();
    const body: { [key: string]: JsonValue } =
      text.length > 0 ? requireJsonObject(await readJsonBody(request)) : {};
    const querySession = new URL(request.url).searchParams.get("sessionId");
    const caller = createV1Caller(bearer, request);
    const result = await caller.experimentFile.softDelete({
      ...body,
      ...(querySession ? { sessionId: querySession } : {}),
      experimentId,
      fileId,
    } as unknown as DeleteInput);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
