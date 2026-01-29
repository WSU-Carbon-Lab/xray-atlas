import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { NextResponse } from "next/server";
import { getBaseUrl } from "~/utils/getBaseUrl";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        authenticator: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    const baseUrl = getBaseUrl();
    const rpId = new URL(baseUrl).hostname;
    const rpName = "X-ray Atlas";

    const excludeCredentials = user.authenticator.map((auth) => ({
      id: Buffer.from(auth.credentialID, "base64url"),
      type: "public-key" as const,
      transports: auth.transports
        ? (auth.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userName: user.email ?? user.id,
      userDisplayName: user.name ?? user.email ?? "User",
      userID: user.id,
      timeout: 60000,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: "cross-platform",
        userVerification: "preferred",
        requireResidentKey: false,
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    await db.verificationToken.create({
      data: {
        identifier: `passkey-registration-${user.id}`,
        token: options.challenge,
        expires: new Date(Date.now() + 60000),
      },
    });

    return NextResponse.json(options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Passkey Register] Error generating options:", errorMessage);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 },
    );
  }
}
