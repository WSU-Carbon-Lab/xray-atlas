import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEV_MOCK_USER_ID } from "~/lib/dev-mock-data";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("dev-auth-session", DEV_MOCK_USER_ID, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ success: true, userId: DEV_MOCK_USER_ID });
}

export async function DELETE() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete("dev-auth-session");

  return NextResponse.json({ success: true });
}
