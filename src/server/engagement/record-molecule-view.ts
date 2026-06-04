import type { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";

type Db = typeof db | Prisma.TransactionClient;

export type RecordMoleculeViewSkipReason =
  | "unauthenticated"
  | "throttled"
  | "not_found"
  | "duplicate";

export type RecordMoleculeViewResult = {
  recorded: boolean;
  skipReason?: RecordMoleculeViewSkipReason;
};

const TRACK_VIEW_THROTTLE_WINDOW_MS = 60_000;
const TRACK_VIEW_MAX_PER_WINDOW = 5;

const trackViewThrottle = new Map<
  string,
  { count: number; windowEnd: number }
>();

/**
 * Rate-limits view writes per authenticated user id within a short sliding window.
 */
export function checkAuthenticatedTrackViewThrottle(userId: string): boolean {
  const now = Date.now();
  const entry = trackViewThrottle.get(userId);
  if (!entry || now > entry.windowEnd) {
    trackViewThrottle.set(userId, {
      count: 1,
      windowEnd: now + TRACK_VIEW_THROTTLE_WINDOW_MS,
    });
    return true;
  }
  if (entry.count >= TRACK_VIEW_MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

/**
 * Records one molecule view for a signed-in user when the molecule exists and
 * that user has not already been counted for the molecule.
 *
 * Anonymous callers must not increment aggregates: pass `userId: null` and the
 * function returns `{ recorded: false, skipReason: "unauthenticated" }` without
 * writing rows.
 */
export async function recordMoleculeView(
  prisma: Db,
  params: { moleculeId: string; userId: string | null },
): Promise<RecordMoleculeViewResult> {
  const { moleculeId, userId } = params;
  if (!userId) {
    return { recorded: false, skipReason: "unauthenticated" };
  }
  if (!checkAuthenticatedTrackViewThrottle(userId)) {
    return { recorded: false, skipReason: "throttled" };
  }
  const molecule = await prisma.molecules.findUnique({
    where: { id: moleculeId },
    select: { id: true },
  });
  if (!molecule) {
    return { recorded: false, skipReason: "not_found" };
  }
  const existingView = await prisma.moleculeviews.findFirst({
    where: {
      moleculeid: moleculeId,
      userid: userId,
    },
    select: { id: true },
  });
  if (existingView) {
    return { recorded: false, skipReason: "duplicate" };
  }
  await prisma.moleculeviews.create({
    data: {
      moleculeid: moleculeId,
      userid: userId,
      sessionid: null,
    },
  });
  await prisma.molecules.update({
    where: { id: moleculeId },
    data: { viewcount: { increment: 1 } },
  });
  return { recorded: true };
}
