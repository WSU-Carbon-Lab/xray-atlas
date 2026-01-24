import { env } from "~/env";
import { db } from "~/server/db";

export async function GET() {
  const authUrl = env.AUTH_URL ?? "http://localhost:3001";
  const githubCallbackUrl = `${authUrl}/api/auth/callback/github`;

  const dbPermissions = {
    canAccessAccount: false,
    canAccessUser: false,
    canAccessSession: false,
    error: null as string | null,
  };

  try {
    await db.account.findMany({ take: 1 });
    dbPermissions.canAccessAccount = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    dbPermissions.error = errorMessage;
    console.error("[debug-auth] Error accessing account:", errorMessage);
  }

  try {
    await db.user.findMany({ take: 1 });
    dbPermissions.canAccessUser = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    dbPermissions.error ??= errorMessage;
    console.error("[debug-auth] Error accessing user:", errorMessage);
  }

  try {
    await db.session.findMany({ take: 1 });
    dbPermissions.canAccessSession = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    dbPermissions.error ??= errorMessage;
    console.error("[debug-auth] Error accessing session:", errorMessage);
  }

  return Response.json({
    auth: {
      authUrl: env.AUTH_URL ?? "NOT SET (defaulting to http://localhost:3001)",
      githubCallbackUrl,
    },
    database: {
      permissions: dbPermissions,
      hasMultiSchema: true,
    },
    github: {
      hasClientId: !!env.GITHUB_CLIENT_ID,
      clientId: env.GITHUB_CLIENT_ID ? `${env.GITHUB_CLIENT_ID.substring(0, 10)}...` : "NOT SET",
      hasClientSecret: !!env.GITHUB_CLIENT_SECRET,
      expectedCallbackUrl: githubCallbackUrl,
    },
  }, {
    headers: { "Content-Type": "application/json" }
  });
}
