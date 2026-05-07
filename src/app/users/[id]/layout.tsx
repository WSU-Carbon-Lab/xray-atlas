import type { Metadata } from "next";
import { db } from "~/server/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!user) {
    return {
      title: "User not found",
      robots: { index: false, follow: false },
    };
  }

  const displayName = user.name?.trim() ?? "User";

  return {
    title: `${displayName} profile`,
    description: `Profile and contributed molecule records for ${displayName} on X-ray Atlas.`,
    alternates: {
      canonical: `/users/${user.id}`,
    },
  };
}

export default function UserDetailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
