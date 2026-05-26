import { cookies } from "next/headers";
import type { AssertedAal } from "~/server/auth/aal";

const PASSKEY_ASSURANCE_COOKIE = "xray_passkey_assurance";
const PASSKEY_ENROLLMENT_META_COOKIE = "xray_passkey_enrollment_meta";
const MAX_AGE_SECONDS = 120;

const ceremonyCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

export interface PendingPasskeyAssurance {
  credentialId: string;
  assertedAal: AssertedAal;
}

export interface PendingPasskeyEnrollmentMeta {
  credentialId: string;
  aaguid: string | null;
  attestationFormat: string | null;
  credentialDeviceType: string;
}

function encodePayload<T>(payload: T): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload<T>(
  value: string,
  guard: (parsed: unknown) => parsed is T,
): T | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function setCeremonyCookie(name: string, payload: unknown): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(name, encodePayload(payload), ceremonyCookieOptions);
}

async function consumeCeremonyCookie<T>(
  name: string,
  guard: (parsed: unknown) => parsed is T,
): Promise<T | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(name)?.value;
  if (!raw) {
    return null;
  }
  cookieStore.delete(name);
  return decodePayload(raw, guard);
}

function isPendingPasskeyAssurance(
  parsed: unknown,
): parsed is PendingPasskeyAssurance {
  if (!parsed || typeof parsed !== "object") {
    return false;
  }
  const record = parsed as Record<string, unknown>;
  return (
    typeof record.credentialId === "string" &&
    record.credentialId.length > 0 &&
    typeof record.assertedAal === "string" &&
    (record.assertedAal === "aal2" || record.assertedAal === "aal3")
  );
}

function isPendingPasskeyEnrollmentMeta(
  parsed: unknown,
): parsed is PendingPasskeyEnrollmentMeta {
  if (!parsed || typeof parsed !== "object") {
    return false;
  }
  const record = parsed as Record<string, unknown>;
  return (
    typeof record.credentialId === "string" &&
    record.credentialId.length > 0 &&
    typeof record.credentialDeviceType === "string" &&
    record.credentialDeviceType.length > 0 &&
    (record.aaguid === null || typeof record.aaguid === "string") &&
    (record.attestationFormat === null ||
      typeof record.attestationFormat === "string")
  );
}

/**
 * Stores passkey authentication results for the next database session creation.
 */
export async function setPendingPasskeyAssurance(
  payload: PendingPasskeyAssurance,
): Promise<void> {
  await setCeremonyCookie(PASSKEY_ASSURANCE_COOKIE, payload);
}

/**
 * Reads and clears pending passkey session assurance set during passkey sign-in.
 */
export async function consumePendingPasskeyAssurance(): Promise<PendingPasskeyAssurance | null> {
  return consumeCeremonyCookie(
    PASSKEY_ASSURANCE_COOKIE,
    isPendingPasskeyAssurance,
  );
}

/**
 * Stores attestation metadata from a completed registration ceremony for adapter persistence.
 */
export async function setPendingPasskeyEnrollmentMeta(
  payload: PendingPasskeyEnrollmentMeta,
): Promise<void> {
  await setCeremonyCookie(PASSKEY_ENROLLMENT_META_COOKIE, payload);
}

/**
 * Reads and clears enrollment metadata staged after WebAuthn registration verification.
 */
export async function consumePendingPasskeyEnrollmentMeta(): Promise<PendingPasskeyEnrollmentMeta | null> {
  return consumeCeremonyCookie(
    PASSKEY_ENROLLMENT_META_COOKIE,
    isPendingPasskeyEnrollmentMeta,
  );
}
