import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "~/server/db";
import { env } from "~/env";
import type { OAuthConfig } from "next-auth/providers";

const ORCID_BASE_URL = env.ORCID_USE_SANDBOX === "true" 
  ? "https://sandbox.orcid.org" 
  : "https://orcid.org";

if (env.ORCID_CLIENT_ID && env.NODE_ENV === "development") {
  console.log("[ORCID Config] Using:", {
    baseUrl: ORCID_BASE_URL,
    clientId: env.ORCID_CLIENT_ID,
    useSandbox: env.ORCID_USE_SANDBOX,
  });
}

const ORCID: OAuthConfig<Record<string, unknown>> | null = 
  env.ORCID_CLIENT_ID && env.ORCID_CLIENT_SECRET
    ? {
        id: "orcid",
        name: "ORCID",
        type: "oauth",
        authorization: {
          url: `${ORCID_BASE_URL}/oauth/authorize`,
          params: {
            scope: "/authenticate",
            response_type: "code",
          },
        },
        token: `${ORCID_BASE_URL}/oauth/token`,
        userinfo: `${ORCID_BASE_URL}/oauth/userinfo`,
        clientId: env.ORCID_CLIENT_ID,
        clientSecret: env.ORCID_CLIENT_SECRET,
        profile(profile: Record<string, unknown>) {
          return {
            id: (profile.sub as string) ?? (profile.orcid as string) ?? "",
            name: (profile.name as string) ?? undefined,
            email: (profile.email as string) ?? undefined,
            image: undefined,
          };
        },
      }
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: ORCID ? [ORCID] : [],
  trustHost: true,
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (user?.id && account) {
        await syncUserToApp(
          {
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            image: user.image ?? null,
          },
          account,
        );
      }
      return true;
    },
    async session({ session, user }) {
      if (user?.id) {
        const appUser = await getAppUser(user.id);
        if (appUser) {
          return {
            ...session,
            user: {
              ...session.user,
              id: user.id,
              appUser,
            },
          };
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});

async function syncUserToApp(
  nextAuthUser: { id: string; name?: string | null; email?: string | null; image?: string | null },
  account: { provider: string; providerAccountId: string } | null,
) {
  try {
    const orcidId = account?.providerAccountId;

    const appUser = await db.users.upsert({
      where: {
        nextAuthId: nextAuthUser.id,
      },
      update: {
        name: nextAuthUser.name ?? undefined,
        email: nextAuthUser.email ?? undefined,
        imageurl: nextAuthUser.image ?? undefined,
        orcid: orcidId ?? undefined,
      },
      create: {
        id: nextAuthUser.id,
        nextAuthId: nextAuthUser.id,
        name: nextAuthUser.name ?? "User",
        email: nextAuthUser.email ?? "",
        imageurl: nextAuthUser.image ?? undefined,
        orcid: orcidId ?? undefined,
        role: "contributor",
      },
    });

    return appUser;
  } catch (error) {
    console.error("Error syncing user to app:", error);
    throw error;
  }
}

async function getAppUser(nextAuthId: string) {
  try {
    const appUser = await db.users.findUnique({
      where: {
        nextAuthId,
      },
    });
    return appUser;
  } catch (error) {
    console.error("Error getting app user:", error);
    return null;
  }
}

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
