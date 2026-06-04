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
 * Restricts dashboard routes to signed-in Atlas users. Processing mutations in
 * later phases may additionally require Labs access; the shell remains reachable
 * for any authenticated contributor.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return (
    <div className="container mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      {children}
    </div>
  );
}
