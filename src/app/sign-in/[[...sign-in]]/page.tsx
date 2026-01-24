"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const handleSignIn = () => {
    void signIn("orcid", { callbackUrl });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-4 text-2xl font-bold">Sign in to X-ray Atlas</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Use your ORCID account to sign in
        </p>
        <button
          onClick={handleSignIn}
          className="w-full rounded-lg bg-accent px-4 py-3 text-white hover:bg-accent-dark transition-colors font-medium"
        >
          Sign in with ORCID
        </button>
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
