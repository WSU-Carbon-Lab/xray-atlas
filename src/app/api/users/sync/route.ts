import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUserFromClerk } from "~/server/api";
import type { UserData } from "~/server/api";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Check if user is authenticated
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the current user from Clerk
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData: UserData = {
      clerkId: user.id,
      name:
        (user.fullName ??
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()) ||
        "User",
      image: user.imageUrl,
    };

    // Sync user to database
    const syncedUser = await syncUserFromClerk(userData);

    return NextResponse.json({ success: true, user: syncedUser });
  } catch (error) {
    console.error("Error in sync route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
