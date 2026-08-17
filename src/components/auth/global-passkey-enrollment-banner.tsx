"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePasskeyEnrollmentGate } from "~/hooks/usePasskeyEnrollmentGate";
import { PasskeyEnrollmentPrompt } from "~/components/auth/passkey-enrollment-prompt";

const DISMISS_KEY = "xray-atlas-passkey-banner-dismissed";

/**
 * Session-scoped, dismissible prompt shown on every page until the signed-in
 * user has at least one passkey. Re-appears each new session if still unenrolled.
 */
export function GlobalPasskeyEnrollmentBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(true);
  const {
    isSignedIn,
    isChecking,
    needsPasskeyEnrollment,
    registerPasskey,
    isRegisteringPasskey,
  } = usePasskeyEnrollmentGate();

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!isSignedIn || isChecking || !needsPasskeyEnrollment || dismissed) {
    return null;
  }

  const profileHref = session?.user?.id
    ? `/users/${encodeURIComponent(session.user.id)}`
    : "/sign-in";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4">
      <PasskeyEnrollmentPrompt
        profileHref={profileHref}
        title="Set up a passkey"
        description="Sign in faster next time, and unlock deleting or transferring your own data. You can also set this up later from your profile."
        onRegister={registerPasskey}
        isRegistering={isRegisteringPasskey}
      />
      <button
        type="button"
        className="text-text-secondary mt-2 text-xs underline"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
      >
        Not now
      </button>
    </div>
  );
}
