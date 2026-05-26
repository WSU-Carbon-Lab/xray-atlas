const WEB_AUTHN_SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Passkey sign-in or registration could not be completed. If you use a security key, try again; otherwise sign in with ORCID and register a passkey from your profile.",
  AccessDenied:
    "Passkey access was denied. Sign in with ORCID first, then register a passkey from your profile.",
  Verification:
    "Passkey verification failed. Try again or use a different passkey.",
  OAuthSignin: "Passkey sign-in could not be started. Try again.",
  OAuthCallback: "Passkey sign-in did not complete. Try again.",
  OAuthCreateAccount: "Could not create an account with this passkey.",
  EmailCreateAccount: "Could not create an account with this passkey.",
  CallbackRouteError: "Passkey sign-in was interrupted. Try again.",
  CredentialsSignin: "Passkey sign-in failed. Check your passkey and try again.",
  SessionRequired: "Sign in with ORCID or a passkey to continue.",
};

const KNOWN_PASSKEY_ADAPTER_MESSAGES: Record<string, string> = {
  "Privileged roles require a hardware security key with direct attestation. Use a cross-platform FIDO2 key, then try again.":
    "Platform passkeys (Touch ID, Windows Hello, 1Password) are saved for sign-in and contribution. Administrator and Labs tools still need a hardware security key (cross-platform FIDO2, e.g. YubiKey). Add one with Create Passkey and choose your security key.",
};

/**
 * Maps Auth.js WebAuthn `signIn` error codes (and propagated adapter text) to user-facing copy.
 */
export function mapWebAuthnSignInError(
  errorCode: string | null | undefined,
  fallback = "Passkey operation failed. Please try again.",
): string {
  if (!errorCode) {
    return fallback;
  }
  const trimmed = errorCode.trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  const knownAdapter = KNOWN_PASSKEY_ADAPTER_MESSAGES[trimmed];
  if (knownAdapter) {
    return knownAdapter;
  }
  const mapped = WEB_AUTHN_SIGN_IN_ERROR_MESSAGES[trimmed];
  if (mapped) {
    return mapped;
  }
  if (trimmed.includes(" ") && trimmed.length > 24) {
    return trimmed;
  }
  return fallback;
}

/**
 * Maps OAuth redirect `error` query values on the sign-in page to user-facing copy.
 */
export function mapSignInPageError(
  errorCode: string | null | undefined,
): string | null {
  if (!errorCode) {
    return null;
  }
  const signInPageMessages: Record<string, string> = {
    GitHubRequiresOrcid:
      "Sign in with ORCID first to create your account, then link GitHub from your profile.",
    InvalidOrcid:
      "ORCID sign-in failed. Check your ORCID credentials and try again.",
  };
  if (signInPageMessages[errorCode]) {
    return signInPageMessages[errorCode];
  }
  const webauthnMessage = WEB_AUTHN_SIGN_IN_ERROR_MESSAGES[errorCode];
  if (webauthnMessage) {
    return webauthnMessage;
  }
  const adapterMessage = KNOWN_PASSKEY_ADAPTER_MESSAGES[errorCode];
  if (adapterMessage) {
    return adapterMessage;
  }
  return null;
}
