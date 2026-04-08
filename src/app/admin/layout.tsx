import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { hasManageUsersCapability } from "~/server/auth/privileged-role";
import { db } from "~/server/db";

export const metadata = {
  title: "Administration",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  let allowed = false;
  try {
    allowed = await hasManageUsersCapability(db, session.user.id);
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
  return <div className="w-full flex-1 py-8">{children}</div>;
}
