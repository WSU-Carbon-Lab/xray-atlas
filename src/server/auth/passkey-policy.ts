import type { PrismaClient } from "~/prisma/client";
import {
  getUserSessionCapabilities,
  type UserSessionCapabilities,
} from "~/server/auth/privileged-role";
import {
  isAal3Eligible,
  type AuthenticatorAalFields,
} from "~/server/auth/aal";
import { countActivePasskeys, userHasActivePasskey } from "~/server/auth/passkey-enrollment";

type PasskeyPolicyDb = Pick<PrismaClient, "authenticator" | "user">;

/**
 * Returns whether the user holds a role that requires AAL3-capable hardware passkeys.
 */
export async function requiresAal3ForUser(
  db: Pick<PrismaClient, "userAppRole">,
  userId: string,
): Promise<boolean> {
  const caps = await getUserSessionCapabilities(db as PrismaClient, userId);
  return requiresAal3FromCapabilities(caps);
}

/**
 * Maps session capability flags to the AAL3 enrollment requirement.
 */
export function requiresAal3FromCapabilities(
  caps: Pick<UserSessionCapabilities, "canManageUsers" | "canAccessLabs">,
): boolean {
  return caps.canManageUsers || caps.canAccessLabs;
}

/**
 * Returns whether the user has at least one active passkey that satisfies AAL3 metadata rules.
 */
export async function userHasAal3EligiblePasskey(
  db: PasskeyPolicyDb,
  userId: string,
): Promise<boolean> {
  const rows = await db.authenticator.findMany({
    where: { userId, revokedAt: null },
    select: {
      aaguid: true,
      attestationFormat: true,
      credentialDeviceType: true,
    },
  });
  return rows.some((row) => isAal3Eligible(row));
}

/**
 * Throws when a privileged user enrolls a passkey that does not meet AAL3 metadata requirements.
 */
export function assertAal3EligibleEnrollment(
  userId: string,
  requiresAal3: boolean,
  authenticator: AuthenticatorAalFields,
): void {
  if (!requiresAal3) {
    return;
  }
  if (!isAal3Eligible(authenticator)) {
    throw new Error(
      "Privileged roles require a hardware security key with direct attestation. Use a cross-platform FIDO2 key, then try again.",
    );
  }
}

/**
 * Throws when a privileged role assignment would leave the user without an AAL3-eligible passkey.
 */
export async function assertAal3PasskeyBeforePrivilegedRole(
  db: PasskeyPolicyDb,
  userId: string,
  nextRequiresAal3: boolean,
): Promise<void> {
  if (!nextRequiresAal3) {
    return;
  }
  const hasPasskey = await userHasActivePasskey(db, userId);
  if (!hasPasskey) {
    throw new Error(
      "Assigning this role requires at least one enrolled passkey. The user must register a passkey before receiving privileged access.",
    );
  }
  const hasAal3 = await userHasAal3EligiblePasskey(db, userId);
  if (!hasAal3) {
    throw new Error(
      "Assigning this role requires a hardware security key passkey with direct attestation. Ask the user to enroll a cross-platform FIDO2 key from their profile.",
    );
  }
}

export interface PasskeyEnrollmentStatus {
  enrolled: boolean;
  activeCount: number;
  mfaEnforcedAt: Date | null;
  requiresAal3Hardware: boolean;
  hasAal3EligiblePasskey: boolean;
}

/**
 * Summarizes passkey enrollment for profile UI and client-side gates.
 */
export async function getPasskeyEnrollmentStatus(
  db: PasskeyPolicyDb & Pick<PrismaClient, "userAppRole">,
  userId: string,
): Promise<PasskeyEnrollmentStatus> {
  const [activeCount, userRow, requiresAal3, hasAal3] = await Promise.all([
    countActivePasskeys(db, userId),
    db.user.findUnique({
      where: { id: userId },
      select: { mfaEnforcedAt: true },
    }),
    requiresAal3ForUser(db, userId),
    userHasAal3EligiblePasskey(db, userId),
  ]);

  return {
    enrolled: activeCount > 0,
    activeCount,
    mfaEnforcedAt: userRow?.mfaEnforcedAt ?? null,
    requiresAal3Hardware: requiresAal3,
    hasAal3EligiblePasskey: hasAal3,
  };
}
