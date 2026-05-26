"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SocialSignInButtons } from "@/components/auth/social-sign-in-buttons";

const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  GitHubRequiresOrcid:
    "Sign in with ORCID first to create your account, then link GitHub from your profile.",
  InvalidOrcid: "ORCID sign-in failed. Check your ORCID credentials and try again.",
};

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const authError = searchParams.get("error");
  const errorMessage =
    authError && SIGN_IN_ERROR_MESSAGES[authError]
      ? SIGN_IN_ERROR_MESSAGES[authError]
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-1 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-1 p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">
          Sign in to X-ray Atlas
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          Sign in with{" "}
          <a
            href="https://orcid.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-dark underline"
          >
            ORCID
          </a>{" "}
          to create or access your account. After your first ORCID sign-in, register a passkey from
          your profile before contributing data. Returning users can sign in with an existing
          passkey. GitHub works only after you link it from your profile.
        </p>
        {errorMessage ? (
          <p className="text-error mb-4 text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <SocialSignInButtons callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-text-secondary">Loading…</div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
