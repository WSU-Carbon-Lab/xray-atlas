"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "~/app/components/LoadingState";
import { ORCIDIcon } from "~/app/components/icons";
import { Button, Input, Label, Tooltip } from "@heroui/react";
import Link from "next/link";
import { Avatar } from "@heroui/react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { data: user, isLoading: isLoadingUser } = trpc.users.getCurrent.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );
  const updateORCID = trpc.users.updateORCID.useMutation();
  const removeORCID = trpc.users.removeORCID.useMutation();
  const utils = trpc.useUtils();

  const [orcidInput, setOrcidInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading" || isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (!session?.user || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to access your account preferences.
          </p>
        </div>
      </div>
    );
  }

  const handleSaveORCID = async () => {
    setError(null);
    try {
      await updateORCID.mutateAsync({ orcid: orcidInput });
      await utils.users.getCurrent.invalidate();
      setIsEditing(false);
      setOrcidInput("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update ORCID. Please check the format and try again.",
      );
    }
  };

  const handleRemoveORCID = async () => {
    setError(null);
    try {
      await removeORCID.mutateAsync();
      await utils.users.getCurrent.invalidate();
      setIsEditing(false);
      setOrcidInput("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove ORCID. Please try again.",
      );
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setOrcidInput("");
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-accent dark:text-gray-400 dark:hover:text-accent"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Account Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar size="lg" className="h-24 w-24">
              {session.user.image ? (
                <Avatar.Image
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                />
              ) : null}
              <Avatar.Fallback>
                {session.user.name?.charAt(0).toUpperCase() ?? "U"}
              </Avatar.Fallback>
            </Avatar>

            <div className="flex-1">
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                {session.user.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{session.user.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  ORCID iD
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Link your ORCID iD to your account for better research attribution
                </p>
              </div>
            </div>

            {user.orcid && !isEditing ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-surface-1 p-4 dark:border-gray-700 dark:bg-surface-2">
                <div className="flex items-center gap-3">
                  <ORCIDIcon className="h-6 w-6" authenticated />
                  <div>
                    <a
                      href={`https://orcid.org/${user.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                      aria-label={`View ORCID record - ${user.orcid}`}
                    >
                      <span className="tabular-nums">{user.orcid}</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Authenticated ORCID iD
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setIsEditing(true);
                      setOrcidInput(user.orcid ?? "");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={handleRemoveORCID}
                    isPending={removeORCID.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Tooltip delay={0}>
                  <Tooltip.Trigger>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="settings-orcid">
                        ORCID iD{" "}
                        <span className="text-error" aria-hidden>
                          *
                        </span>
                      </Label>
                      <Input
                        id="settings-orcid"
                        aria-label="ORCID iD"
                        placeholder="0000-0000-0000-0000"
                        value={orcidInput}
                        onChange={(e) => {
                          setOrcidInput(e.target.value);
                          setError(null);
                        }}
                        className="tabular-nums"
                        variant="secondary"
                        fullWidth
                        aria-invalid={!!error}
                        aria-errormessage={
                          error ? "settings-orcid-error" : undefined
                        }
                      />
                      <p className="text-tiny text-text-tertiary">
                        Your ORCID iD helps connect your research contributions.
                      </p>
                      {error && (
                        <p
                          id="settings-orcid-error"
                          className="text-sm text-error"
                          role="alert"
                        >
                          {error}
                        </p>
                      )}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>
                      Enter your ORCID iD in the format XXXX-XXXX-XXXX-XXXX or
                      the full URL (https://orcid.org/XXXX-XXXX-XXXX-XXXX).
                    </p>
                  </Tooltip.Content>
                </Tooltip>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onPress={handleSaveORCID}
                    isPending={updateORCID.isPending}
                  >
                    {user.orcid ? "Update" : "Add"} ORCID
                  </Button>
                  {isEditing && (
                    <Button variant="ghost" onPress={handleCancel}>
                      Cancel
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Don&apos;t have an ORCID iD?{" "}
                  <a
                    href="https://orcid.org/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-dark underline"
                  >
                    Create one for free
                  </a>
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Notification Preferences
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Notification preferences will be available here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
