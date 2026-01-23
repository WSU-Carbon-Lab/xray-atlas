import { db } from "~/server/db";
import { currentUser } from "@clerk/nextjs/server";

export interface UserData {
  clerkId: string;
  name: string;
  email?: string;
  image: string;
  orcid?: string;
}

/**
 * Syncs a user from Clerk to the database
 * Creates a new user if they don't exist, or updates if they do
 */
export async function syncUserFromClerk(userData: UserData) {
  try {
    const user = await db.users.upsert({
      where: {
        clerkid: userData.clerkId,
      },
      update: {
        name: userData.name,
        email: userData.email && userData.email.trim() !== "" ? userData.email : undefined,
        imageurl: userData.image,
        orcid: userData.orcid ?? undefined,
      },
      create: {
        id: userData.clerkId,
        clerkid: userData.clerkId,
        name: userData.name,
        email: userData.email && userData.email.trim() !== "" ? userData.email : "",
        imageurl: userData.image,
        orcid: userData.orcid ?? undefined,
      },
    });
    return user;
  } catch (error) {
    console.error("Error syncing user from Clerk:", error);
    throw error;
  }
}

/**
 * Gets the current authenticated user and syncs them to the database
 */
export async function syncCurrentUser() {
  const user = await currentUser();
  if (!user) {
    return null;
  }

  const userData: UserData = {
    clerkId: user.id,
    name:
      (user.fullName ??
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()) ||
      "User",
    email:
      user.emailAddresses.find(
        (email) => email.id === user.primaryEmailAddressId,
      )?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      undefined,
    image: user.imageUrl,
    orcid: user.username ?? undefined,
  };

  return await syncUserFromClerk(userData);
}
