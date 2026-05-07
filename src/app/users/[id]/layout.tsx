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

  const moleculesAuthored = await db.molecules.count({
    where: { createdby: user.id },
  });

  const countPhrase =
    moleculesAuthored > 0
      ? ` ${moleculesAuthored} molecule record${moleculesAuthored === 1 ? "" : "s"} contributed.`
      : "";

  const description = `Public contributor profile for ${displayName} on X-ray Atlas.${countPhrase}`.replace(/\s+/g, " ").trim();

  return {
    title: `${displayName} profile`,
    description,
    alternates: {
      canonical: `/users/${user.id}`,
    },
    openGraph: {
      title: `${displayName} | X-ray Atlas`,
      description,
      url: `/users/${user.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} | X-ray Atlas`,
      description,
    },
  };
}

export default function UserDetailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
