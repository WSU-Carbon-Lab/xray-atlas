/**
 * Vercel Cron endpoint that retries due Zenodo version sync jobs.
 *
 * Authenticated by `Authorization: Bearer ${CRON_SECRET}`; refuses every
 * request when `CRON_SECRET` is unset. Does nothing when
 * `ZENODO_ACCESS_TOKEN` is unset.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { runDueZenodoSyncJobs } from "~/server/zenodo/zenodo-sync-queue";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Maximum jobs processed per cron invocation. One job may use the whole
 * `ZENODO_SYNC_BUDGET_MS` (4 min), so a single job keeps the run inside `maxDuration`.
 */
const JOBS_PER_RUN = 1;

function bearerMatches(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

/**
 * Runs due Zenodo sync jobs.
 *
 * @param request - Cron invocation carrying the bearer secret.
 * @returns JSON `{ done, retried, dead }` counts; 401 on a bad or missing secret.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = env.CRON_SECRET?.trim();
  if (!secret || !bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runDueZenodoSyncJobs(new Date(), JOBS_PER_RUN);
  return NextResponse.json(summary);
}
