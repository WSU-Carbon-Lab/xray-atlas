import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "~/server/db";
import { env } from "~/env";
import GitHub from "next-auth/providers/github";
import Passkey from "next-auth/providers/passkey";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

const isDev = process.env.NODE_ENV === "development";
const useSandbox = env.ORCID_USE_SANDBOX === "true";

const githubClientId = isDev
  ? env.DEV_GITHUB_CLIENT_ID ?? env.GITHUB_CLIENT_ID
  : env.GITHUB_CLIENT_ID;
const githubClientSecret = isDev
  ? env.DEV_GITHUB_CLIENT_SECRET ?? env.GITHUB_CLIENT_SECRET
  : env.GITHUB_CLIENT_SECRET;

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
  const baseUrl = useSandbox
    ? "https://sandbox.orcid.org"
    : "https://orcid.org";

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
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "orcid" && account.providerAccountId) {
        const orcidId = account.providerAccountId.startsWith("https://")
          ? account.providerAccountId.replace("https://orcid.org/", "").replace("https://sandbox.orcid.org/", "")
          : account.providerAccountId;

        if (user.id) {
          await db.user.update({
            where: { id: user.id },
            data: { orcid: orcidId },
          });
        }
      }
      return true;
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
