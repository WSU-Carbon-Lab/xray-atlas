import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CLI_DEFAULT_TOKEN_NAME,
  CLI_TOKEN_NAME_MAX_LENGTH,
  CliAccessError,
  cliError,
  createCliAuthorization,
} from "~/server/cli/access-token";
import { CLI_SCOPES } from "~/server/cli/cli-scopes";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  redirectUri: z.string().trim().min(1).max(256),
  state: z.string().trim().min(1).max(128),
  codeChallenge: z.string().trim().min(1).max(128),
  scopes: z.array(z.enum(CLI_SCOPES)).min(1).max(CLI_SCOPES.length),
  tokenName: z
    .string()
    .trim()
    .min(1)
    .max(CLI_TOKEN_NAME_MAX_LENGTH)
    .default(CLI_DEFAULT_TOKEN_NAME),
});

/**
 * Mints a one-time loopback code for `xatlas login`.
 *
 * Requires the website session and a passkey confirmation inside the step-up
 * window. The body carries the scopes the user approved on the consent step
 * (`scopes`, non-empty subset of `read` and `write`) and the confirmed
 * `tokenName`. The JSON response is `{ redirectTo }` for the browser. The
 * token itself is issued by `POST /api/cli/token`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserIdFromCookies(db);
  if (!userId) {
    return cliError("Sign in before creating a CLI credential.", 401);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return cliError(
      "The CLI login request is not a valid loopback callback.",
      400,
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return cliError(
      "The CLI login request is not a valid loopback callback.",
      400,
    );
  }

  try {
    const issued = await createCliAuthorization(
      db,
      userId,
      parsed.data,
      request,
    );
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
