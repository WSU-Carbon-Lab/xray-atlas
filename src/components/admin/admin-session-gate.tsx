"use client";

/**
 * Confirms a passkey on the current `/admin` URL when the session is ORCID-only.
 * Passkey-established sessions skip this gate.
 */

import { useCallback, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Button, Card } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import {
  isPasskeyClientCancelled,
  PASSKEY_STEP_UP_CANCELLED_MESSAGE,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";

/**
 * Renders `children` once the session is passkey-confirmed. Otherwise prompts
 * for passkey sign-in on this page.
 *
 * @param children - Admin console page content.
 */
export function AdminSessionGate({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id;
  const [isConfirming, setIsConfirming] = useState(false);
  const utils = trpc.useUtils();
  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();

  const enrollment = trpc.users.getPasskeyEnrollmentStatus.useQuery(undefined, {
    enabled: Boolean(userId),
    // Avoid refetching on every window focus; enrollment changes already
    // invalidate this query directly.
    staleTime: 5 * 60 * 1000,
  });
  const assurance = trpc.users.getSessionWriteAssurance.useQuery(undefined, {
    enabled: Boolean(userId),
    // Without this, the admin console's AAL2 gate can flip content mid-session
    // on an incidental window-focus refetch. A short staleTime still reflects
    // a real step-up/expiry promptly while stopping every-focus refetching.
    staleTime: 60 * 1000,
  });

  const confirmSession = useCallback(async () => {
    if (isConfirming) {
      return;
    }
    setIsConfirming(true);
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
          showToast(PASSKEY_STEP_UP_CANCELLED_MESSAGE, "error");
          return;
        }
        showToast(message, "error");
        return;
      }
      const stepUp = await confirmPasskeySessionStepUp.mutateAsync();
      await utils.users.getSessionWriteAssurance.invalidate();
      if (!stepUp.evaluation.adminSatisfied) {
        showToast(
          "Passkey confirmation did not attach to this session. Try again.",
          "error",
        );
      }
    } catch (error) {
      if (isPasskeyClientCancelled(error)) {
        showToast(PASSKEY_STEP_UP_CANCELLED_MESSAGE, "error");
        return;
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Passkey confirmation failed";
      showToast(message, "error");
    } finally {
      setIsConfirming(false);
    }
  }, [
    confirmPasskeySessionStepUp,
    isConfirming,
    utils.users.getSessionWriteAssurance,
  ]);

  if (assurance.data?.adminSatisfied) {
    return children;
  }

  const securityHref =
    userId != null
      ? `/users/${encodeURIComponent(userId)}?passkey=required`
      : "/sign-in";

  const isLoading =
    sessionStatus === "loading" ||
    !userId ||
    enrollment.isLoading ||
    assurance.isLoading;
  const enrolled = enrollment.data?.enrolled === true;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12">
      <Card className="border-border bg-surface-1 overflow-hidden border shadow-sm">
        <Card.Content className="flex flex-col gap-4 px-6 py-6">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            Confirm administrator access
          </h1>
          {isLoading ? (
            <p className="text-muted text-sm">Checking passkey session…</p>
          ) : assurance.isError ? (
            <p className="text-danger text-sm">{assurance.error.message}</p>
          ) : enrolled ? (
            <>
              <p className="text-muted text-sm leading-relaxed">
                Confirm this session with your passkey to open the admin
                console. You will stay on this page.
              </p>
              <Button
                size="sm"
                variant="primary"
                isPending={isConfirming}
                onPress={() => void confirmSession()}
              >
                Confirm passkey
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted text-sm leading-relaxed">
                Register a passkey, then return to this admin page. Browse
                remains available without a passkey.
              </p>
              <Link
                href={securityHref}
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "w-fit",
                )}
              >
                Register a passkey
              </Link>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
