import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";

export async function syncUserWithPrisma(userId: string): Promise<void> {
  // Prefer server client; fall back to currentUser() if unavailable in this runtime
  let user: any | null = null;
  try {
    const clerk = await clerkClient();
    user = await clerk.users.getUser(userId);
  } catch {
    user = await currentUser();
  }

  if (!user) return;

  const primaryEmail = user.emailAddresses?.find(
    (e: any) => e.id === user.primaryEmailAddressId,
  )?.emailAddress;

  const imageUrl = user.imageUrl ?? undefined;
  const displayName =
    user.fullName || user.username || primaryEmail || undefined;

  const orcidAccount = user.externalAccounts?.find(
    (acc: any) => acc.provider === "oauth_orcid" || acc.provider === "orcid",
  );
  const orcidId = (orcidAccount?.externalId as string | undefined) ?? undefined;

  await db.user.upsert({
    where: { clerkId: user.id },
    create: {
      clerkId: user.id,
      name: displayName,
      email: primaryEmail,
      image: imageUrl,
      orcid: orcidId,
    },
    update: {
      name: displayName,
      email: primaryEmail,
      image: imageUrl,
      orcid: orcidId,
    },
  });
}
