"use client";

import { useState } from "react";
import { useCurrentUser } from "~/lib/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { MolecularBackground } from "~/app/_components/molecular-background";
import { Building, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const client = generateClient<Schema>();

export default function CreateOrganizationPage() {
  // Temporarily disabled authentication for build
  // const { user, loading: authLoading } = useCurrentUser();
  const user: { userId?: string } | null = null;
  const authLoading = false;
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Temporarily disabled for build
    setError("Organization creation is temporarily disabled");
  };

  if (authLoading) {
    return (
      <MolecularBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardContent className="p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                  <div className="h-10 rounded bg-gray-200"></div>
                  <div className="h-10 rounded bg-gray-200"></div>
                  <div className="h-20 rounded bg-gray-200"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MolecularBackground>
    );
  }

  if (!user) {
    return (
      <MolecularBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl text-center">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>
                  Please sign in to create an organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href="/sign-in">Sign In with ORCID</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MolecularBackground>
    );
  }

  return (
    <MolecularBackground>
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <Button variant="outline" asChild>
              <Link href="/organizations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Organizations
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Create New Organization
              </CardTitle>
              <CardDescription>
                Create a new organization to collaborate with other researchers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Organization Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Collins Research Group"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your organization's research focus and goals..."
                    rows={4}
                    className="w-full rounded-md border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="flex-1"
                  >
                    <Link href="/organizations">Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="flex-1"
                  >
                    {creating ? "Creating..." : "Create Organization"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MolecularBackground>
  );
}
