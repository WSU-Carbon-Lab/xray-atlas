import { NextResponse } from "next/server";
import {
  CliAccessError,
  cliError,
  resolvePresentedCliBearer,
  revokePresentedCliToken,
} from "~/server/cli/access-token";

export const dynamic = "force-dynamic";

/**
 * Returns the account bound to the `xatlas` read credential.
 *
 * Requires `Authorization: Bearer`. Catalog list routes stay public when that
 * header is absent.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const identity = await resolvePresentedCliBearer(
    request.headers.get("authorization"),
  );
  if (!identity || identity === "invalid") {
    return cliError("Unauthorized", 401);
  }
  return NextResponse.json(
    {
      orcid: identity.userId,
      name: identity.name,
      scope: identity.scope,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * Revokes the presented `xatlas` read credential.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    await revokePresentedCliToken(
      request.headers.get("authorization"),
      request,
    );
    return NextResponse.json(
      { revoked: true },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CliAccessError) {
      return cliError(error.message, error.status);
    }
    throw error;
  }
}
