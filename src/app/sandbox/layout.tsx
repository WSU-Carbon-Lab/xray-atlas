import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserSessionCapabilities } from "~/server/auth/privileged-role";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { db } from "~/server/db";

export const metadata = {
  title: "Sandbox",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Restricts `/sandbox` to a signed-in user with Labs or user-management capability.
 *
 * A request with no session cookie redirects to `/sign-in` without a database session
 * lookup. A presented cookie must resolve through `getSessionUserIdFromCookies` to a
 * live, unexpired session row before capability flags are loaded. Users without Labs
 * or user-management capability, and capability lookups that fail, redirect to `/`.
 */
export default async function SandboxLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const userId = await getSessionUserIdFromCookies(db);
  if (!userId) {
    redirect("/sign-in");
  }
  let allowed = false;
  try {
    const caps = await getUserSessionCapabilities(db, userId);
    allowed = caps.canAccessLabs || caps.canManageUsers;
  } catch (err) {
    console.error(
      "[sandbox layout] Could not verify labs access (database or migration issue):",
      err,
    );
    redirect("/");
  }
  if (!allowed) {
    redirect("/");
  }
  return <div className="w-full flex-1 py-8">{children}</div>;
}
