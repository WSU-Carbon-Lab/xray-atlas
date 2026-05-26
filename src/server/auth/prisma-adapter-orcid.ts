import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterAuthenticator } from "@auth/core/adapters";
import type { PrismaClient } from "~/prisma/client";
import { parseOrcidForStorage } from "~/lib/orcid";
import { emitAuditEvent } from "~/server/audit";
import {
  enrollmentMeetsAal3HardwarePolicy,
  requiresAal3ForUser,
} from "~/server/auth/passkey-policy";
import {
  consumePendingPasskeyAssurance,
  consumePendingPasskeyEnrollmentMeta,
  setPendingPasskeyAssurance,
} from "~/server/auth/passkey-ceremony-bridge";
import { markPasskeyEnrollmentComplete } from "~/server/auth/passkey-enrollment";
import {
  resolveAssertedAalForCredential,
  upsertOrcidSessionAssurance,
  upsertWebAuthnSessionAssurance,
} from "~/server/auth/session-assurance";
import { webAuthnUserNameFromOrcidUserId } from "~/server/auth/webauthn-relaying-party";

function toAdapterAuthenticator(row: {
  credentialID: string;
  providerAccountId: string;
  credentialPublicKey: string;
  counter: bigint;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string | null;
  userId: string | null;
}): AdapterAuthenticator {
  if (!row.userId) {
    throw new Error("AUTHENTICATOR_ROW_MISSING_USER_ID");
  }

  return {
    credentialID: row.credentialID,
    providerAccountId: row.providerAccountId,
    credentialPublicKey: row.credentialPublicKey,
    counter: Number(row.counter),
    credentialDeviceType: row.credentialDeviceType,
    credentialBackedUp: row.credentialBackedUp,
    transports: row.transports,
    userId: row.userId,
  };
}

/**
 * Prisma adapter that sets `user.id` to the bare ORCID iD on first ORCID sign-in.
 * GitHub-only user creation is blocked in the NextAuth `signIn` callback instead.
 */
export function PrismaAdapterOrcid(db: PrismaClient) {
  const base = PrismaAdapter(db);

  return {
    ...base,
    getSessionAndUser: async (sessionToken: string) => {
      if (!base.getSessionAndUser) {
        return null;
      }
      const sessionAndUser = await base.getSessionAndUser(sessionToken);
      if (!sessionAndUser) {
        return null;
      }
      return {
        ...sessionAndUser,
        user: {
          ...sessionAndUser.user,
          email: webAuthnUserNameFromOrcidUserId(sessionAndUser.user.id),
        },
      };
    },
    createUser: async (data: {
      id?: string;
      name?: string | null;
      email?: string | null;
      emailVerified?: Date | null;
      image?: string | null;
    }) => {
      let id = data.id;
      if (id) {
        try {
          id = parseOrcidForStorage(id);
        } catch {
          throw new Error("ORCID_SIGN_IN_INVALID_ID");
        }
      } else {
        throw new Error("ORCID_SIGN_IN_MISSING_ID");
      }

      const created = await db.user.create({
        data: {
          id,
          name: data.name ?? null,
          image: data.image ?? null,
        },
      });

      await emitAuditEvent({
        eventType: "user.create",
        eventScope: "auth.orcid",
        actorUserId: created.id,
        subjectUserId: created.id,
        failSilent: true,
      });

      return {
        id: created.id,
        name: created.name,
        email: webAuthnUserNameFromOrcidUserId(created.id),
        emailVerified: data.emailVerified ?? null,
        image: created.image,
      };
    },
    createSession: async (data: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }) => {
      if (!data.userId) {
        throw new Error("SESSION_CREATE_MISSING_USER_ID");
      }
      const session = await db.session.create({
        data: {
          sessionToken: data.sessionToken,
          userId: data.userId,
          expires: data.expires,
        },
      });

      await emitAuditEvent({
        eventType: "session.create",
        eventScope: "auth.session",
        actorUserId: data.userId,
        subjectUserId: data.userId,
        requestMeta: { sessionId: session.id },
        failSilent: true,
      });

      try {
        const pendingPasskey = await consumePendingPasskeyAssurance();
        if (pendingPasskey) {
          await upsertWebAuthnSessionAssurance(db, {
            sessionId: session.id,
            credentialId: pendingPasskey.credentialId,
            assertedAal: pendingPasskey.assertedAal,
          });
        } else {
          await upsertOrcidSessionAssurance(db, {
            sessionId: session.id,
            userId: data.userId,
          });
        }
      } catch (err) {
        console.error(
          "[PrismaAdapterOrcid] session_assurance upsert failed; sign-in continues.",
          err,
        );
      }

      return {
        sessionToken: session.sessionToken,
        userId: data.userId,
        expires: session.expires,
      };
    },
    createAuthenticator: async (
      authenticator: AdapterAuthenticator,
    ): Promise<AdapterAuthenticator> => {
      const enrollmentMeta = await consumePendingPasskeyEnrollmentMeta();
      const aaguid =
        enrollmentMeta?.credentialId === authenticator.credentialID
          ? enrollmentMeta.aaguid
          : null;
      const attestationFormat =
        enrollmentMeta?.credentialId === authenticator.credentialID
          ? enrollmentMeta.attestationFormat
          : null;
      const credentialDeviceType =
        enrollmentMeta?.credentialId === authenticator.credentialID
          ? enrollmentMeta.credentialDeviceType
          : authenticator.credentialDeviceType;

      const aalFields = {
        aaguid,
        attestationFormat,
        credentialDeviceType,
      };
      const requiresAal3Hardware = await requiresAal3ForUser(
        db,
        authenticator.userId,
      );
      const enrollmentAal3Eligible = enrollmentMeetsAal3HardwarePolicy(aalFields);

      const created = await db.authenticator.create({
        data: {
          credentialID: authenticator.credentialID,
          providerAccountId: authenticator.providerAccountId,
          credentialPublicKey: authenticator.credentialPublicKey,
          counter: authenticator.counter,
          credentialDeviceType,
          credentialBackedUp: authenticator.credentialBackedUp,
          transports: authenticator.transports ?? null,
          userId: authenticator.userId,
          aaguid,
          attestationFormat,
        },
      });

      await markPasskeyEnrollmentComplete(db, authenticator.userId);

      await emitAuditEvent({
        eventType: "authenticator.enroll",
        eventScope: "auth.webauthn",
        actorUserId: authenticator.userId,
        subjectUserId: authenticator.userId,
        payload: {
          credentialID: authenticator.credentialID,
          credentialDeviceType,
          aaguid,
          attestationFormat,
          requiresAal3Hardware,
          enrollmentAal3Eligible,
          privilegedHardwareKeyPending:
            requiresAal3Hardware && !enrollmentAal3Eligible,
        },
        failSilent: true,
      });

      if (!created.userId) {
        throw new Error("AUTHENTICATOR_CREATE_MISSING_USER_ID");
      }

      return toAdapterAuthenticator(created);
    },
    updateAuthenticatorCounter: async (
      credentialID: string,
      counter: number,
    ): Promise<AdapterAuthenticator> => {
      const updated = await db.authenticator.update({
        where: { credentialID },
        data: {
          counter,
          lastUsedAt: new Date(),
        },
      });

      if (!updated.userId) {
        throw new Error("AUTHENTICATOR_UPDATE_MISSING_USER_ID");
      }

      const assertedAal = await resolveAssertedAalForCredential(db, credentialID);
      await setPendingPasskeyAssurance({
        credentialId: credentialID,
        assertedAal,
      });

      await emitAuditEvent({
        eventType: "authenticator.use",
        eventScope: "auth.webauthn",
        actorUserId: updated.userId,
        subjectUserId: updated.userId,
        payload: {
          credentialID,
          assertedAal,
        },
        failSilent: true,
      });

      return toAdapterAuthenticator(updated);
    },
    getAuthenticator: async (credentialID: string) => {
      const row = await db.authenticator.findFirst({
        where: { credentialID, revokedAt: null },
      });
      if (!row?.userId) {
        return null;
      }
      return toAdapterAuthenticator(row);
    },
    listAuthenticatorsByUserId: async (userId: string) => {
      const rows = await db.authenticator.findMany({
        where: { userId, revokedAt: null },
      });
      return rows
        .filter((row): row is typeof row & { userId: string } => row.userId !== null)
        .map((row) => toAdapterAuthenticator(row));
    },
  };
}
