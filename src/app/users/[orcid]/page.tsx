import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProfilePageShell } from "./profile-sections";
import { ProfilePageClient } from "./profile-page-client";

/**
 * Server-rendered public profile shell with contribution summary for faster LCP.
 */
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ orcid: string }>;
}) {
  const { orcid } = await params;

  let user;
  let contributionStats;

  let sessionUserId: string | null = null;

  try {
    const [session, profileUser, stats] = await Promise.all([
      auth(),
      api.users.getById({ id: orcid }),
      api.users.getProfileContributionStats({ userId: orcid }),
    ]);
    sessionUserId = session?.user?.id ?? null;
    user = profileUser;
    contributionStats = stats;
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <ProfilePageShell>
      <ProfilePageClient
        user={user}
        initialContributionStats={contributionStats}
        initialIsOwnProfile={sessionUserId === user.id}
      />
    </ProfilePageShell>
  );
}
