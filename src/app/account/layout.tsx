import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import { db } from "~/server/db";

export const metadata = {
  title: "Account",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Restricts account routes to a signed-in Atlas user.
 *
 * A request with no session cookie redirects to `/sign-in` without a database session
 * lookup. A presented cookie must resolve through `getSessionUserIdFromCookies` to a
 * live, unexpired session row.
 */
export default async function AccountLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const userId = await getSessionUserIdFromCookies(db);
  if (!userId) {
    redirect("/sign-in");
  }
  return (
    <div className="container mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      {children}
    </div>
  );
}
