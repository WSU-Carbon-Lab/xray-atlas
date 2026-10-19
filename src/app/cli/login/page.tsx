import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CliLoginClient } from "~/app/cli/login/cli-login-client";
import {
  isCliCodeChallenge,
  isCliLoginState,
  parseLoopbackRedirectUri,
} from "~/server/cli/access-token";
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
 * Sends an unsigned visitor to ORCID sign-in, then the client confirms a
 * passkey and posts the loopback PKCE challenge. The token is delivered to
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
    />
  );
}

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
