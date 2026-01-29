import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "~/server/db";
import { env } from "~/env";
import GitHub from "next-auth/providers/github";
import HuggingFace from "next-auth/providers/huggingface";
import Passkey from "next-auth/providers/passkey";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import { cookies } from "next/headers";

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
  OAuthConfig<ORCIDProfile> | ReturnType<typeof GitHub> | ReturnType<typeof HuggingFace> | ReturnType<typeof Passkey>
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

if (env.HUGGINGFACE_CLIENT_ID && env.HUGGINGFACE_CLIENT_SECRET) {
  providers.push(
    HuggingFace({
      clientId: env.HUGGINGFACE_CLIENT_ID,
      clientSecret: env.HUGGINGFACE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
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
        if (!account || !user.id) {
          return true;
        }

        const cookieStore = await cookies();
        const linkingUserId = cookieStore.get("linkAccountUserId")?.value;
        const linkingProvider = cookieStore.get("linkAccountProvider")?.value;

        if (linkingUserId && linkingProvider === account.provider) {
          const currentUserId = linkingUserId;

          if (currentUserId === user.id) {
            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }

          if (currentUserId !== user.id) {
            const existingAccount = await db.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              include: {
                user: true,
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

              if (account.provider === "orcid" && account.providerAccountId) {
                let orcidId = account.providerAccountId;
                if (orcidId.startsWith("https://orcid.org/")) {
                  orcidId = orcidId.replace("https://orcid.org/", "");
                }
                orcidId = orcidId.replace(/\/$/, "");
                await db.user.update({
                  where: { id: currentUserId },
                  data: { orcid: orcidId },
                });
              }
              cookieStore.delete("linkAccountUserId");
              cookieStore.delete("linkAccountProvider");
              return true;
            }

            await db.account.updateMany({
              where: { userId: user.id },
              data: { userId: currentUserId },
            });

            if (account.provider === "orcid" && account.providerAccountId) {
              let orcidId = account.providerAccountId;
              if (orcidId.startsWith("https://orcid.org/")) {
                orcidId = orcidId.replace("https://orcid.org/", "");
              }
              orcidId = orcidId.replace(/\/$/, "");
              await db.user.update({
                where: { id: currentUserId },
                data: { orcid: orcidId },
              });
            }

            const orphanedAccounts = await db.account.findMany({
              where: { userId: user.id },
            });

            if (orphanedAccounts.length === 0) {
              await db.user.delete({
                where: { id: user.id },
              });
            }

            cookieStore.delete("linkAccountUserId");
            cookieStore.delete("linkAccountProvider");
            return true;
          }
        }

        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: {
            user: true,
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

        if (account.provider === "orcid" && account.providerAccountId && user.id) {
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
        cookieStore.delete("linkAccountUserId");
        cookieStore.delete("linkAccountProvider");
        return true;
      } catch (error) {
        const cookieStore = await cookies();
        cookieStore.delete("linkAccountUserId");
        cookieStore.delete("linkAccountProvider");

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (errorMessage === "ACCOUNT_EXISTS") {
          throw error;
        }
        console.error("[NextAuth] Fatal error in signIn callback:", errorMessage);
        return true;
      }
    },
    async session({ session, user }) {
      if (process.env.NODE_ENV === "development") {
        const cookieStore = await cookies();
        const devSession = cookieStore.get("dev-auth-session");
        if (devSession?.value === "00000000-0000-0000-0000-000000000000") {
          return {
            ...session,
            user: {
              id: "00000000-0000-0000-0000-000000000000",
              name: "Dr. Jane Smith",
              email: "jane.smith@example.edu",
              image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg",
              orcid: "0000-0001-2345-6789",
            },
          };
        }
      }

      if (user?.id) {
        if (process.env.NODE_ENV === "development") {
          const cookieStore = await cookies();
          const devSession = cookieStore.get("dev-auth-session");
          if (devSession?.value === "00000000-0000-0000-0000-000000000000" && user.id !== "00000000-0000-0000-0000-000000000000") {
            return {
              ...session,
              user: {
                id: "00000000-0000-0000-0000-000000000000",
                name: "Dr. Jane Smith",
                email: "jane.smith@example.edu",
                image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg",
                orcid: "0000-0001-2345-6789",
              },
            };
          }
        }

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
