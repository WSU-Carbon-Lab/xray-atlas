import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { userMayAccessAdminWrites } from "~/server/auth/mfa-access";
import { hasManageUsersCapability } from "~/server/auth/privileged-role";
import { db } from "~/server/db";
import { headers } from "next/headers";

export const metadata = {
  title: "Administration",
  robots: {
    index: false,
    follow: false,
  },
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

  const headerList = await headers();
  const req = new Request("http://localhost/admin", {
    headers: headerList,
  });
  const passkeyAllowed = await userMayAccessAdminWrites(
    db,
    session.user.id,
    req,
  );
  if (!passkeyAllowed) {
    redirect(`/users/${encodeURIComponent(session.user.id)}?passkey=required`);
  }

  return <div className="w-full flex-1 py-8">{children}</div>;
}
