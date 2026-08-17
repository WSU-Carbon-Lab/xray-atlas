"use client";

import type { ReactNode } from "react";
import { PasskeyEnrollmentPrompt } from "~/components/auth/passkey-enrollment-prompt";

export type ContributeAccessGateProps = {
  isChecking: boolean;
  needsPasskeyEnrollment: boolean;
  canContribute: boolean;
  requiresAal3Hardware: boolean;
  profileHref: string;
  onRegisterPasskey: () => void | Promise<void>;
  isRegisteringPasskey: boolean;
  children: ReactNode;
};

/**
 * Gates contribute form UI behind agreement readiness and in-browser passkey enrollment.
 */
export function ContributeAccessGate({
  isChecking,
  needsPasskeyEnrollment,
  canContribute,
  requiresAal3Hardware,
  profileHref,
  onRegisterPasskey,
  isRegisteringPasskey,
  children,
}: ContributeAccessGateProps) {
  if (isChecking) {
    return (
      <p className="text-muted text-sm">Checking account requirements...</p>
    );
  }

  if (needsPasskeyEnrollment) {
    return (
      <PasskeyEnrollmentPrompt
        profileHref={profileHref}
        requiresAal3Hardware={requiresAal3Hardware}
        onRegister={onRegisterPasskey}
        isRegistering={isRegisteringPasskey}
      />
    );
  }

  if (!canContribute) {
    return null;
  }

  return children;
}
