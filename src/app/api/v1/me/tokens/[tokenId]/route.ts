import { NextResponse } from "next/server";
import {
  createV1Caller,
  handleV1,
  requireBearerScope,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

/**
 * Revokes one of the token owner's own CLI tokens, possibly the presented one.
 *
 * Requires `Authorization: Bearer` with the `write` scope. Delegates to `users.revokeCliToken`
 * (ownership check, idempotency, audit event). That procedure refuses bearer-token mutations by
 * design, so this route calls it with a session-like context after verifying the `write` scope
 * and token identity itself. Unknown or foreign ids answer 404. Responds with `{ revoked: true }`.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ tokenId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const { tokenId } = await context.params;
    const caller = createV1Caller(bearer, request, { sessionLike: true });
    const result = await caller.users.revokeCliToken({ tokenId });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
