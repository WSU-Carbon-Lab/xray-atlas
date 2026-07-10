/**
 * Zenodo environment helpers for Atlas repository depositor minting.
 *
 * Minting is disabled when `ZENODO_ACCESS_TOKEN` is unset. Production community id is `xrayatlas`
 * (https://zenodo.org/communities/xrayatlas). Sandbox requires a separate community and PAT.
 */

import { env } from "~/env";

export const ZENODO_PRODUCTION_COMMUNITY_ID = "xrayatlas";

export const ZENODO_PRODUCTION_API_BASE = "https://zenodo.org/api";
export const ZENODO_SANDBOX_API_BASE = "https://sandbox.zenodo.org/api";

/**
 * Returns whether Atlas should attempt Zenodo deposits for this process.
 *
 * @returns `true` only when a non-empty `ZENODO_ACCESS_TOKEN` is configured.
 */
export function isZenodoMintingEnabled(): boolean {
  return Boolean(env.ZENODO_ACCESS_TOKEN?.trim());
}

/**
 * Resolves the Zenodo Deposit REST API base URL from `ZENODO_USE_SANDBOX`.
 *
 * @returns Sandbox API base when `ZENODO_USE_SANDBOX` is `"true"`; otherwise production.
 */
export function zenodoBaseUrl(): string {
  return env.ZENODO_USE_SANDBOX === "true"
    ? ZENODO_SANDBOX_API_BASE
    : ZENODO_PRODUCTION_API_BASE;
}

/**
 * Reads the configured Zenodo personal access token for the Atlas depositor account.
 *
 * @returns Trimmed token, or `null` when minting is disabled.
 */
export function zenodoAccessToken(): string | null {
  const token = env.ZENODO_ACCESS_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

/**
 * Resolves the Zenodo Community identifier submitted with depositions.
 *
 * Defaults to {@link ZENODO_PRODUCTION_COMMUNITY_ID} (`xrayatlas`) when the env var is unset
 * so production wiring stays correct once a token is present. Override with
 * `ZENODO_COMMUNITY_ID` for sandbox communities that use a different slug.
 *
 * @returns Community identifier string (never empty).
 */
export function zenodoCommunityId(): string {
  const configured = env.ZENODO_COMMUNITY_ID?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }
  return ZENODO_PRODUCTION_COMMUNITY_ID;
}
