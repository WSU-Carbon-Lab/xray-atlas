/**
 * Retries failed Zenodo dataset DOI mints for experiments with `state = failed`
 * and `attempt_count` below the configured maximum.
 *
 * Specialized one-off ops script (not CI). Day-to-day citation drift uses
 * `bun run zenodo:audit` / `zenodo:apply` / `zenodo:refresh`.
 *
 * Run: `bun run zenodo:retry` or `bun scripts/retry-zenodo-dataset-mints.ts`
 * Optional: `--max-attempts=5` (default 5), `--limit=20` (default 20)
 *
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

async function main(): Promise<void> {
  if (!isZenodoMintingEnabled()) {
    console.error(
      "Zenodo minting disabled: set ZENODO_ACCESS_TOKEN (and ZENODO_COMMUNITY_ID=xrayatlas for production).",
    );
    process.exitCode = 1;
    return;
  }

  const maxAttempts = parsePositiveIntFlag("--max-attempts", 5);
  const limit = parsePositiveIntFlag("--limit", 20);

  const failed = await db.experimentzenododeposits.findMany({
    where: {
      state: "failed",
      attemptcount: { lt: maxAttempts },
    },
    orderBy: [{ lastattemptat: "asc" }, { experimentid: "asc" }],
    take: limit,
    select: {
      experimentid: true,
      attemptcount: true,
      errormessage: true,
    },
  });

  console.info(
    `[zenodo-retry] retrying ${failed.length} failed deposit(s) (maxAttempts=${maxAttempts}, limit=${limit})`,
  );

  let published = 0;
  let stillFailed = 0;

  for (const row of failed) {
    const result = await mintExperimentDatasetDoi(db, row.experimentid);
    if (result.state === "published") {
      published += 1;
      console.info("[zenodo-retry] published", {
        experimentId: row.experimentid,
        doi: result.doi,
      });
    } else {
      stillFailed += 1;
      console.error("[zenodo-retry] still failed", {
        experimentId: row.experimentid,
        state: result.state,
        error: result.error,
      });
    }
  }

  console.info("[zenodo-retry] done", {
    attempted: failed.length,
    published,
    stillFailed,
  });

  if (stillFailed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error("[zenodo-retry] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
