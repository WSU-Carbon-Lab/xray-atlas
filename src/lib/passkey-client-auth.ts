import { signIn as webauthnSignIn } from "next-auth/webauthn";
import { TRPCClientError } from "@trpc/client";
import { mapWebAuthnSignInError } from "~/lib/auth-sign-in-errors";
import type { SessionWriteAssuranceAppCode } from "~/server/auth/mfa-access";

export type { SessionWriteAssuranceAppCode };

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

function readSessionAalAppCode(data: unknown): SessionWriteAssuranceAppCode | null {
  if (typeof data !== "object" || data === null || !("appCode" in data)) {
    return null;
  }
  const code = (data as { appCode: unknown }).appCode;
  if (code === "SESSION_AAL_REQUIRED" || code === "SESSION_AAL3_REQUIRED") {
    return code;
  }
  return null;
}

/**
 * Returns the session write-assurance app code when `error` is a FORBIDDEN from a
 * destructive or admin write gate that requires passkey session step-up.
 */
export function getSessionAalRequiredAppCode(
  error: unknown,
): SessionWriteAssuranceAppCode | null {
  if (!(error instanceof TRPCClientError)) {
    return null;
  }
  const data = error.data as { code?: string } | undefined;
  if (data?.code !== "FORBIDDEN") {
    return null;
  }
  return readSessionAalAppCode(data);
}

/**
 * Returns whether `error` is a write-assurance FORBIDDEN that requires passkey session step-up.
 */
export function isSessionAalRequiredError(error: unknown): boolean {
  return getSessionAalRequiredAppCode(error) !== null;
}
