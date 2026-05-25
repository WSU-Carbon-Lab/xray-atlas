import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "~/server/db";
import {
  isLegacyUserUuidSegment,
  resolveUserIdFromRouteSegment,
} from "~/lib/user-route";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orcid: string }>;
}): Promise<Metadata> {
  const { orcid: routeSegment } = await params;
  const userId = await resolveUserIdFromRouteSegment(db, routeSegment);
  if (!userId) {
    return {
      title: "User not found",
      robots: { index: false, follow: false },
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
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
    robots: { index: false, follow: false },
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

export default async function UserDetailLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orcid: string }>;
}>) {
  const { orcid: routeSegment } = await params;

  if (isLegacyUserUuidSegment(routeSegment)) {
    const canonicalId = await resolveUserIdFromRouteSegment(db, routeSegment);
    if (!canonicalId) {
      notFound();
    }
    redirect(`/users/${canonicalId}`);
  }

  return children;
}
