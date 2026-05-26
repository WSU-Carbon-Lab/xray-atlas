"use client";

import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";

export interface UseContributionAgreementGateOptions {
  /** Invoked when the user dismisses the agreement modal without accepting. */
  onDecline?: () => void;
}

/**
 * Loads contribution-agreement status for the signed-in user, opens the modal when
 * acceptance is required, and persists acceptance via `users.acceptContributionAgreement`.
 */
export function useContributionAgreementGate(
  options: UseContributionAgreementGateOptions = {},
) {
  const { data: session, status: sessionStatus } = useSession();
  const isSignedIn = !!session?.user;
  const utils = trpc.useUtils();

  const agreementStatusQuery =
    trpc.users.getContributionAgreementStatus.useQuery(undefined, {
      enabled: isSignedIn,
    });

  const acceptMutation = trpc.users.acceptContributionAgreement.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.users.getContributionAgreementStatus.invalidate(),
        utils.users.getCurrent.invalidate(),
      ]);
    },
    onError: (error) => {
      showToast(
        error.message || "Could not save your contribution agreement.",
        "error",
      );
    },
  });

  const isCheckingAgreement =
    isSignedIn &&
    (sessionStatus === "loading" || agreementStatusQuery.isLoading);

  const needsAcceptance =
    isSignedIn && agreementStatusQuery.data?.needsAcceptance === true;

  const canContribute =
    isSignedIn && agreementStatusQuery.data?.needsAcceptance === false;

  const handleAgree = () => {
    acceptMutation.mutate();
  };

  return {
    isSignedIn,
    isCheckingAgreement,
    needsAcceptance,
    canContribute,
    showAgreementModal: needsAcceptance,
    isAccepting: acceptMutation.isPending,
    handleAgree,
    onModalClose: () => {
      options.onDecline?.();
    },
  };
}
