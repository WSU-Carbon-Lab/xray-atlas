import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { db } from "~/server/db";

export const metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Restricts dashboard routes to signed-in Atlas users and applies a full-width shell.
 *
 * A request with no session cookie redirects to `/sign-in` without a database session
 * lookup. A presented cookie must resolve through `getSessionUserIdFromCookies` to a
 * live, unexpired session row. Uses the same horizontal breakout as `/wiki/*` so
 * dashboard pages are not capped by the root `main` `max-w-7xl` constraint. All nested
 * dashboard routes inherit edge-to-edge width with compact horizontal padding.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const userId = await getSessionUserIdFromCookies(db);
  if (!userId) {
    redirect("/sign-in");
  }
  return (
    <div className="relative mx-[calc(-50vw+50%)] box-border flex min-h-0 w-screen max-w-[100vw] flex-1 flex-col px-3 py-4 sm:px-4">
      {children}
    </div>
  );
}
