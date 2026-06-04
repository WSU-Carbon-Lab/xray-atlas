import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export const metadata = {
  title: "Account",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return <div className="container mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</div>;
}
