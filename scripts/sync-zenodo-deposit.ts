/**
 * Forces a Zenodo metadata (or files) sync for one published Atlas experiment.
 *
 * Run:
 *   bun scripts/sync-zenodo-deposit.ts --doi=10.5281/zenodo.21299145
 *   bun scripts/sync-zenodo-deposit.ts --experiment-id=<uuid>
 *   bun scripts/sync-zenodo-deposit.ts --doi=10.5281/zenodo.21299145 --mode=files
 *
 * Requires `DATABASE_URL` and `ZENODO_ACCESS_TOKEN`.
 */

import { db } from "~/server/db";
import { normalizeDoi } from "~/lib/doi";
import {
  isZenodoMintingEnabled,
  syncZenodoDepositForExperiment,
  type ZenodoSyncMode,
} from "~/server/zenodo";

function flagValue(name: string): string | null {
  const flag = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return null;
  const value = flag.slice(name.length + 1).trim();
  return value.length > 0 ? value : null;
}

async function resolveExperimentId(): Promise<string> {
  const experimentId = flagValue("--experiment-id");
  if (experimentId) return experimentId;

  const doiRaw = flagValue("--doi");
  if (!doiRaw) {
    throw new Error("Provide --doi=… or --experiment-id=…");
  }
  const doi = normalizeDoi(doiRaw);
  if (!doi) {
    throw new Error(`Invalid DOI: ${doiRaw}`);
  }

  const deposit = await db.experimentzenododeposits.findFirst({
    where: {
      OR: [{ doi }, { doi: { endsWith: doi.split("/").pop() ?? doi } }],
    },
    select: { experimentid: true, doi: true, recordurl: true, state: true },
  });
  if (deposit) {
    console.info("[zenodo-sync] matched deposit", deposit);
    return deposit.experimentid;
  }

  const metrics = await db.experimentmetrics.findFirst({
    where: { datasetdoi: doi },
    select: { experimentid: true, datasetdoi: true },
  });
  if (metrics) {
    console.info("[zenodo-sync] matched experiment_metrics", metrics);
    return metrics.experimentid;
  }

  throw new Error(`No Atlas experiment found for DOI ${doi}`);
}

async function main(): Promise<void> {
  if (!isZenodoMintingEnabled()) {
    console.error(
      "Zenodo minting disabled: set ZENODO_ACCESS_TOKEN before syncing.",
    );
    process.exitCode = 1;
    return;
  }

  const modeRaw = flagValue("--mode") ?? "metadata";
  if (modeRaw !== "metadata" && modeRaw !== "files") {
    throw new Error(`Invalid --mode=${modeRaw} (expected metadata|files)`);
  }
  const mode: ZenodoSyncMode = modeRaw;

  const experimentId = await resolveExperimentId();
  console.info("[zenodo-sync] starting", { experimentId, mode });
  const result = await syncZenodoDepositForExperiment(db, experimentId, {
    mode,
  });
  console.info("[zenodo-sync] result", result);
  if (result.state === "failed") {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
