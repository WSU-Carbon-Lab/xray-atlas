"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { signIn as webauthnSignIn } from "next-auth/webauthn";
import { Button, Tooltip } from "@heroui/react";
import { Key } from "lucide-react";
import { ORCIDIcon, GitHubIcon } from "~/components/icons";
import { mapWebAuthnSignInError } from "~/lib/auth-sign-in-errors";

const ORCID_TOOLTIP =
  "ORCID is a free, unique, persistent identifier (PID) for individuals to use as they engage in research, scholarship, and innovation activities. It can also help you save time when you use your ORCID to sign into systems like this one. Learn more at orcid.org.";

const GITHUB_TOOLTIP =
  "GitHub sign-in works for accounts that already linked GitHub after signing in with ORCID first.";

const PASSKEY_TOOLTIP =
  "Sign in securely using a passkey. Passkeys use your device's biometric authentication (fingerprint, face recognition) or a security key for passwordless sign-in.";

const orcidSignInButtonClassName =
  "orcid-sign-in-button flex w-full max-w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl font-semibold text-text-primary transition-[transform,filter] hover:scale-[1.01] data-[hovered=true]:scale-[1.01] touch-manipulation";

const secondaryButtonClassName =
  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-default bg-surface-2 text-text-primary transition-[background-color,box-shadow,transform,filter] hover:scale-[1.01] hover:bg-surface-3 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2 data-[hovered=true]:scale-[1.01] data-[hovered=true]:brightness-105 touch-manipulation";

interface SocialSignInButtonsProps {
  callbackUrl: string;
  onSignIn?: () => void;
  onPasskeyError?: (message: string) => void;
}

export function SocialSignInButtons({
  callbackUrl,
  onSignIn,
  onPasskeyError,
}: SocialSignInButtonsProps) {
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const handleORCID = async () => {
    onSignIn?.();
    await signIn("orcid", { callbackUrl });
  };

  const handleGitHub = async () => {
    onSignIn?.();
    await signIn("github", { callbackUrl });
  };

  const reportPasskeyError = (message: string) => {
    if (onPasskeyError) {
      onPasskeyError(message);
    } else {
      setPasskeyError(message);
    }
  };

  const handlePasskey = async () => {
    setPasskeyError(null);
    onPasskeyError?.("");
    const result = await webauthnSignIn("passkey", {
      callbackUrl,
      redirect: false,
    });
    if (result?.error) {
      reportPasskeyError(
        mapWebAuthnSignInError(
          result.error,
          "Passkey sign-in failed. Try again or sign in with ORCID.",
        ),
      );
      return;
    }
    if (result?.url) {
      window.location.assign(result.url);
      return;
    }
    if (result?.ok) {
      window.location.assign(callbackUrl);
      return;
    }
    reportPasskeyError("Passkey sign-in did not complete. Try again.");
  };

  const visiblePasskeyError = onPasskeyError ? null : passkeyError;

  return (
    <div className="flex w-full flex-col gap-3">
      {visiblePasskeyError ? (
        <p className="text-error text-sm" role="alert">
          {visiblePasskeyError}
        </p>
      ) : null}
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button
            className={orcidSignInButtonClassName}
            variant="tertiary"
            onPress={handleORCID}
          >
            <ORCIDIcon className="h-5 w-5 shrink-0" authenticated />
            Sign in or Sign up with ORCID
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" className="max-w-xs">
          <p>{ORCID_TOOLTIP}</p>
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button
            className={secondaryButtonClassName}
            variant="tertiary"
            onPress={handleGitHub}
          >
            <GitHubIcon className="h-5 w-5 shrink-0" />
            Sign in with GitHub
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" className="max-w-xs">
          <p>{GITHUB_TOOLTIP}</p>
        </Tooltip.Content>
      </Tooltip>
      <div className="relative mt-2 flex w-full items-center">
        <div className="flex-1 border-t border-border-default" />
        <span className="px-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          OR CONTINUE WITH
        </span>
        <div className="flex-1 border-t border-border-default" />
      </div>
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button
            className={secondaryButtonClassName}
            variant="tertiary"
            onPress={handlePasskey}
          >
            <Key className="h-5 w-5 shrink-0 text-text-primary" />
            Sign in with Passkey
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" className="max-w-xs">
          <p>{PASSKEY_TOOLTIP}</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}
