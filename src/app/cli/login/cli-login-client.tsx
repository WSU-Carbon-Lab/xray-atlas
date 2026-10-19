"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { runPasskeyClientAuth } from "~/lib/passkey-client-auth";
import { trpc } from "~/trpc/client";

interface CliLoginClientProps {
  orcid: string;
  name: string | null;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

/**
 * Confirms a passkey on the current CLI login URL, then asks the server for
 * the loopback redirect that carries the one-time code.
 *
 * @param props.orcid - Signed-in ORCID iD.
 * @param props.name - Display name, when the account has one.
 * @param props.redirectUri - Validated loopback callback from `xatlas login`.
 * @param props.state - OAuth state the CLI expects unchanged.
 * @param props.codeChallenge - S256 PKCE challenge from the CLI.
 */
export function CliLoginClient({
  orcid,
  name,
  redirectUri,
  state,
  codeChallenge,
}: CliLoginClientProps) {
  const assurance = trpc.users.getSessionWriteAssurance.useQuery();
  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();
  const utils = trpc.useUtils();
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const [phase, setPhase] = useState<"gate" | "minting">("gate");
  const [mintFailed, setMintFailed] = useState(false);
  const [failureKind, setFailureKind] = useState<"passkey" | "retry" | null>(
    null,
  );
  const mintStarted = useRef(false);

  const displayName = name && name.trim().length > 0 ? name.trim() : orcid;

  const mint = useCallback(async () => {
    setPhase("minting");
    setErrorMessage(null);
    const response = await fetch("/api/cli/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ redirectUri, state, codeChallenge }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRedirectPayload(payload)) {
      mintStarted.current = false;
      setMintFailed(true);
      setFailureKind(response.status === 403 ? "passkey" : "retry");
      setPhase("gate");
      setErrorMessage(readError(payload, "Could not create a CLI credential."));
      return;
    }
    window.location.assign(payload.redirectTo);
  }, [codeChallenge, redirectUri, state]);

  useEffect(() => {
    if (!assurance.data?.satisfied || mintStarted.current || mintFailed) {
      return;
    }
    mintStarted.current = true;
    void mint();
  }, [assurance.data?.satisfied, mint, mintFailed]);

  const confirmPasskey = useCallback(async () => {
    if (isConfirming) {
      return;
    }
    setIsConfirming(true);
    setErrorMessage(null);
    try {
      const result = await runPasskeyClientAuth({
        action: "sign-in",
        callbackUrl: window.location.href,
        errorFallback: "Passkey confirmation failed. Please try again.",
        incompleteFallback: "Passkey confirmation did not complete",
      });
      if (!result.ok) {
        setErrorMessage(
          result.errorMessage ??
            "Passkey confirmation failed. Please try again.",
        );
        return;
      }
      const stepUp = await confirmPasskeySessionStepUp.mutateAsync();
      await utils.users.getSessionWriteAssurance.invalidate();
      if (!stepUp.evaluation.satisfied) {
        setErrorMessage(
          "Passkey confirmation did not attach to this session. Try again.",
        );
        return;
      }
      setMintFailed(false);
      setFailureKind(null);
      mintStarted.current = false;
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Passkey confirmation failed. Please try again.",
      );
    } finally {
      setIsConfirming(false);
    }
  }, [
    confirmPasskeySessionStepUp,
    isConfirming,
    utils.users.getSessionWriteAssurance,
  ]);

  const enrolled = assurance.data?.enrolled === true;
  const satisfied = assurance.data?.satisfied === true;

  return (
    <main className="bg-surface-1 flex min-h-screen items-center justify-center p-4">
      <div className="border-border-default bg-surface-1 w-full max-w-md rounded-2xl border p-8 shadow-lg">
        <h1 className="text-text-primary text-2xl font-bold">
          Sign in to xatlas
        </h1>
        <p className="text-text-secondary mt-3 text-sm">
          Signed in as <span className="text-text-primary">{displayName}</span>.
          A passkey confirmation creates a read credential and returns it to the
          terminal. The token is not shown here.
        </p>
        {errorMessage ? (
          <p className="text-error mt-4 text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6">
          {assurance.isPending ||
          phase === "minting" ||
          (satisfied && !mintFailed) ? (
            <p className="text-text-secondary text-sm">
              {phase === "minting" || (satisfied && !mintFailed)
                ? "Returning the credential to xatlas..."
                : "Checking passkey status..."}
            </p>
          ) : assurance.isError ? (
            <p className="text-error text-sm" role="alert">
              Could not read passkey status.
            </p>
          ) : !enrolled ? (
            <div className="space-y-3">
              <p className="text-text-secondary text-sm">
                Register a passkey on your profile, then run{" "}
                <span className="text-text-primary font-mono">
                  xatlas login
                </span>{" "}
                again.
              </p>
              <Button
                variant="primary"
                onPress={() => {
                  router.push(`/users/${orcid}?passkey=required`);
                }}
              >
                Open Security
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              isPending={isConfirming}
              onPress={() => {
                if (failureKind === "retry") {
                  setMintFailed(false);
                  setFailureKind(null);
                  mintStarted.current = true;
                  void mint();
                  return;
                }
                void confirmPasskey();
              }}
            >
              {failureKind === "retry" ? "Try again" : "Confirm with passkey"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function readError(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.length > 0
  ) {
    return payload.error;
  }
  return fallback;
}

function isRedirectPayload(
  payload: unknown,
): payload is { redirectTo: string } {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("redirectTo" in payload)
  ) {
    return false;
  }
  const redirectTo = payload.redirectTo;
  if (typeof redirectTo !== "string") {
    return false;
  }
  try {
    const url = new URL(redirectTo);
    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" ||
        url.hostname === "localhost" ||
        url.hostname === "::1") &&
      url.pathname === "/callback"
    );
  } catch {
    return false;
  }
}
