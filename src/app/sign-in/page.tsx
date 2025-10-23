"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import { MolecularBackground } from "~/app/_components/molecular-background";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import React from "react";

const SIGN_IN_BOX_HEIGHT = 380;

function SignInFormSkeleton() {
  return (
    <div
      className="rounded-lg border border-white/20 bg-white/90 p-6 shadow-xl backdrop-blur-md"
      style={{ minHeight: SIGN_IN_BOX_HEIGHT }}
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function SignInContent() {
  const router = useRouter();

  return (
    <div className="w-full max-w-md p-6">
      <Card className="mb-8 border-0 bg-transparent backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to X-ray Atlas
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Sign in with your ORCID account to access the X-ray Atlas database
            and contribute to advancing material research.
          </CardDescription>
        </CardHeader>
      </Card>

      <div style={{ minHeight: SIGN_IN_BOX_HEIGHT }}>
        <Suspense fallback={<SignInFormSkeleton />}>
          <Authenticator
            hideSignUp={true}
            components={{
              SignIn: {
                Header() {
                  return (
                    <div className="mb-6 text-center">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Sign in with ORCID
                      </h2>
                      <p className="mt-2 text-sm text-gray-600">
                        Use your ORCID account to access X-ray Atlas
                      </p>
                    </div>
                  );
                },
              },
            }}
            formFields={{
              signIn: {
                username: {
                  label: "ORCID iD",
                  placeholder: "Enter your ORCID iD",
                },
              },
            }}
          >
            {({ signOut, user }) => {
              // Redirect to home page after successful authentication
              if (user) {
                router.push("/");
              }

              return (
                <div className="text-center">
                  <p className="mb-4 text-gray-600">
                    Welcome, {user?.signInDetails?.loginId}!
                  </p>
                  <button
                    onClick={signOut}
                    className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                  >
                    Sign Out
                  </button>
                </div>
              );
            }}
          </Authenticator>
        </Suspense>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <MolecularBackground>
      <Suspense
        fallback={
          <div className="w-full max-w-md p-6">
            <Card className="mb-8 border-0 bg-transparent backdrop-blur-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Welcome to X-ray Atlas
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Sign in with your ORCID account to access the X-ray Atlas
                  database and contribute to advancing material research.
                </CardDescription>
              </CardHeader>
            </Card>
            <SignInFormSkeleton />
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </MolecularBackground>
  );
}
