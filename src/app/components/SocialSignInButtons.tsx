"use client";

import { signIn } from "next-auth/react";
import { signIn as webauthnSignIn } from "next-auth/webauthn";
import { Button, Tooltip } from "@heroui/react";
import { Key } from "lucide-react";
import { ORCIDIcon, GitHubIcon } from "~/app/components/icons";

const ORCID_TOOLTIP =
  "ORCID is a free, unique, persistent identifier (PID) for individuals to use as they engage in research, scholarship, and innovation activities. It can also help you save time when you use your ORCID to sign into systems like this one. Learn more at orcid.org.";

const PASSKEY_TOOLTIP =
  "Sign in securely using a passkey. Passkeys use your device's biometric authentication (fingerprint, face recognition) or a security key for passwordless sign-in.";

interface SocialSignInButtonsProps {
  callbackUrl: string;
  onSignIn?: () => void;
}

export function SocialSignInButtons({
  callbackUrl,
  onSignIn,
}: SocialSignInButtonsProps) {
  const handleORCID = () => {
    void signIn("orcid", { callbackUrl });
    onSignIn?.();
  };

  const handleGitHub = () => {
    void signIn("github", { callbackUrl });
    onSignIn?.();
  };

  const handlePasskey = async () => {
    await webauthnSignIn("passkey", { callbackUrl });
    onSignIn?.();
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <div
            className="orcid-gradient-border w-full max-w-full rounded-2xl p-px"
            role="group"
          >
            <Button
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-surface-1 text-text-primary transition-[background-color,box-shadow,transform,filter] hover:scale-[1.01] hover:bg-surface-2 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2 data-[hovered=true]:scale-[1.01] data-[hovered=true]:brightness-105 touch-manipulation"
              onPress={handleORCID}
            >
              <ORCIDIcon className="h-5 w-5 shrink-0" authenticated />
              Sign in with ORCID
            </Button>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" className="max-w-xs">
          <p>{ORCID_TOOLTIP}</p>
        </Tooltip.Content>
      </Tooltip>
      <Button
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-default bg-surface-2 text-text-primary transition-[background-color,box-shadow,transform,filter] hover:scale-[1.01] hover:bg-surface-3 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2 data-[hovered=true]:scale-[1.01] data-[hovered=true]:brightness-105 touch-manipulation"
        variant="tertiary"
        onPress={handleGitHub}
      >
        <GitHubIcon className="h-5 w-5 shrink-0" />
        Sign in with GitHub
      </Button>
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
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-default bg-surface-2 text-text-primary transition-[background-color,box-shadow,transform,filter] hover:scale-[1.01] hover:bg-surface-3 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2 data-[hovered=true]:scale-[1.01] data-[hovered=true]:brightness-105 touch-manipulation"
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
