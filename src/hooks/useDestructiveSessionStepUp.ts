"use client";

import { useCallback, useRef, useState } from "react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import {
  isPasskeyClientCancelled,
  isSessionAalRequiredError,
  PASSKEY_ENROLL_BEFORE_DESTRUCTIVE_MESSAGE,
  PASSKEY_STEP_UP_CANCELLED_MESSAGE,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message
    ? error.message
    : fallbackMessage;
}

export interface UseDestructiveSessionStepUpResult {
  performStepUp: (options?: {
    quietSuccess?: boolean;
  }) => Promise<"satisfied" | "cancelled" | "failed">;
  runWithStepUp: (action: () => Promise<void>) => Promise<void>;
  isSteppingUp: boolean;
}

/**
 * Shared destructive-write step-up: proactively checks session AAL2 assurance,
 * triggers a passkey re-authentication ceremony if unsatisfied, retries the
 * wrapped action once, and surfaces exactly one toast on final failure.
 *
 * Extracted from `performPasskeySessionStepUp` + `runWithDestructiveSessionAal`
 * in `profile-page-client.tsx`, generalized for post-login-only consumers (no
 * tab-switching, no unauthenticated redirect branch — both call sites are
 * always `authenticated`).
 */
export function useDestructiveSessionStepUp(): UseDestructiveSessionStepUpResult {
  const utils = trpc.useUtils();
  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();
  const [isSteppingUp, setIsSteppingUp] = useState(false);
  const stepUpInFlightRef = useRef(false);

  const performStepUp = useCallback(
    async (options?: {
      quietSuccess?: boolean;
    }): Promise<"satisfied" | "cancelled" | "failed"> => {
      if (stepUpInFlightRef.current) {
        return "failed";
      }
      stepUpInFlightRef.current = true;
      setIsSteppingUp(true);
      try {
        const result = await runPasskeyClientAuth({
          action: "sign-in",
          callbackUrl: window.location.href,
          errorFallback: "Passkey confirmation failed. Please try again.",
          incompleteFallback: "Passkey confirmation did not complete",
        });

        if (!result.ok) {
          const message =
            result.errorMessage ??
            "Passkey confirmation failed. Please try again.";
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

        const stepUp = await confirmPasskeySessionStepUp.mutateAsync();
        await utils.users.getSessionWriteAssurance.invalidate();
        if (!options?.quietSuccess) {
          showToast("Passkey confirmed for this session", "success");
        }
        return stepUp.evaluation.satisfied ? "satisfied" : "failed";
      } catch (error) {
        if (isPasskeyClientCancelled(error)) {
          showToast(PASSKEY_STEP_UP_CANCELLED_MESSAGE, "error", 0);
          return "cancelled";
        }
        showToast(
          getErrorMessage(error, "Passkey confirmation failed"),
          "error",
          0,
        );
        return "failed";
      } finally {
        stepUpInFlightRef.current = false;
        setIsSteppingUp(false);
      }
    },
    [confirmPasskeySessionStepUp, utils.users.getSessionWriteAssurance],
  );

  const runWithStepUp = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      const assurance = await utils.users.getSessionWriteAssurance.fetch();

      if (!assurance.enrolled) {
        showToast(PASSKEY_ENROLL_BEFORE_DESTRUCTIVE_MESSAGE, "error", 0);
        return;
      }

      if (!assurance.satisfied) {
        const stepResult = await performStepUp({ quietSuccess: true });
        if (stepResult !== "satisfied") {
          return;
        }
      }

      try {
        await action();
      } catch (error) {
        if (isSessionAalRequiredError(error)) {
          const stepResult = await performStepUp({ quietSuccess: true });
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
        showToast(getErrorMessage(error, "Action failed"), "error", 0);
      }
    },
    [performStepUp, utils.users.getSessionWriteAssurance],
  );

  return { performStepUp, runWithStepUp, isSteppingUp };
}
