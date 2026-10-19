/**
 * Vercel Cron endpoint that closes stale auxiliary-data upload sessions.
 *
 * Sessions still open 30 minutes after opening are closed on behalf of their opener, applying
 * the recorded minor bump once. Authenticated by `Authorization: Bearer ${CRON_SECRET}`;
 * refuses every request when `CRON_SECRET` is unset. Vercel Hobby allows one cron run per day,
 * so `vercel.json` schedules this route at 16:00 UTC.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { closeStaleAuxUploadSessions } from "~/server/nexafs/aux-upload-session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Maximum sessions closed per cron invocation. */
const SESSIONS_PER_RUN = 25;

function bearerMatches(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

/**
 * Closes stale upload sessions.
 *
 * @param request - Cron invocation carrying the bearer secret.
 * @returns JSON `{ bumped, closedEmpty, failed }` counts; 401 on a bad or missing secret.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = env.CRON_SECRET?.trim();
  if (!secret || !bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await closeStaleAuxUploadSessions(
    db,
    new Date(),
    SESSIONS_PER_RUN,
  );
  return NextResponse.json(summary);
}
