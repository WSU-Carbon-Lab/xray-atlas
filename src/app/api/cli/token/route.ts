import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CLI_AUTH_CODE_MAX_LENGTH,
  CliAccessError,
  cliError,
  exchangeCliAuthorizationCode,
} from "~/server/cli/access-token";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(CLI_AUTH_CODE_MAX_LENGTH),
  codeVerifier: z.string().trim().min(1).max(128),
  redirectUri: z.string().trim().min(1).max(256),
});

/**
 * Exchanges the loopback PKCE code for a named token with the approved scopes.
 *
 * The plaintext token is in this response only. Other tokens of the account
 * stay valid. The response is `{ token, scopes, scope, tokenName, expiresAt,
 * orcid, name }`.
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
