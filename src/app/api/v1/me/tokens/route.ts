import { NextResponse } from "next/server";
import {
  createV1Caller,
  handleV1,
  requireBearerScope,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

/**
 * Lists the token owner's CLI tokens, newest first (at most 100), including expired and revoked
 * rows. Token secrets and hashes are never returned.
 *
 * Requires `Authorization: Bearer` with the `read` scope. Responds with
 * `{ tokens: [{ id, name, tokenPrefix, scopes, kind, createdAt, lastUsedAt, expiresAt,
 * revokedAt, current }] }`; `current` marks the token that made the request.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "read");
    const caller = createV1Caller(bearer, request);
    const rows = await caller.users.listCliTokens();
    return NextResponse.json(
      {
        tokens: rows.map((row) => ({
          id: row.id,
          name: row.name,
          tokenPrefix: row.tokenPrefix,
          scopes: row.scopes,
          kind: row.kind,
          createdAt: row.createdAt.toISOString(),
          lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
          expiresAt: row.expiresAt.toISOString(),
          revokedAt: row.revokedAt?.toISOString() ?? null,
          current: row.id === bearer.tokenId,
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
