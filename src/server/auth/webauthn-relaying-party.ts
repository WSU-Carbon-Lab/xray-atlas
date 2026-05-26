import { env } from "~/env";

/** Relaying party values consumed by Auth.js WebAuthn / Passkey provider configuration. */
export interface WebAuthnRelayingPartyConfig {
  id: string;
  name: string;
  origin: string;
}

/**
 * Resolves WebAuthn RP ID, display name, and origin from validated env with AUTH_URL fallbacks.
 */
export function resolveWebAuthnRelayingParty(): WebAuthnRelayingPartyConfig {
  const authUrl = new URL(env.AUTH_URL);
  return {
    id: env.WEBAUTHN_RP_ID ?? authUrl.hostname,
    name: "X-ray Atlas",
    origin: env.WEBAUTHN_ORIGIN ?? authUrl.origin,
  };
}

/**
 * Supplies a stable `email` string for Auth.js WebAuthn registration when the user row has no email column.
 */
export function webAuthnUserNameFromOrcidUserId(userId: string): string {
  return userId;
}
