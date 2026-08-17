"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tabs } from "@heroui/react";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "~/trpc/client";
import { ToastContainer, useToast } from "~/components/ui/toast";
import {
  isPasskeyClientCancelled,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";
import { useDestructiveSessionStepUp } from "~/hooks/useDestructiveSessionStepUp";
import { ProfileAttributionPreferencesSection } from "~/features/account/attributions/attribution-preferences-panel";
import type { AppRouter } from "~/server/api/root";
import {
  ProfileApiKeysSection,
  ProfileContributionsSection,
  ProfileGitHubSecuritySection,
  ProfileHeader,
  type ProfileGitHubPresentation,
  ProfilePasskeysSection,
  ProfileSectionCard,
} from "./profile-sections";

type ProfileUser = inferRouterOutputs<AppRouter>["users"]["getById"];
type ProfileContributionStats =
  inferRouterOutputs<AppRouter>["users"]["getProfileContributionStats"];

type ProfileTabId = "contributions" | "preferences" | "security";

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message
    ? error.message
    : fallbackMessage;
}

/**
 * Client island for profile tabs, passkeys, and mutations after the server shell renders.
 */
export function ProfilePageClient({
  user,
  initialContributionStats,
  initialIsOwnProfile,
}: {
  user: ProfileUser;
  initialContributionStats: ProfileContributionStats;
  initialIsOwnProfile: boolean;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const passkeyRequiredRedirect = searchParams.get("passkey") === "required";

  const unlinkAccount = trpc.users.unlinkAccount.useMutation();
  const deletePasskey = trpc.users.deletePasskey.useMutation();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();
  const { performStepUp, runWithStepUp, isSteppingUp } =
    useDestructiveSessionStepUp();

  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ProfileTabId>(() =>
    passkeyRequiredRedirect ? "security" : "contributions",
  );
  const tabChangeReadyRef = useRef(false);

  const isOwnProfile =
    sessionStatus === "loading"
      ? initialIsOwnProfile
      : !!session?.user?.id && session.user.id === user.id;

  const { data: linkedAccounts } = trpc.users.getLinkedAccounts.useQuery(
    undefined,
    { enabled: isOwnProfile },
  );

  const { data: passkeyEnrollment } =
    trpc.users.getPasskeyEnrollmentStatus.useQuery(undefined, {
      enabled: isOwnProfile,
    });

  const { data: sessionWriteAssurance } =
    trpc.users.getSessionWriteAssurance.useQuery(undefined, {
      enabled: isOwnProfile,
    });

  const { data: passkeys } = trpc.users.getPasskeys.useQuery(undefined, {
    enabled: isOwnProfile,
  });

  const tabIds = useMemo((): ProfileTabId[] => {
    if (isOwnProfile) {
      return ["contributions", "preferences", "security"];
    }
    return ["contributions"];
  }, [isOwnProfile]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      tabChangeReadyRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handlePasskeySignIn = useCallback(async () => {
    const result = await performStepUp();
    if (result === "satisfied") {
      await utils.users.getPasskeys.invalidate();
    }
  }, [performStepUp, utils.users.getPasskeys]);

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
          result.errorMessage ??
            "Passkey registration failed. Please try again.",
        );
      }

      await Promise.all([
        utils.users.getPasskeys.invalidate(),
        utils.users.getPasskeyEnrollmentStatus.invalidate(),
        utils.users.getSessionWriteAssurance.invalidate(),
      ]);
      showToast("Passkey added", "success");
    } catch (registerError) {
      console.error("Failed to register passkey:", registerError);
      if (isPasskeyClientCancelled(registerError)) {
        showToast("Passkey registration was cancelled.", "error", 0);
        return;
      }
      showToast(
        getErrorMessage(registerError, "Failed to register passkey"),
        "error",
        0,
      );
    } finally {
      setIsRegisteringPasskey(false);
    }
  }, [
    showToast,
    utils.users.getPasskeyEnrollmentStatus,
    utils.users.getPasskeys,
    utils.users.getSessionWriteAssurance,
  ]);

  const handleDeletePasskey = useCallback(
    async (passkeyId: string) => {
      await runWithStepUp(async () => {
        await deletePasskey.mutateAsync({ passkeyId });
        await Promise.all([
          utils.users.getPasskeys.invalidate(),
          utils.users.getPasskeyEnrollmentStatus.invalidate(),
          utils.users.getSessionWriteAssurance.invalidate(),
        ]);
        showToast("Passkey revoked", "success");
      });
    },
    [
      deletePasskey,
      runWithStepUp,
      showToast,
      utils.users.getPasskeyEnrollmentStatus,
      utils.users.getPasskeys,
      utils.users.getSessionWriteAssurance,
    ],
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

  const headerGithub = useMemo(():
    | ProfileGitHubPresentation
    | null
    | undefined => {
    if (isOwnProfile) {
      if (linkedAccounts === undefined) {
        return undefined;
      }
      const githubAccount = linkedAccounts.find(
        (
          account,
        ): account is Extract<
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
    return user.github ?? null;
  }, [isOwnProfile, linkedAccounts, user.github]);

  const effectiveTab = tabIds.includes(selectedTab) ? selectedTab : tabIds[0];

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <ProfileHeader
        user={user}
        github={headerGithub}
        isOwnProfile={isOwnProfile}
        initialContributionStats={initialContributionStats}
      />

      {isOwnProfile ? (
        <Tabs
          selectedKey={effectiveTab}
          onSelectionChange={(key) => {
            if (!tabChangeReadyRef.current) {
              return;
            }
            const next = String(key);
            if (
              next === "contributions" ||
              next === "preferences" ||
              next === "security"
            ) {
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
                id="preferences"
                className="flex-1 px-4 py-2 text-sm font-medium"
              >
                Preferences
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
            {effectiveTab === "contributions" ? (
              <ProfileContributionsSection
                userId={user.id}
                isOwnProfile={isOwnProfile}
                onRunWithDestructiveSessionAal={runWithStepUp}
              />
            ) : null}
          </Tabs.Panel>

          <Tabs.Panel id="preferences" className="pt-6">
            {effectiveTab === "preferences" ? (
              <ProfileAttributionPreferencesSection />
            ) : null}
          </Tabs.Panel>

          <Tabs.Panel id="security" className="pt-6">
            {effectiveTab === "security" ? (
              <ProfileSectionCard
                title="Account security"
                description="Passkeys for sign-in and contribution access. API keys for programmatic access are coming soon."
              >
                <ProfilePasskeysSection
                  passkeys={passkeys}
                  passkeyEnrollment={passkeyEnrollment}
                  passkeyRequiredRedirect={passkeyRequiredRedirect}
                  sessionWriteAssurance={sessionWriteAssurance}
                  isRegistering={isRegisteringPasskey}
                  isDeleting={deletePasskey.isPending}
                  isPasskeySigningIn={isSteppingUp}
                  onRegister={handleRegisterPasskey}
                  onDelete={handleDeletePasskey}
                  onPasskeySignIn={handlePasskeySignIn}
                />
                <ProfileGitHubSecuritySection
                  linkedAccounts={linkedAccounts}
                  isUnlinking={unlinkAccount.isPending}
                  onUnlink={handleUnlinkGitHub}
                />
                <ProfileApiKeysSection />
              </ProfileSectionCard>
            ) : null}
          </Tabs.Panel>
        </Tabs>
      ) : (
        <ProfileContributionsSection
          userId={user.id}
          isOwnProfile={isOwnProfile}
        />
      )}
    </>
  );
}
