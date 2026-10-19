import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CliAccessError,
  cliError,
  exchangeCliAuthorizationCode,
} from "~/server/cli/access-token";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(128),
  codeVerifier: z.string().trim().min(1).max(128),
  redirectUri: z.string().trim().min(1).max(256),
});

/**
 * Exchanges the loopback PKCE code for a read token.
 *
 * The plaintext token is in this response only. A later login for the same
 * account revokes the previous token.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return cliError("Login code is invalid or expired.", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return cliError("Login code is invalid or expired.", 400);
  }

  try {
    const issued = await exchangeCliAuthorizationCode(db, parsed.data, request);
    return NextResponse.json(issued, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof CliAccessError) {
      return cliError(error.message, error.status);
    }
    throw error;
  }
}
