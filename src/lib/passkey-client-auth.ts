import { signIn as webauthnSignIn } from "next-auth/webauthn";
import { mapWebAuthnSignInError } from "~/lib/auth-sign-in-errors";

export interface RunPasskeyClientAuthOptions {
  callbackUrl?: string;
  action?: "sign-in" | "register";
  errorFallback: string;
  incompleteFallback?: string;
}

export interface RunPasskeyClientAuthResult {
  ok: boolean;
  errorMessage?: string;
  redirectUrl?: string;
}

/**
 * Runs Auth.js WebAuthn `signIn` for passkey authentication or registration with shared
 * error mapping and redirect handling for client surfaces.
 */
export async function runPasskeyClientAuth(
  options: RunPasskeyClientAuthOptions,
): Promise<RunPasskeyClientAuthResult> {
  const incompleteFallback =
    options.incompleteFallback ?? options.errorFallback;

  const result = await webauthnSignIn("passkey", {
    callbackUrl: options.callbackUrl,
    redirect: false,
    ...(options.action === "register" ? { action: "register" } : {}),
  });

  if (result?.error) {
    return {
      ok: false,
      errorMessage: mapWebAuthnSignInError(result.error, options.errorFallback),
    };
  }

  if (result?.url) {
    return { ok: true, redirectUrl: result.url };
  }

  if (result?.ok) {
    return {
      ok: true,
      redirectUrl: options.callbackUrl,
    };
  }

  return { ok: false, errorMessage: incompleteFallback };
}

/**
 * Assigns `window.location` when `runPasskeyClientAuth` returns a redirect target.
 */
export function applyPasskeyClientRedirect(
  result: RunPasskeyClientAuthResult,
): void {
  if (result.redirectUrl) {
    window.location.assign(result.redirectUrl);
  }
}
