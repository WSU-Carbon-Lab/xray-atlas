import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

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
 * Uses the same horizontal breakout as `/wiki/*` so dashboard pages are not capped by
 * the root `main` `max-w-7xl` constraint. All nested dashboard routes inherit
 * edge-to-edge width with compact horizontal padding.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return (
    <div className="relative mx-[calc(-50vw+50%)] box-border flex w-screen max-w-[100vw] min-h-0 flex-1 flex-col px-3 py-4 sm:px-4">
      {children}
    </div>
  );
}
