import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import { hasManageUsersCapability } from "~/server/auth/privileged-role";

/**
 * Resolves whether `userId` may add or remove beamline scientist stewards on `instrumentId`.
 *
 * Grants access when the user holds user-administration capability or is already listed as a
 * steward for the instrument.
 */
export async function userMayManageInstrumentStewards(
  db: PrismaClient,
  userId: string,
  instrumentId: string,
): Promise<boolean> {
  if (await hasManageUsersCapability(db, userId)) {
    return true;
  }

  const existing = await db.instrumentsteward.findUnique({
    where: {
      instrumentid_userid: {
        instrumentid: instrumentId,
        userid: userId,
      },
    },
    select: { instrumentid: true },
  });

  return existing != null;
}

/**
 * Throws `FORBIDDEN` when {@link userMayManageInstrumentStewards} is false for the caller.
 */
export async function assertUserMayManageInstrumentStewards(
  db: PrismaClient,
  userId: string,
  instrumentId: string,
): Promise<void> {
  const allowed = await userMayManageInstrumentStewards(db, userId, instrumentId);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a beamline scientist for this instrument or an administrator.",
    });
  }
}
