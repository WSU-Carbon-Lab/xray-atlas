/**
 * Backfills Zenodo dataset DOI mints for every NEXAFS experiment that does not
 * yet have a published deposit / `experiment_metrics.dataset_doi`.
 *
 * Run (quiet Prisma query logs):
 *   NODE_ENV=production bun scripts/backfill-zenodo-dataset-dois.ts
 *
 * Optional flags:
 *   --limit=5             Max experiments this run (default 5; use batches)
 *   --delay-ms=2000       Pause between mints (default 2000; helps avoid 429)
 *   --timeout-ms=600000   Per-mint overall wall budget (default 10 minutes)
 *   --dry-run             List candidates without minting
 *
 * Idempotent: `mintExperimentDatasetDoi` short-circuits when already published.
 * Requires `DATABASE_URL` and `ZENODO_ACCESS_TOKEN`. When the token is unset the
 * script exits without minting (same disabled behavior as the app).
 *
 * Env expectations:
 * - Production community: https://zenodo.org/communities/xrayatlas (`ZENODO_COMMUNITY_ID=xrayatlas`)
 * - Sandbox: separate community + PAT on https://sandbox.zenodo.org with `ZENODO_USE_SANDBOX=true`
 */

import { db } from "~/server/db";
import {
  isZenodoMintingEnabled,
  mintExperimentDatasetDoi,
} from "~/server/zenodo";

function parsePositiveIntFlag(name: string, fallback: number): number {
  const flag = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return fallback;
  const value = Number(flag.slice(name.length + 1));
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`Invalid ${name} value`);
  }
  return Math.floor(value);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function logProgress(message: string, data?: Record<string, unknown>): void {
  const stamp = new Date().toISOString();
  if (data) {
    console.info(`[zenodo-backfill ${stamp}] ${message}`, data);
  } else {
    console.info(`[zenodo-backfill ${stamp}] ${message}`);
  }
}

async function listExperimentsMissingDatasetDoi(
  limit: number,
): Promise<Array<{ id: string }>> {
  return db.experiments.findMany({
    where: {
      AND: [
        {
          OR: [
            { experimentmetrics: { is: null } },
            { experimentmetrics: { datasetdoi: null } },
            { experimentmetrics: { hasdatasetdoi: false } },
          ],
        },
        {
          OR: [
            { experimentzenododeposit: { is: null } },
            { experimentzenododeposit: { isNot: { state: "published" } } },
          ],
        },
      ],
    },
    orderBy: { createdat: "asc" },
    take: limit,
    select: { id: true },
  });
}

async function main(): Promise<void> {
  const dryRun = hasFlag("--dry-run");
  const limit = parsePositiveIntFlag("--limit", 5);
  const delayMs = parsePositiveIntFlag("--delay-ms", 2000);
  const timeoutMs = parsePositiveIntFlag("--timeout-ms", 600_000);

  if (!dryRun && !isZenodoMintingEnabled()) {
    console.error(
      "Zenodo minting disabled: set ZENODO_ACCESS_TOKEN (and ZENODO_COMMUNITY_ID=xrayatlas for production).",
    );
    process.exitCode = 1;
    return;
  }

  const candidates = await listExperimentsMissingDatasetDoi(limit);
  logProgress("batch start", {
    candidates: candidates.length,
    limit,
    delayMs,
    timeoutMs,
    dryRun,
  });

  if (dryRun) {
    for (const row of candidates) {
      logProgress("would mint", { experimentId: row.id });
    }
    logProgress("dry-run done", { candidates: candidates.length });
    return;
  }

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    if (!row) continue;

    logProgress("mint begin", {
      experimentId: row.id,
      index: index + 1,
      of: candidates.length,
    });
    const started = Date.now();
    const result = await mintExperimentDatasetDoi(db, row.id, {
      overallTimeoutMs: timeoutMs,
    });
    const elapsedMs = Date.now() - started;

    switch (result.state) {
      case "published":
        published += 1;
        logProgress("published", {
          experimentId: row.id,
          doi: result.doi,
          elapsedMs,
          index: index + 1,
          of: candidates.length,
        });
        break;
      case "disabled":
        skipped += 1;
        logProgress("skipped (disabled)", { experimentId: row.id, elapsedMs });
        break;
      case "pending":
      case "depositing":
        skipped += 1;
        logProgress("incomplete", {
          experimentId: row.id,
          state: result.state,
          error: result.error,
          elapsedMs,
        });
        break;
      case "failed":
        failed += 1;
        logProgress("failed", {
          experimentId: row.id,
          error: result.error,
          elapsedMs,
        });
        break;
      default: {
        const _exhaustive: never = result.state;
        failed += 1;
        logProgress("unexpected state", {
          experimentId: row.id,
          state: _exhaustive,
          elapsedMs,
        });
        break;
      }
    }

    if (index + 1 < candidates.length && delayMs > 0) {
      logProgress("delay before next", { delayMs });
      await sleep(delayMs);
    }
  }

  logProgress("batch done", {
    attempted: candidates.length,
    published,
    skipped,
    failed,
  });

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error("[zenodo-backfill] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
