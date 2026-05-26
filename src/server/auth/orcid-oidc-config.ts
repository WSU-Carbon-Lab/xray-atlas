import { env } from "~/env";

/**
 * Returns the ORCID OAuth/OIDC host base URL for the configured environment.
 */
export function orcidOidcBaseUrl(): string {
  return env.ORCID_USE_SANDBOX === "true"
    ? "https://sandbox.orcid.org"
    : "https://orcid.org";
}

/**
 * Returns the OIDC issuer string used to validate ORCID id tokens.
 */
export function orcidOidcIssuer(): string {
  return orcidOidcBaseUrl();
}

/**
 * Returns the ORCID JWKS URL for RS256 id token signature verification.
 */
export function orcidOidcJwksUrl(): string {
  return `${orcidOidcBaseUrl()}/oauth/jwks`;
}

/**
 * Returns the ORCID userinfo endpoint URL.
 */
export function orcidOidcUserinfoUrl(): string {
  return `${orcidOidcBaseUrl()}/oauth/userinfo`;
}
