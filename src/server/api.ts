import { db } from "~/server/db";
import { currentUser } from "@clerk/nextjs/server";

export interface UserData {
  clerkId: string;
  name: string;
  image: string;
}

/**
 * Syncs a user from Clerk to the database
 * Creates a new user if they don't exist, or updates if they do
 */
export async function syncUserFromClerk(userData: UserData) {
  try {
    const user = await db.user.upsert({
      where: {
        clerkId: userData.clerkId,
      },
      update: {
        name: userData.name,
        image: userData.image,
      },
      create: {
        clerkId: userData.clerkId,
        name: userData.name,
        image: userData.image,
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
    image: user.imageUrl,
  };

  return await syncUserFromClerk(userData);
}
