"use client";

import { use, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Tabs } from "@heroui/react";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "@/components/feedback/loading-state";
import { NotFoundState, ErrorState } from "@/components/feedback/error-state";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { runPasskeyClientAuth } from "~/lib/passkey-client-auth";
import {
  ProfileApiKeysSection,
  ProfileContributionsSection,
  ProfileGitHubSecuritySection,
  ProfileHeader,
  type ProfileGitHubPresentation,
  ProfilePasskeysSection,
  ProfileSectionCard,
} from "./profile-sections";

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message
    ? error.message
    : fallbackMessage;
}

type ProfileTabId = "contributions" | "security";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ orcid: string }>;
}) {
  const { orcid: userId } = use(params);
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const passkeyRequiredRedirect = searchParams.get("passkey") === "required";

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = trpc.users.getById.useQuery(
    { id: userId },
    { retry: false },
  );

  const unlinkAccount = trpc.users.unlinkAccount.useMutation();
  const deletePasskey = trpc.users.deletePasskey.useMutation();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();

  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ProfileTabId>("contributions");

  const isOwnProfile =
    !!session?.user?.id && !!user && session.user.id === user.id;

  const { data: linkedAccounts } = trpc.users.getLinkedAccounts.useQuery(
    undefined,
    { enabled: isOwnProfile },
  );

  const { data: passkeyEnrollment } =
    trpc.users.getPasskeyEnrollmentStatus.useQuery(undefined, {
      enabled: isOwnProfile,
    });

  const { data: passkeys } = trpc.users.getPasskeys.useQuery(undefined, {
    enabled: isOwnProfile,
  });

  const tabIds = useMemo((): ProfileTabId[] => {
    if (isOwnProfile) {
      return ["contributions", "security"];
    }
    return ["contributions"];
  }, [isOwnProfile]);

  const handleRegisterPasskey = useCallback(async () => {
    setIsRegisteringPasskey(true);
    try {
      const result = await runPasskeyClientAuth({
        action: "register",
        errorFallback: "Passkey registration failed. Please try again.",
        incompleteFallback: "Passkey registration did not complete",
      });

      if (!result.ok) {
        throw new Error(
          result.errorMessage ?? "Passkey registration failed. Please try again.",
        );
      }

      await Promise.all([
        utils.users.getPasskeys.invalidate(),
        utils.users.getPasskeyEnrollmentStatus.invalidate(),
      ]);
      showToast("Passkey added", "success");
    } catch (registerError) {
      console.error("Failed to register passkey:", registerError);
      showToast(
        getErrorMessage(registerError, "Failed to register passkey"),
        "error",
        0,
      );
    } finally {
      setIsRegisteringPasskey(false);
    }
  }, [showToast, utils.users.getPasskeyEnrollmentStatus, utils.users.getPasskeys]);

  const handleDeletePasskey = useCallback(
    async (passkeyId: string) => {
      try {
        await deletePasskey.mutateAsync({ passkeyId });
        await utils.users.getPasskeys.invalidate();
        showToast("Passkey revoked", "success");
      } catch (deleteError) {
        console.error("Failed to delete passkey:", deleteError);
        showToast(
          getErrorMessage(deleteError, "Failed to revoke passkey"),
          "error",
          0,
        );
      }
    },
    [deletePasskey, showToast, utils.users.getPasskeys],
  );

  const handleUnlinkGitHub = useCallback(
    async (accountId: string) => {
      try {
        await unlinkAccount.mutateAsync({ accountId });
        await utils.users.getLinkedAccounts.invalidate();
        showToast("GitHub unlinked", "success");
      } catch (unlinkError) {
        showToast(
          getErrorMessage(unlinkError, "Failed to unlink GitHub"),
          "error",
          0,
        );
      }
    },
    [showToast, unlinkAccount, utils.users.getLinkedAccounts],
  );

  const headerGithub = useMemo((): ProfileGitHubPresentation | null | undefined => {
    if (isOwnProfile) {
      if (linkedAccounts === undefined) {
        return undefined;
      }
      const githubAccount = linkedAccounts.find(
        (account): account is Extract<
          (typeof linkedAccounts)[number],
          { provider: "github" }
        > => account.provider === "github",
      );
      if (!githubAccount) {
        return null;
      }
      const login =
        githubAccount.login ??
        `user-${githubAccount.providerAccountId.slice(0, 6)}`;
      return {
        login: githubAccount.login ?? login,
        profileUrl:
          githubAccount.profileUrl ??
          (login ? `https://github.com/${login}` : null),
      };
    }
    return user?.github ?? null;
  }, [isOwnProfile, linkedAccounts, user?.github]);

  if (isLoading || status === "loading") {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (isError) {
    if (
      error?.data?.code === "NOT_FOUND" ||
      error?.message === "User not found"
    ) {
      return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <NotFoundState
            title="User Not Found"
            message="The user you're looking for doesn't exist."
          />
        </div>
      );
    }
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <ErrorState
          title="Failed to load user"
          message={
            error?.message || "An error occurred while loading the user."
          }
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <NotFoundState />
      </div>
    );
  }

  const effectiveTab = tabIds.includes(selectedTab) ? selectedTab : tabIds[0];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-6">
        <Link
          href="/"
          className="text-muted hover:text-accent text-sm transition-colors"
        >
          Back to home
        </Link>
      </div>

      <div className="space-y-6">
        <ProfileHeader
          user={user}
          github={headerGithub}
          isOwnProfile={isOwnProfile}
        />

        {isOwnProfile ? (
          <Tabs
            selectedKey={effectiveTab}
            onSelectionChange={(key) => {
              const next = String(key);
              if (next === "security" || next === "contributions") {
                queueMicrotask(() => setSelectedTab(next));
              }
            }}
            className="w-full"
          >
            <Tabs.ListContainer className="w-full">
              <Tabs.List
                aria-label="Profile sections"
                className="border-border bg-surface flex w-full flex-wrap gap-1 rounded-xl border p-1"
              >
                <Tabs.Tab
                  id="contributions"
                  className="flex-1 px-4 py-2 text-sm font-medium"
                >
                  Contributions
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab
                  id="security"
                  className="flex-1 px-4 py-2 text-sm font-medium"
                >
                  Security
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="contributions" className="pt-6">
              <ProfileContributionsSection
                userId={user.id}
                isOwnProfile={isOwnProfile}
              />
            </Tabs.Panel>

            <Tabs.Panel id="security" className="pt-6">
              <ProfileSectionCard
                title="Account security"
                description="Passkeys for sign-in and contribution access. API keys for programmatic access are coming soon."
              >
                <ProfilePasskeysSection
                  passkeys={passkeys}
                  passkeyEnrollment={passkeyEnrollment}
                  passkeyRequiredRedirect={passkeyRequiredRedirect}
                  isRegistering={isRegisteringPasskey}
                  isDeleting={deletePasskey.isPending}
                  onRegister={handleRegisterPasskey}
                  onDelete={handleDeletePasskey}
                />
                <ProfileGitHubSecuritySection
                  linkedAccounts={linkedAccounts}
                  isUnlinking={unlinkAccount.isPending}
                  onUnlink={handleUnlinkGitHub}
                />
                <ProfileApiKeysSection />
              </ProfileSectionCard>
            </Tabs.Panel>
          </Tabs>
        ) : (
          <ProfileContributionsSection
            userId={user.id}
            isOwnProfile={isOwnProfile}
          />
        )}
      </div>
    </div>
  );
}
