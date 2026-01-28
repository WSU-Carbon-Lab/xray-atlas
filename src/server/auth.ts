import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "~/server/db";
import { env } from "~/env";
import GitHub from "next-auth/providers/github";
import Passkey from "next-auth/providers/passkey";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

const githubClientId = env.GITHUB_CLIENT_ID;
const githubClientSecret = env.GITHUB_CLIENT_SECRET;

interface ORCIDProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

function ORCID(
  options: OAuthUserConfig<ORCIDProfile>,
): OAuthConfig<ORCIDProfile> {
  const baseUrl = "https://orcid.org";

  return {
    ...options,
    id: "orcid",
    name: "ORCID",
    type: "oauth",
    checks: ["pkce", "state"],
    authorization: {
      url: `${baseUrl}/oauth/authorize`,
      params: {
        scope: "/authenticate",
        response_type: "code",
      },
    },
    token: `${baseUrl}/oauth/token`,
    userinfo: `${baseUrl}/oauth/userinfo`,
    profile(profile) {
      const fullName = `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim();
      return {
        id: profile.sub,
        name: profile.name ?? (fullName || undefined),
        email: profile.email,
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
  OAuthConfig<ORCIDProfile> | ReturnType<typeof GitHub> | ReturnType<typeof Passkey>
> = [];

if (env.ORCID_CLIENT_ID && env.ORCID_CLIENT_SECRET) {
  providers.push(
    ORCID({
      clientId: env.ORCID_CLIENT_ID,
      clientSecret: env.ORCID_CLIENT_SECRET,
    }),
  );
}

if (githubClientId && githubClientSecret) {
  providers.push(
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    }),
  );
}

providers.push(Passkey({}));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  experimental: {
    enableWebAuthn: true,
  },
  trustHost: true,
  basePath: "/api/auth",
  ...(env.AUTH_URL && { url: env.AUTH_URL }),
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        console.log("[NextAuth] signIn callback:", {
          provider: account?.provider ?? "unknown",
          userId: user?.id ?? "unknown",
          hasAccount: !!account,
          hasUser: !!user,
          userEmail: user?.email ?? "unknown",
        });

        if (account?.provider === "orcid" && account.providerAccountId && user.id) {
          let orcidId = account.providerAccountId;

          if (orcidId.startsWith("https://orcid.org/")) {
            orcidId = orcidId.replace("https://orcid.org/", "");
          }

          orcidId = orcidId.replace(/\/$/, "");

          try {
            const existingUser = await db.user.findUnique({
              where: { id: user.id },
              select: { id: true },
            });

            if (existingUser) {
              await db.user.update({
                where: { id: user.id },
                data: { orcid: orcidId },
              });
              console.log("[NextAuth] Updated ORCID for user:", user.id, "ORCID:", orcidId);
            } else {
              console.warn("[NextAuth] User not found when trying to update ORCID:", user.id);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("[NextAuth] Error updating ORCID:", errorMessage, {
              userId: user.id,
              orcidId,
              providerAccountId: account.providerAccountId,
            });
          }
        }
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[NextAuth] Fatal error in signIn callback:", errorMessage);
        return true;
      }
    },
    async session({ session, user }) {
      if (user?.id) {
        const userWithOrcid = await db.user.findUnique({
          where: { id: user.id },
          select: { orcid: true },
        });

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            orcid: userWithOrcid?.orcid ?? null,
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
