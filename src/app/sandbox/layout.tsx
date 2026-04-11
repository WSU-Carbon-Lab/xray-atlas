import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export const metadata = {
  title: "Sandbox",
};

/**
 * Restricts the sandbox route to signed-in users who may preview internal tools:
 * any signed-in user in development, or anyone with Labs or user-management
 * capability in production.
 */
export default async function SandboxLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  const dev = process.env.NODE_ENV === "development";
  const allowed =
    dev ||
    session.user.canAccessLabs ||
    session.user.canManageUsers;
  if (!allowed) {
    redirect("/");
  }
  return <div className="w-full flex-1 py-8">{children}</div>;
}
