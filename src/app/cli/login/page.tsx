import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CliLoginClient } from "~/app/cli/login/cli-login-client";
import {
  CLI_DEFAULT_TOKEN_NAME,
  CLI_TOKEN_NAME_MAX_LENGTH,
  isCliCodeChallenge,
  isCliLoginState,
  parseLoopbackRedirectUri,
} from "~/server/cli/access-token";
import { parseCliScopeString } from "~/server/cli/cli-scopes";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CLI login",
  robots: { index: false, follow: false },
};

interface CliLoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Browser half of `xatlas login`.
 *
 * Accepts the loopback PKCE parameters plus optional `scope` (`read` or
 * `read write`, default `read`) and `token_name` (default `xatlas`). Sends an
 * unsigned visitor to ORCID sign-in, then the client shows a consent step
 * (scopes and token name), confirms a passkey, and posts the approval. The token is delivered to
 * the CLI callback, not shown on this page.
 */
export default async function CliLoginPage({
  searchParams,
}: CliLoginPageProps) {
  const params = await searchParams;
  const redirectUri = firstQueryValue(params.redirect_uri);
  const state = firstQueryValue(params.state);
  const codeChallenge = firstQueryValue(params.code_challenge);
  const redirectUrl = parseLoopbackRedirectUri(redirectUri);
  const requestedScopes = parseCliScopeString(firstQueryValue(params.scope));
  const tokenName =
    firstQueryValue(params.token_name)
      .trim()
      .slice(0, CLI_TOKEN_NAME_MAX_LENGTH) || CLI_DEFAULT_TOKEN_NAME;

  if (
    !redirectUrl ||
    !isCliLoginState(state) ||
    !isCliCodeChallenge(codeChallenge)
  ) {
    return (
      <main className="bg-surface-1 flex min-h-screen items-center justify-center p-4">
        <div className="border-border-default bg-surface-1 w-full max-w-md rounded-2xl border p-8 shadow-lg">
          <h1 className="text-text-primary text-2xl font-bold">
            CLI login link is invalid
          </h1>
          <p className="text-text-secondary mt-3 text-sm">
            Run{" "}
            <span className="text-text-primary font-mono">xatlas login</span>{" "}
            again and open the URL it prints. This page only accepts a loopback
            callback from that command.
          </p>
        </div>
      </main>
    );
  }

  const returnPath = `/cli/login?${new URLSearchParams({
    redirect_uri: redirectUrl.toString(),
    state,
    code_challenge: codeChallenge,
    scope: (requestedScopes.length > 0 ? requestedScopes : ["read"]).join(" "),
    token_name: tokenName,
  }).toString()}`;
  const userId = await getSessionUserIdFromCookies(db);
  if (!userId) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(returnPath)}`);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(returnPath)}`);
  }

  return (
    <CliLoginClient
      orcid={user.id}
      name={user.name}
      redirectUri={redirectUrl.toString()}
      state={state}
      codeChallenge={codeChallenge}
      requestsWrite={requestedScopes.includes("write")}
      defaultTokenName={tokenName}
    />
  );
}

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
