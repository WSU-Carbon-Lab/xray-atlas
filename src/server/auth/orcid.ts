import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import { secret } from "@aws-amplify/backend";

/**
 * ORCID OAuth2 Profile
 * @see https://info.orcid.org/documentation/integration-guide/getting-authenticated-orcid-ids/
 */
export interface ORCIDProfile {
  orcid: string;
  name: string | null;
  given_names: string | null;
  family_name: string | null;
  email: string | null;
  email_verified: boolean;
}

/**
 * ORCID Provider for NextAuth.js
 *
 * Supports both production and sandbox ORCID environments.
 * Set `ORCID_USE_SANDBOX=true` to use the sandbox environment.
 *
 * @example
 * ```ts
 * providers: [
 *   ORCIDProvider({
 *     clientId: secret("AUTH_ORCID_ID"),
 *     clientSecret: secret("AUTH_ORCID_SECRET"),
 *   })
 * ]
 * ```
 */
export default function ORCIDProvider<P extends ORCIDProfile>(
  options: OAuthUserConfig<P>,
): OAuthConfig<P> {
  const useSandbox = process.env.ORCID_USE_SANDBOX === "true";
  const baseUrl = useSandbox
    ? "https://sandbox.orcid.org"
    : "https://orcid.org";

  return {
    id: "orcid",
    name: "ORCID",
    type: "oauth",

    authorization: {
      url: `${baseUrl}/oauth/authorize`,
      params: {
        scope: "/authenticate",
        // Request email scope if you need email access
        // scope: "/authenticate openid email",
      },
    },

    token: `${baseUrl}/oauth/token`,

    userinfo: {
      // ORCID provides user info in the token response
      // We'll extract it from the token instead of making another request
      url: `${baseUrl}/oauth/userinfo`,
    },

    profile(profile) {
      return {
        id: profile.orcid,
        name:
          profile.name ??
          [profile.given_names, profile.family_name]
            .filter(Boolean)
            .join(" ") ??
          profile.orcid,
        email: profile.email ?? null,
        image: null, // ORCID doesn't provide profile images via OAuth
      };
    },

    style: { brandColor: "#a6ce39", logo: "/orcid-logo.svg" },

    options,
  };
}
