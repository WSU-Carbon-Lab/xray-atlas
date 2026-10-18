import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminSessionGate } from "~/components/admin/admin-session-gate";
import { hasManageUsersCapability } from "~/server/auth/privileged-role";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { db } from "~/server/db";

export const metadata = {
  title: "Administration",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Restricts administration routes to a signed-in user who can manage users.
 *
 * A request with no session cookie redirects to `/sign-in` without a database session
 * lookup. A presented cookie must resolve through `getSessionUserIdFromCookies` to a
 * live, unexpired session row before `hasManageUsersCapability` runs. Users without
 * that capability, and capability lookups that fail, redirect to `/`.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const userId = await getSessionUserIdFromCookies(db);
  if (!userId) {
    redirect("/sign-in");
  }
  let allowed = false;
  try {
    allowed = await hasManageUsersCapability(db, userId);
  } catch (err) {
    console.error(
      "[admin layout] Could not verify admin role (database or migration issue):",
      err,
    );
    redirect("/");
  }
  if (!allowed) {
    redirect("/");
  }

  return (
    <div className="w-full flex-1 py-8">
      <AdminSessionGate>{children}</AdminSessionGate>
    </div>
  );
}
