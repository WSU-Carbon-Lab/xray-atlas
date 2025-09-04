import { SignIn } from "@clerk/nextjs";
import { MolecularBackground } from "~/app/_components/molecular-background";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { Suspense } from "react";

function SignInSkeleton() {
  return (
    <div className="w-full max-w-md p-6">
      <Card className="mb-8 border-0 bg-transparent backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Sign in to access the X-ray Atlas database and contribute to
            advancing material research.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="rounded-lg border border-white/20 bg-white/90 p-6 shadow-xl backdrop-blur-md">
        <Skeleton className="mb-4 h-10 w-full" />
        <Skeleton className="mb-4 h-10 w-full" />
        <Skeleton className="mb-4 h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function SignInContent() {
  return (
    <div className="w-full max-w-md p-6">
      <Card className="mb-8 border-0 bg-transparent backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Sign in to access the X-ray Atlas database and contribute to
            advancing material research.
          </CardDescription>
        </CardHeader>
      </Card>

      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-transparent shadow-none border-0",
          },
        }}
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <MolecularBackground>
      <Suspense fallback={<SignInSkeleton />}>
        <SignInContent />
      </Suspense>
    </MolecularBackground>
  );
}
