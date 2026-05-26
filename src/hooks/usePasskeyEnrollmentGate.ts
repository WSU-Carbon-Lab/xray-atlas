"use client";

import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { mapWebAuthnSignInError } from "~/lib/auth-sign-in-errors";

export interface UsePasskeyEnrollmentGateOptions {
  onDecline?: () => void;
}

/**
 * Loads passkey enrollment status for the signed-in user and exposes whether
 * contribute or admin write surfaces should be blocked until a passkey exists.
 */
export function usePasskeyEnrollmentGate(
  options: UsePasskeyEnrollmentGateOptions = {},
) {
  const { data: session, status: sessionStatus } = useSession();
  const isSignedIn = !!session?.user;

  const enrollmentQuery = trpc.users.getPasskeyEnrollmentStatus.useQuery(
    undefined,
    { enabled: isSignedIn },
  );

  const isChecking =
    isSignedIn &&
    (sessionStatus === "loading" || enrollmentQuery.isLoading);

  const needsPasskeyEnrollment =
    isSignedIn && enrollmentQuery.data?.enrolled === false;

  const requiresAal3Hardware =
    enrollmentQuery.data?.requiresAal3Hardware === true;

  const needsAal3Hardware =
    requiresAal3Hardware &&
    enrollmentQuery.data?.hasAal3EligiblePasskey === false;

  const canAccessContributeWrites =
    isSignedIn && enrollmentQuery.data?.enrolled === true;

  const onEnrollmentError = (error: unknown) => {
    const message =
      error instanceof Error
        ? mapWebAuthnSignInError(
            error.message,
            "Passkey registration did not complete.",
          )
        : "Passkey registration did not complete.";
    showToast(message, "error");
    options.onDecline?.();
  };

  return {
    isSignedIn,
    isChecking,
    needsPasskeyEnrollment,
    requiresAal3Hardware,
    needsAal3Hardware,
    canAccessContributeWrites,
    enrollment: enrollmentQuery.data,
    onEnrollmentError,
  };
}
