"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "~/lib/auth";
import { fetchORCIDProfile, type ORCIDProfile } from "~/lib/orcid-api";
import { updateUserProfile } from "~/lib/user-sync";
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
import { Skeleton } from "~/app/_components/ui/skeleton";
import { User, Mail, MapPin, ExternalLink } from "lucide-react";

export default function ProfilePage() {
  // Temporarily disabled authentication for build
  // const { user, userAttributes, loading: authLoading } = useCurrentUser();
  const user: { userId?: string } | null = null;
  const userAttributes: { orcid_id?: string } | null = null;
  const authLoading = false;
  const [orcidProfile, setOrcidProfile] = useState<ORCIDProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [auxiliaryEmails, setAuxiliaryEmails] = useState<string[]>([]);
  const [contactInfo, setContactInfo] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const loadORCIDProfile = useCallback(async () => {
    // Temporarily disabled for build
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    // Temporarily disabled for build
    setProfileLoading(false);
  }, []);

  const handleAddEmail = () => {
    if (newEmail.trim() && !auxiliaryEmails.includes(newEmail.trim())) {
      setAuxiliaryEmails([...auxiliaryEmails, newEmail.trim()]);
      setNewEmail("");
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAuxiliaryEmails(
      auxiliaryEmails.filter((email) => email !== emailToRemove),
    );
  };

  const handleSaveProfile = async () => {
    // Temporarily disabled for build
    setUpdating(false);
  };

  if (authLoading) {
    return (
      <MolecularBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <Skeleton className="mb-6 h-8 w-64" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
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
                  Please sign in to view your profile.
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
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">
            Your Profile
          </h1>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* ORCID Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  ORCID Profile
                </CardTitle>
                <CardDescription>
                  Public information from your ORCID account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : orcidProfile ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {orcidProfile.name || "Name not available"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {orcidProfile.orcid_id}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://orcid.org/${orcidProfile.orcid_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View on ORCID
                        </a>
                      </Button>
                    </div>

                    {orcidProfile.biography && (
                      <div>
                        <h4 className="mb-2 font-medium">Biography</h4>
                        <p className="text-sm text-gray-600">
                          {orcidProfile.biography}
                        </p>
                      </div>
                    )}

                    {orcidProfile.country && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{orcidProfile.country}</span>
                      </div>
                    )}

                    {orcidProfile.employment &&
                      orcidProfile.employment.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">
                            Current Employment
                          </h4>
                          {orcidProfile.employment
                            .slice(0, 2)
                            .map((emp, index) => (
                              <div key={index} className="text-sm">
                                <p className="font-medium">
                                  {emp.title} at {emp.organization}
                                </p>
                                {emp.department && (
                                  <p className="text-gray-600">
                                    {emp.department}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                  </>
                ) : (
                  <p className="text-gray-500">Unable to load ORCID profile</p>
                )}
              </CardContent>
            </Card>

            {/* Editable Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Additional Information
                </CardTitle>
                <CardDescription>
                  Add supplementary contact information and details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Additional Emails
                  </label>
                  <div className="space-y-2">
                    {auxiliaryEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={email} disabled className="flex-1" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveEmail(email)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleAddEmail()
                        }
                      />
                      <Button
                        onClick={handleAddEmail}
                        disabled={!newEmail.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Contact Information
                  </label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                    rows={4}
                    placeholder="Additional contact information, research interests, etc."
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={updating}
                  className="w-full"
                >
                  {updating ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MolecularBackground>
  );
}
