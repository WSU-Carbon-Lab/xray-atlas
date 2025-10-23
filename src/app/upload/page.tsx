"use client";

import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";

export default function UploadPage() {
  // Temporarily disabled authentication for build
  // const { user, loading } = useCurrentUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-center text-3xl font-thin">
        Upload Data to X-ray Atlas
      </h1>
      <div className="mx-auto max-w-2xl text-center">
        <Card>
          <CardHeader>
            <CardTitle>Upload Feature Coming Soon</CardTitle>
            <CardDescription>
              The upload functionality is currently being developed. Please
              check back later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
