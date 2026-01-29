"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SocialSignInButtons } from "~/app/components/SocialSignInButtons";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-1 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-1 p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">
          Sign in to X-ray Atlas
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          ORCID is recommended for researchers. GitHub, Hugging Face, and passkeys are also
          available as alternatives.
        </p>
        <SocialSignInButtons callbackUrl={callbackUrl} />
        <div className="mt-6 rounded-lg bg-surface-2 p-4">
          <p className="text-xs text-text-secondary">
            <a
              href="https://orcid.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-dark underline"
            >
              Learn more at orcid.org
            </a>
          </p>
        </div>
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
