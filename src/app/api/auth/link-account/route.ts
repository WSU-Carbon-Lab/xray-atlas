import { auth, signIn } from "~/server/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

const linkAccountSchema = z.object({
  provider: z.enum(["orcid", "github"]),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/sign-in", request.url),
      );
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    const validationResult = linkAccountSchema.safeParse({ provider });
    if (!validationResult.success) {
      return NextResponse.redirect(
        new URL(`/users/${session.user.id}?error=Invalid provider`, request.url),
      );
    }

    const existingAccount = await db.account.findFirst({
      where: {
        userId: session.user.id,
        provider: validationResult.data.provider,
      },
    });

    if (existingAccount) {
      return NextResponse.redirect(
        new URL(`/users/${session.user.id}?error=Account already linked`, request.url),
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("linkAccountUserId", session.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    });
    cookieStore.set("linkAccountProvider", validationResult.data.provider, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    });

    const callbackUrl = `/users/${session.user.id}?linked=true`;
    return await signIn(validationResult.data.provider, {
      callbackUrl,
      redirect: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("[Link Account] Error:", errorMessage);

    const session = await auth();
    const userId = session?.user?.id ?? "";

    if (errorMessage.includes("ACCOUNT_EXISTS")) {
      return NextResponse.redirect(
        new URL(`/users/${userId}?error=Account already linked to another user`, request.url),
      );
    }

    return NextResponse.redirect(
      new URL(`/users/${userId}?error=Failed to link account`, request.url),
    );
  }
}
