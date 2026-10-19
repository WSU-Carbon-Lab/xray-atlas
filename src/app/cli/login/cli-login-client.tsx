"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Input, Label, TextField } from "@heroui/react";
import { runPasskeyClientAuth } from "~/lib/passkey-client-auth";
import { trpc } from "~/trpc/client";

interface CliLoginClientProps {
  orcid: string;
  name: string | null;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  requestsWrite: boolean;
  defaultTokenName: string;
}

const TOKEN_NAME_MAX_LENGTH = 64;

/**
 * Consent step for `xatlas login`: the user approves read only or read plus
 * write, edits the token name, confirms a passkey when needed, and then the
 * server returns the loopback redirect that carries the one-time code.
 *
 * @param props.orcid - Signed-in ORCID iD.
 * @param props.name - Display name, when the account has one.
 * @param props.redirectUri - Validated loopback callback from `xatlas login`.
 * @param props.state - OAuth state the CLI expects unchanged.
 * @param props.codeChallenge - S256 PKCE challenge from the CLI.
 * @param props.requestsWrite - Whether the CLI asked for the write scope; preselects the write option.
 * @param props.defaultTokenName - Token name sent by the CLI, editable by the user.
 */
export function CliLoginClient({
  orcid,
  name,
  redirectUri,
  state,
  codeChallenge,
  requestsWrite,
  defaultTokenName,
}: CliLoginClientProps) {
  const assurance = trpc.users.getSessionWriteAssurance.useQuery();
  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();
  const utils = trpc.useUtils();
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const [phase, setPhase] = useState<"consent" | "minting">("consent");
  const [allowWrite, setAllowWrite] = useState(requestsWrite);
  const [tokenName, setTokenName] = useState(defaultTokenName);

  const displayName = name && name.trim().length > 0 ? name.trim() : orcid;

  const trimmedName = tokenName.trim();
  const nameValid =
    trimmedName.length > 0 && trimmedName.length <= TOKEN_NAME_MAX_LENGTH;

  const mint = useCallback(async () => {
    setPhase("minting");
    setErrorMessage(null);
    const response = await fetch("/api/cli/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        redirectUri,
        state,
        codeChallenge,
        scopes: allowWrite ? ["read", "write"] : ["read"],
        tokenName: trimmedName,
      }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRedirectPayload(payload)) {
      setPhase("consent");
      setErrorMessage(readError(payload, "Could not create a CLI credential."));
      return;
    }
    window.location.assign(payload.redirectTo);
  }, [allowWrite, codeChallenge, redirectUri, state, trimmedName]);

  const approve = useCallback(async () => {
    if (isConfirming || !nameValid) {
      return;
    }
    if (assurance.data?.satisfied === true) {
      await mint();
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
      await mint();
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
    assurance.data?.satisfied,
    confirmPasskeySessionStepUp,
    isConfirming,
    mint,
    nameValid,
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
          Choose what this credential may do. It is returned to the terminal and
          is not shown here. It expires after 30 days and you can revoke it from
          the Security tab of your profile.
        </p>
        {errorMessage ? (
          <p className="text-error mt-4 text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 space-y-4">
          {assurance.isPending ? (
            <p className="text-text-secondary text-sm">
              Checking passkey status...
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
            <>
              <TextField
                value={tokenName}
                onChange={setTokenName}
                isDisabled={phase === "minting"}
                isInvalid={!nameValid}
                maxLength={TOKEN_NAME_MAX_LENGTH}
              >
                <Label>Token name</Label>
                <Input variant="secondary" placeholder="my-laptop" />
              </TextField>
              <div className="space-y-2">
                <p className="text-text-primary text-sm font-medium">Access</p>
                <Checkbox isSelected isDisabled>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>
                      Read: list and download public catalog data and list your
                      own tokens
                    </Label>
                  </Checkbox.Content>
                </Checkbox>
                <Checkbox
                  isSelected={allowWrite}
                  onChange={setAllowWrite}
                  isDisabled={phase === "minting"}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>
                      Write: upload datasets and edit your own. Deleting data
                      still requires the website.
                    </Label>
                  </Checkbox.Content>
                </Checkbox>
              </div>
              <Button
                variant="primary"
                isPending={isConfirming || phase === "minting"}
                isDisabled={!nameValid}
                onPress={() => {
                  void approve();
                }}
              >
                {satisfied ? "Approve" : "Approve with passkey"}
              </Button>
            </>
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
