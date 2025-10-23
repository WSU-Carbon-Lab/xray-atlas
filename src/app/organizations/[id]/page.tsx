"use client";

import { useState, useEffect, useCallback } from "react";
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
import { MolecularBackground } from "~/app/_components/molecular-background";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { Building, Users, Settings, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const client = generateClient<Schema>();

type Organization = {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joined_at?: string;
  user?: {
    name?: string;
    email?: string;
    orcid_id?: string;
  };
};

export default function OrganizationDetailsPage() {
  // Temporarily disabled authentication for build
  // const { user, loading: authLoading } = useCurrentUser();
  const user: { userId?: string } | null = null;
  const authLoading = false;
  const params = useParams();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [userMembership, setUserMembership] =
    useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrganizationDetails = useCallback(async () => {
    // Temporarily disabled for build
    setLoading(false);
  }, []);

  useEffect(() => {
    // Temporarily disabled for build
    setLoading(false);
  }, []);

  if (authLoading || loading) {
    return (
      <MolecularBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <Skeleton className="mb-6 h-8 w-64" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64 lg:col-span-2" />
            </div>
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
                  Please sign in to view organization details.
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

  if (!organization) {
    return (
      <MolecularBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl text-center">
            <Card>
              <CardHeader>
                <CardTitle>Organization Not Found</CardTitle>
                <CardDescription>
                  The organization you're looking for doesn't exist or you don't
                  have access to it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/organizations">Back to Organizations</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MolecularBackground>
    );
  }

  const isOwner = userMembership?.role === "OWNER";
  const isAdmin = userMembership?.role === "ADMIN" || isOwner;

  return (
    <MolecularBackground>
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <Button variant="outline" asChild>
              <Link href="/organizations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Organizations
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {organization.name}
                </CardTitle>
                <CardDescription>
                  {organization.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {organization.created_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created{" "}
                      {new Date(organization.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Your Role
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      userMembership?.role === "OWNER"
                        ? "bg-purple-100 text-purple-800"
                        : userMembership?.role === "ADMIN"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {userMembership?.role?.toLowerCase()}
                  </span>
                </div>

                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <Link href={`/organizations/${organization.id}/settings`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Organization
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Members List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members ({members.length})
                </CardTitle>
                <CardDescription>
                  People who are part of this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">
                    No members found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.user?.name ||
                                member.user?.email ||
                                "Unknown User"}
                            </p>
                            {member.user?.orcid_id && (
                              <p className="text-sm text-gray-600">
                                ORCID: {member.user.orcid_id}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              member.role === "OWNER"
                                ? "bg-purple-100 text-purple-800"
                                : member.role === "ADMIN"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {member.role.toLowerCase()}
                          </span>
                          {member.joined_at && (
                            <span className="text-xs text-gray-500">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MolecularBackground>
  );
}
