import NextAuth from "next-auth";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { db } from "~/server/db";
import { env } from "~/env";
import GitHub from "next-auth/providers/github";
import Passkey from "next-auth/providers/passkey";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import { assertedAalForAuthenticator } from "~/server/auth/aal";
import {
  setPendingPasskeyAssurance,
  setPendingPasskeyEnrollmentMeta,
} from "~/server/auth/passkey-ceremony-bridge";
import { cookies } from "next/headers";
import {
  getUserSessionCapabilities,
  type UserSessionCapabilities,
} from "~/server/auth/privileged-role";
import { PrismaAdapterOrcid } from "~/server/auth/prisma-adapter-orcid";
import { parseOrcidForStorage } from "~/lib/orcid";
import { emitAuditEvent } from "~/server/audit";
import { orcidOidcBaseUrl } from "~/server/auth/orcid-oidc-config";
import { enrichUserProfileFromOrcidUserinfo } from "~/server/auth/orcid-userinfo";
import { resolveWebAuthnRelayingParty } from "~/server/auth/webauthn-relaying-party";

const emptySessionCapabilities: UserSessionCapabilities = {
  canAccessLabs: false,
  canManageUsers: false,
  roleSlugs: [],
};

interface ORCIDProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

function resolveGitHubCredentials(): {
  clientId: string | undefined;
  clientSecret: string | undefined;
} {
  if (env.NODE_ENV === "development") {
    if (env.DEV_GITHUB_CLIENT_ID && env.DEV_GITHUB_CLIENT_SECRET) {
      return {
        clientId: env.DEV_GITHUB_CLIENT_ID,
        clientSecret: env.DEV_GITHUB_CLIENT_SECRET,
      };
    }
  }
  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

function ORCID(
  options: OAuthUserConfig<ORCIDProfile>,
): OAuthConfig<ORCIDProfile> {
  const baseUrl = orcidOidcBaseUrl();

  return {
    ...options,
    id: "orcid",
    name: "ORCID",
    type: "oauth",
    issuer: baseUrl,
    checks: ["pkce", "state"],
    authorization: {
      url: `${baseUrl}/oauth/authorize`,
      params: {
        scope: "openid",
        response_type: "code",
      },
    },
    token: `${baseUrl}/oauth/token`,
    userinfo: `${baseUrl}/oauth/userinfo`,
    profile(profile) {
      const fullName =
        `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim();
      const orcidId = parseOrcidForStorage(profile.sub);
      return {
        id: orcidId,
        name: profile.name ?? (fullName || undefined),
      };
    },
    style: {
      logo: "https://orcid.org/sites/default/files/images/orcid_24x24.png",
      bg: "#a60f2d",
      text: "#fff",
    },
  } as OAuthConfig<ORCIDProfile>;
}

const providers: Array<
  | OAuthConfig<ORCIDProfile>
  | ReturnType<typeof GitHub>
  | ReturnType<typeof Passkey>
> = [];

if (env.ORCID_CLIENT_ID && env.ORCID_CLIENT_SECRET) {
  providers.push(
    ORCID({
      clientId: env.ORCID_CLIENT_ID,
      clientSecret: env.ORCID_CLIENT_SECRET,
    }),
  );
}

const { clientId: githubClientId, clientSecret: githubClientSecret } =
  resolveGitHubCredentials();

if (githubClientId && githubClientSecret) {
  providers.push(
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    }),
  );
}

const webAuthnRp = resolveWebAuthnRelayingParty();

function normalizeCredentialId(credentialId: string): string {
  return Buffer.from(credentialId, "base64").toString("base64");
}

providers.push(
  Passkey({
    relayingParty: {
      id: webAuthnRp.id,
      name: webAuthnRp.name,
      origin: webAuthnRp.origin,
    },
    registrationOptions: {
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
    },
    simpleWebAuthn: {
      generateAuthenticationOptions,
      generateRegistrationOptions,
      verifyRegistrationResponse: async (options) => {
        const verification = await verifyRegistrationResponse(options);
        if (verification.verified && verification.registrationInfo) {
          const { registrationInfo } = verification;
          const credentialId = Buffer.from(registrationInfo.credentialID).toString(
            "base64",
          );
          await setPendingPasskeyEnrollmentMeta({
            credentialId,
            aaguid: registrationInfo.aaguid ?? null,
            attestationFormat: registrationInfo.fmt ?? null,
            credentialDeviceType: registrationInfo.credentialDeviceType,
          });
        }
        return verification;
      },
      verifyAuthenticationResponse: async (options) => {
        const verification = await verifyAuthenticationResponse(options);
        if (verification.verified) {
          const credentialId = normalizeCredentialId(options.response.id);
          const row = await db.authenticator.findFirst({
            where: { credentialID: credentialId, revokedAt: null },
            select: {
              aaguid: true,
              attestationFormat: true,
              credentialDeviceType: true,
            },
          });
          await setPendingPasskeyAssurance({
            credentialId,
            assertedAal: row
              ? assertedAalForAuthenticator(row)
              : assertedAalForAuthenticator({
                  aaguid: null,
                  attestationFormat: null,
                  credentialDeviceType: "multiDevice",
                }),
          });
        }
        return verification;
      },
    },
  }),
);

const useSecureCookies =
  env.NODE_ENV === "production" && env.AUTH_URL.startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const sameSite = useSecureCookies ? ("none" as const) : ("lax" as const);
const nextAuthPublicUrl =
  env.NODE_ENV === "production" ? env.AUTH_URL : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapterOrcid(db),
  providers,
  debug: process.env.NODE_ENV === "development",
  experimental: {
    enableWebAuthn: true,
  },
  trustHost: true,
  basePath: "/api/auth",
  ...(nextAuthPublicUrl ? { url: nextAuthPublicUrl } : {}),
  cookies: {
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite,
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite,
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
  },
  session: {
    strategy: "database",
  },
  events: {
    linkAccount: async ({ user, account }) => {
      if (!user.id || !account.provider) return;
      await emitAuditEvent({
        eventType: "account.link.complete",
        eventScope: "auth.account",
        actorUserId: user.id,
        subjectUserId: user.id,
        payload: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
        failSilent: true,
      });
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (!account) {
          return true;
        }

        const cookieStore = await cookies();
        const linkingUserId = cookieStore.get("linkAccountUserId")?.value;
        const linkingProvider = cookieStore.get("linkAccountProvider")?.value;

        if (account.provider === "github") {
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (existingAccount) {
            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }

          if (
            linkingUserId &&
            linkingProvider === "github" &&
            user.id === linkingUserId
          ) {
            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }

          if (linkingUserId && linkingProvider === "github") {
            const targetUser = await db.user.findUnique({
              where: { id: linkingUserId },
              select: { id: true },
            });
            if (targetUser) {
              cookieStore.delete("linkAccountUserId");
              cookieStore.delete("linkAccountProvider");
              return true;
            }
          }

          cookieStore.delete("linkAccountUserId");
          cookieStore.delete("linkAccountProvider");
          return "/sign-in?error=GitHubRequiresOrcid";
        }

        if (account.provider === "orcid") {
          try {
            parseOrcidForStorage(account.providerAccountId);
          } catch {
            return "/sign-in?error=InvalidOrcid";
          }

          if (user.id && account.access_token) {
            try {
              await enrichUserProfileFromOrcidUserinfo(
                db,
                user.id,
                account.access_token,
              );
            } catch (err) {
              console.error(
                "[NextAuth] ORCID userinfo enrichment failed; sign-in continues.",
                err,
              );
            }
          }
        }

        if (linkingUserId && linkingProvider === account.provider) {
          const currentUserId = linkingUserId;

          if (currentUserId === user.id) {
            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }

          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (existingAccount) {
            if (existingAccount.userId === currentUserId) {
              cookieStore.delete("linkAccountUserId");
              cookieStore.delete("linkAccountProvider");
              return true;
            }
            await db.account.update({
              where: { id: existingAccount.id },
              data: { userId: currentUserId },
            });
            await emitAuditEvent({
              eventType: "account.link.complete",
              eventScope: "auth.account",
              actorUserId: currentUserId,
              subjectUserId: currentUserId,
              payload: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
              failSilent: true,
            });
            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }

          await db.account.updateMany({
            where: { userId: user.id },
            data: { userId: currentUserId },
          });

          const orphanedAccounts = await db.account.findMany({
            where: { userId: user.id },
          });

          if (orphanedAccounts.length === 0) {
            const orphanUserId = user.id;
            await db.user.delete({
              where: { id: orphanUserId },
            });
            await emitAuditEvent({
              eventType: "user.delete",
              eventScope: "account.link.merge",
              actorUserId: currentUserId,
              subjectUserId: orphanUserId,
              failSilent: true,
            });
          }

          await emitAuditEvent({
            eventType: "account.link.complete",
            eventScope: "auth.account.merge",
            actorUserId: currentUserId,
            subjectUserId: currentUserId,
            payload: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
            failSilent: true,
          });

          cookieStore.delete("linkAccountUserId");
          cookieStore.delete("linkAccountProvider");
          return true;
        }

        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (existingAccount && existingAccount.userId !== user.id) {
          const currentSession = await auth();
          const currentUserId = currentSession?.user?.id;

          if (currentUserId && currentUserId === existingAccount.userId) {
            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }

          if (linkingUserId && linkingUserId === existingAccount.userId) {
            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }

          cookieStore.delete("linkAccountUserId");
          cookieStore.delete("linkAccountProvider");
          throw new Error("ACCOUNT_EXISTS");
        }

        cookieStore.delete("linkAccountUserId");
        cookieStore.delete("linkAccountProvider");
        return true;
      } catch (error) {
        const cookieStore = await cookies();
        cookieStore.delete("linkAccountUserId");
        cookieStore.delete("linkAccountProvider");

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        if (errorMessage === "ACCOUNT_EXISTS") {
          throw error;
        }
        console.error(
          "[NextAuth] Fatal error in signIn callback:",
          errorMessage,
        );
        return true;
      }
    },
    async session({ session, user }) {
      if (user?.id) {
        let caps: UserSessionCapabilities = { ...emptySessionCapabilities };
        try {
          caps = await getUserSessionCapabilities(db, user.id);
        } catch (err) {
          console.error(
            "[NextAuth] Session role enrichment failed; continuing with minimal session. Apply prisma migrations if tables are missing.",
            err,
          );
        }

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            email: user.id,
            ...caps,
          },
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});

export async function getServerSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
