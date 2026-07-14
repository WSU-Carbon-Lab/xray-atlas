const SIGN_IN_CONFIGURATION_MESSAGE =
  "Sign-in could not be completed due to an account configuration problem. Try ORCID again; if you use a passkey, sign in with ORCID first and register a passkey from your profile.";

const WEB_AUTHN_SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  Configuration: SIGN_IN_CONFIGURATION_MESSAGE,
  AccessDenied:
    "Passkey access was denied. Sign in with ORCID first, then register a passkey from your profile.",
  Verification:
    "Passkey verification failed. Try again or use a different passkey.",
  OAuthSignin: "Passkey sign-in could not be started. Try again.",
  OAuthCallback: "Passkey sign-in did not complete. Try again.",
  OAuthCreateAccount: "Could not create an account with this passkey.",
  EmailCreateAccount: "Could not create an account with this passkey.",
  CallbackRouteError: "Passkey sign-in was interrupted. Try again.",
  CredentialsSignin:
    "Passkey sign-in failed. Check your passkey and try again.",
  SessionRequired: "Sign in with ORCID or a passkey to continue.",
};

const KNOWN_PASSKEY_ADAPTER_MESSAGES: Record<string, string> = {
  "Privileged roles require a hardware security key with direct attestation. Use a cross-platform FIDO2 key, then try again.":
    "Platform passkeys (Touch ID, Windows Hello, 1Password) are saved for sign-in and contribution. Administrator and Labs tools still need a hardware security key (cross-platform FIDO2, e.g. YubiKey). Add one with Create Passkey and choose your security key.",
};

const SIGN_IN_PAGE_ERROR_MESSAGES: Record<string, string> = {
  Configuration: SIGN_IN_CONFIGURATION_MESSAGE,
  GitHubRequiresOrcid:
    "Sign in with ORCID first to create your account, then link GitHub from your profile.",
  InvalidOrcid:
    "ORCID sign-in failed. Check your ORCID credentials and try again.",
  ORCID_SIGN_IN_MISSING_ID: SIGN_IN_CONFIGURATION_MESSAGE,
  ORCID_SIGN_IN_INVALID_ID:
    "ORCID sign-in failed. Check your ORCID credentials and try again.",
  ACCOUNT_EXISTS:
    "This sign-in method is already linked to another Atlas account.",
  OAuthAccountNotLinked:
    "This sign-in method is not linked to your Atlas account yet. Sign in with ORCID first, then link it from your profile.",
  AccessDenied:
    "Sign-in was denied. Try ORCID again, or sign in with ORCID before using a passkey.",
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
  return resolveWebAuthnSignInMessage(trimmed) ?? fallback;
}

function resolveWebAuthnSignInMessage(errorCode: string): string | null {
  const knownAdapter = KNOWN_PASSKEY_ADAPTER_MESSAGES[errorCode];
  if (knownAdapter) {
    return knownAdapter;
  }
  const mapped = WEB_AUTHN_SIGN_IN_ERROR_MESSAGES[errorCode];
  if (mapped) {
    return mapped;
  }
  if (errorCode.includes(" ") && errorCode.length > 24) {
    return errorCode;
  }
  return null;
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
  if (SIGN_IN_PAGE_ERROR_MESSAGES[errorCode]) {
    return SIGN_IN_PAGE_ERROR_MESSAGES[errorCode];
  }
  return resolveWebAuthnSignInMessage(errorCode);
}
