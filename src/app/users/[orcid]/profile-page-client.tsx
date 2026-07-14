"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tabs } from "@heroui/react";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "~/trpc/client";
import { ToastContainer, useToast } from "@/components/ui/toast";
import {
  applyPasskeyClientRedirect,
  getSessionAalRequiredAppCode,
  isPasskeyClientCancelled,
  PASSKEY_ENROLL_BEFORE_DESTRUCTIVE_MESSAGE,
  PASSKEY_STEP_UP_CANCELLED_MESSAGE,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";
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
  ProfileSecuritySectionSkeleton,
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
  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();

  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ProfileTabId>("contributions");
  const stepUpInFlightRef = useRef(false);

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

  const [isPasskeySigningIn, setIsPasskeySigningIn] = useState(false);

  const tabIds = useMemo((): ProfileTabId[] => {
    if (isOwnProfile) {
      return ["contributions", "preferences", "security"];
    }
    return ["contributions"];
  }, [isOwnProfile]);

  useEffect(() => {
    if (passkeyRequiredRedirect && isOwnProfile) {
      setSelectedTab("security");
    }
  }, [isOwnProfile, passkeyRequiredRedirect]);

  const confirmSessionStepUpQuiet = useCallback(async (): Promise<{
    satisfied: boolean;
    adminSatisfied: boolean;
    adminRequiredAal: string;
  }> => {
    const stepUp = await confirmPasskeySessionStepUp.mutateAsync();
    await Promise.all([
      utils.users.getSessionWriteAssurance.invalidate(),
      utils.users.getPasskeys.invalidate(),
    ]);
    return {
      satisfied: stepUp.evaluation.satisfied,
      adminSatisfied: stepUp.evaluation.adminSatisfied,
      adminRequiredAal: stepUp.evaluation.adminRequiredAal,
    };
  }, [confirmPasskeySessionStepUp, utils.users.getPasskeys, utils.users.getSessionWriteAssurance]);

  const performPasskeySessionStepUp = useCallback(
    async (options?: {
      quietSuccess?: boolean;
    }): Promise<"satisfied" | "cancelled" | "failed"> => {
      if (stepUpInFlightRef.current) {
        return "failed";
      }
      stepUpInFlightRef.current = true;
      setIsPasskeySigningIn(true);
      try {
        const result = await runPasskeyClientAuth({
          action: "sign-in",
          callbackUrl: window.location.href,
          errorFallback: "Passkey confirmation failed. Please try again.",
          incompleteFallback: "Passkey confirmation did not complete",
        });

        if (!result.ok) {
          const message =
            result.errorMessage ?? "Passkey confirmation failed. Please try again.";
          if (
            isPasskeyClientCancelled(new Error(message)) ||
            message.toLowerCase().includes("interrupted") ||
            message.toLowerCase().includes("denied")
          ) {
            showToast(PASSKEY_STEP_UP_CANCELLED_MESSAGE, "error", 0);
            return "cancelled";
          }
          showToast(message, "error", 0);
          return "failed";
        }

        if (sessionStatus === "authenticated") {
          const evaluation = await confirmSessionStepUpQuiet();
          if (!options?.quietSuccess) {
            if (
              evaluation.adminRequiredAal === "aal3" &&
              !evaluation.adminSatisfied
            ) {
              showToast(
                "Passkey confirmed for deleting and transferring data. Administrator and Labs tools still need a hardware security key.",
                "success",
              );
            } else {
              showToast("Passkey confirmed for this session", "success");
            }
          }
          return evaluation.satisfied ? "satisfied" : "failed";
        }

        if (result.redirectUrl) {
          applyPasskeyClientRedirect(result);
          return "satisfied";
        }

        await utils.users.getSessionWriteAssurance.invalidate();
        if (!options?.quietSuccess) {
          showToast("Signed in with passkey", "success");
        }
        return "satisfied";
      } catch (signInError) {
        console.error("Failed passkey sign-in:", signInError);
        if (isPasskeyClientCancelled(signInError)) {
          showToast(PASSKEY_STEP_UP_CANCELLED_MESSAGE, "error", 0);
          return "cancelled";
        }
        showToast(
          getErrorMessage(signInError, "Passkey confirmation failed"),
          "error",
          0,
        );
        return "failed";
      } finally {
        stepUpInFlightRef.current = false;
        setIsPasskeySigningIn(false);
      }
    },
    [
      confirmSessionStepUpQuiet,
      sessionStatus,
      showToast,
      utils.users.getSessionWriteAssurance,
    ],
  );

  const handlePasskeySignIn = useCallback(async () => {
    await performPasskeySessionStepUp();
  }, [performPasskeySessionStepUp]);

  const runWithDestructiveSessionAal = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      const assurance = await utils.users.getSessionWriteAssurance.fetch();

      if (!assurance.enrolled) {
        showToast(PASSKEY_ENROLL_BEFORE_DESTRUCTIVE_MESSAGE, "error", 0);
        setSelectedTab("security");
        return;
      }

      if (!assurance.satisfied) {
        const stepResult = await performPasskeySessionStepUp({
          quietSuccess: true,
        });
        if (stepResult !== "satisfied") {
          return;
        }
      }

      try {
        await action();
      } catch (error) {
        if (getSessionAalRequiredAppCode(error)) {
          const stepResult = await performPasskeySessionStepUp({
            quietSuccess: true,
          });
          if (stepResult !== "satisfied") {
            return;
          }
          try {
            await action();
          } catch (retryError) {
            showToast(
              getErrorMessage(
                retryError,
                "Action failed after passkey confirmation",
              ),
              "error",
              0,
            );
          }
          return;
        }
        showToast(
          getErrorMessage(error, "Action failed"),
          "error",
          0,
        );
      }
    },
    [performPasskeySessionStepUp, showToast, utils.users.getSessionWriteAssurance],
  );

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
      await runWithDestructiveSessionAal(async () => {
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
      runWithDestructiveSessionAal,
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
            <ProfileContributionsSection
              userId={user.id}
              isOwnProfile={isOwnProfile}
              onRunWithDestructiveSessionAal={runWithDestructiveSessionAal}
            />
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
                  isPasskeySigningIn={isPasskeySigningIn}
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
            ) : (
              <ProfileSecuritySectionSkeleton />
            )}
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
