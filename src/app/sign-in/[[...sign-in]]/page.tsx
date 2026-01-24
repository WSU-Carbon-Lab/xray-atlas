"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { GitHubIcon } from "~/app/components/icons";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const handleGitHubSignIn = () => {
    void signIn("github", { callbackUrl });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-4 text-2xl font-bold">Sign in to X-ray Atlas</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Sign in with your GitHub account to continue
        </p>
        <div className="space-y-3">
          <button
            onClick={handleGitHubSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-white hover:bg-gray-800 transition-colors font-medium dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <GitHubIcon className="h-5 w-5" />
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
