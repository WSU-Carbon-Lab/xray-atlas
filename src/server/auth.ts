import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "~/server/db";
import { env } from "~/env";
import GitHub from "next-auth/providers/github";
// Check if we are in development mode and use the dev GitHub credentials
const isDev = process.env.NODE_ENV === "development";
const githubClientId = isDev
  ? env.DEV_GITHUB_CLIENT_ID ?? env.GITHUB_CLIENT_ID
  : env.GITHUB_CLIENT_ID;
const githubClientSecret = isDev
  ? env.DEV_GITHUB_CLIENT_SECRET ?? env.GITHUB_CLIENT_SECRET
  : env.GITHUB_CLIENT_SECRET;

const providers =
  githubClientId && githubClientSecret
    ? [
        GitHub({
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  trustHost: true,
  basePath: "/api/auth",
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (user?.id) {
        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
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
