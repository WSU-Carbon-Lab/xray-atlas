import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { NextResponse } from "next/server";
import { getBaseUrl } from "~/utils/getBaseUrl";
import { z } from "zod";

const verifySchema = z.object({
  credential: z.unknown(),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validationResult = verifySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { credential } = validationResult.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        authenticator: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const baseUrl = getBaseUrl();
    const rpId = new URL(baseUrl).hostname;
    const origin = baseUrl;

    const expectedChallenge = await db.verificationToken.findFirst({
      where: {
        identifier: `passkey-registration-${user.id}`,
        expires: {
          gt: new Date(),
        },
      },
      orderBy: {
        expires: "desc",
      },
    });

    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Registration challenge not found or expired" },
        { status: 400 },
      );
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential as RegistrationResponseJSON,
        expectedChallenge: expectedChallenge.token,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Passkey Verify] Verification failed:", errorMessage);
      return NextResponse.json(
        { error: "Verification failed", details: errorMessage },
        { status: 400 },
      );
    }

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 },
      );
    }

    const { credentialID, counter, credentialDeviceType, credentialBackedUp } =
      registrationInfo;

    const existingAuthenticator = await db.authenticator.findUnique({
      where: { credentialID: Buffer.from(credentialID).toString("base64url") },
    });

    if (existingAuthenticator) {
      return NextResponse.json(
        { error: "Passkey already registered" },
        { status: 409 },
      );
    }

    const credentialIdBase64 = Buffer.from(credentialID).toString("base64url");

    const transports =
      (credential as RegistrationResponseJSON).response.transports?.join(",") ??
      null;

    await db.authenticator.create({
      data: {
        credentialID: credentialIdBase64,
        userId: user.id,
        counter: BigInt(counter),
        credentialDeviceType: credentialDeviceType ?? "singleDevice",
        credentialBackedUp: credentialBackedUp ?? false,
        transports,
      },
    });

    await db.verificationToken.deleteMany({
      where: {
        identifier: `passkey-registration-${user.id}`,
      },
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Passkey Verify] Error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to verify passkey" },
      { status: 500 },
    );
  }
}
