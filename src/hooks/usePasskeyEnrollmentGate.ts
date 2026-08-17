"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { mapWebAuthnSignInError } from "~/lib/auth-sign-in-errors";
import {
  isPasskeyClientCancelled,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";

export interface UsePasskeyEnrollmentGateOptions {
  onDecline?: () => void;
}

/**
 * Loads passkey enrollment status for the signed-in user and exposes whether
 * contribute or admin write surfaces should be blocked until a passkey exists.
 * `registerPasskey` runs the browser WebAuthn registration ceremony in place.
 */
export function usePasskeyEnrollmentGate(
  options: UsePasskeyEnrollmentGateOptions = {},
) {
  const { data: session, status: sessionStatus } = useSession();
  const utils = trpc.useUtils();
  const isSignedIn = !!session?.user;
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const onDecline = options.onDecline;

  const enrollmentQuery = trpc.users.getPasskeyEnrollmentStatus.useQuery(
    undefined,
    { enabled: isSignedIn },
  );

  const isChecking =
    isSignedIn && (sessionStatus === "loading" || enrollmentQuery.isLoading);

  const needsPasskeyEnrollment =
    isSignedIn && enrollmentQuery.data?.enrolled === false;

  const requiresAal3Hardware =
    enrollmentQuery.data?.requiresAal3Hardware === true;

  const needsAal3Hardware =
    requiresAal3Hardware &&
    enrollmentQuery.data?.hasAal3EligiblePasskey === false;

  const canAccessContributeWrites =
    isSignedIn && enrollmentQuery.data?.enrolled === true;

  const onEnrollmentError = useCallback(
    (error: unknown) => {
      const message =
        error instanceof Error
          ? mapWebAuthnSignInError(
              error.message,
              "Passkey registration did not complete.",
            )
          : "Passkey registration did not complete.";
      showToast(message, "error");
      onDecline?.();
    },
    [onDecline],
  );

  const registerPasskey = useCallback(async () => {
    if (isRegisteringPasskey) {
      return;
    }
    setIsRegisteringPasskey(true);
    try {
      const result = await runPasskeyClientAuth({
        action: "register",
        errorFallback: "Passkey registration failed. Please try again.",
        incompleteFallback: "Passkey registration did not complete",
      });

      if (!result.ok) {
        const message =
          result.errorMessage ?? "Passkey registration failed. Please try again.";
        if (
          isPasskeyClientCancelled(new Error(message)) ||
          message.toLowerCase().includes("interrupted") ||
          message.toLowerCase().includes("denied")
        ) {
          showToast("Passkey registration was cancelled.", "error");
          return;
        }
        showToast(message, "error");
        onDecline?.();
        return;
      }

      await Promise.all([
        utils.users.getPasskeyEnrollmentStatus.invalidate(),
        utils.users.getSessionWriteAssurance.invalidate(),
        utils.users.getPasskeys.invalidate(),
      ]);
      showToast("Passkey registered", "success");
    } catch (registerError) {
      if (isPasskeyClientCancelled(registerError)) {
        showToast("Passkey registration was cancelled.", "error");
        return;
      }
      onEnrollmentError(registerError);
    } finally {
      setIsRegisteringPasskey(false);
    }
  }, [
    isRegisteringPasskey,
    onDecline,
    onEnrollmentError,
    utils.users.getPasskeyEnrollmentStatus,
    utils.users.getPasskeys,
    utils.users.getSessionWriteAssurance,
  ]);

  return {
    isSignedIn,
    isChecking,
    needsPasskeyEnrollment,
    requiresAal3Hardware,
    needsAal3Hardware,
    canAccessContributeWrites,
    enrollment: enrollmentQuery.data,
    onEnrollmentError,
    registerPasskey,
    isRegisteringPasskey,
  };
}
