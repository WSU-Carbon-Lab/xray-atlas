/**
 * Refreshes Zenodo deposit metadata for Atlas datasets and validates `/d/` citation parity.
 *
 * Run:
 *   bun scripts/refresh-zenodo-dataset.ts --doi=10.5281/zenodo.21299145
 *   bun scripts/refresh-zenodo-dataset.ts --experiment-id=<uuid>
 *   bun scripts/refresh-zenodo-dataset.ts --atlas-id=k7m2xq4n
 *   bun scripts/refresh-zenodo-dataset.ts --all
 *   bun scripts/refresh-zenodo-dataset.ts --all --dry-run
 *
 * Requires `DATABASE_URL` and `ZENODO_ACCESS_TOKEN` (unless `--dry-run` / `--validate-only`).
 */

import { db } from "~/server/db";
import { normalizeDoi } from "~/lib/doi";
import { normalizeAtlasDatasetId } from "~/lib/atlas-dataset-id";
import { ensureAtlasDatasetId } from "~/server/nexafs/atlas-dataset-id";
import {
  createZenodoClient,
  isZenodoMintingEnabled,
  loadZenodoMetadataSnapshot,
  buildZenodoDepositMetadata,
  syncZenodoDepositForExperiment,
  type ZenodoSyncMode,
} from "~/server/zenodo";
import { validateZenodoDatasetMetadata } from "~/server/zenodo/validate-zenodo-dataset-metadata";

function flagValue(name: string): string | null {
  const flag = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return null;
  const value = flag.slice(name.length + 1).trim();
  return value.length > 0 ? value : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function resolveExperimentIds(): Promise<string[]> {
  if (hasFlag("--all")) {
    const rows = await db.experimentzenododeposits.findMany({
      where: { state: "published", doi: { not: null } },
      select: { experimentid: true },
      orderBy: { updatedat: "asc" },
    });
    return rows.map((row) => row.experimentid);
  }

  const experimentId = flagValue("--experiment-id");
  if (experimentId) return [experimentId];

  const atlasRaw = flagValue("--atlas-id");
  if (atlasRaw) {
    const atlasId = normalizeAtlasDatasetId(atlasRaw);
    if (!atlasId) {
      throw new Error(`Invalid --atlas-id=${atlasRaw}`);
    }
    const experiment = await db.experiments.findFirst({
      where: { atlasdatasetid: atlasId },
      select: { id: true },
    });
    if (!experiment) {
      throw new Error(`No experiment for atlas id ${atlasId}`);
    }
    return [experiment.id];
  }

  const doiRaw = flagValue("--doi");
  if (!doiRaw) {
    throw new Error(
      "Provide --doi=…, --experiment-id=…, --atlas-id=…, or --all",
    );
  }
  const doi = normalizeDoi(doiRaw);
  if (!doi) {
    throw new Error(`Invalid DOI: ${doiRaw}`);
  }

  const deposit = await db.experimentzenododeposits.findFirst({
    where: {
      OR: [{ doi }, { doi: { endsWith: doi.split("/").pop() ?? doi } }],
    },
    select: { experimentid: true },
  });
  if (deposit) return [deposit.experimentid];

  const metrics = await db.experimentmetrics.findFirst({
    where: { datasetdoi: doi },
    select: { experimentid: true },
  });
  if (metrics) return [metrics.experimentid];

  throw new Error(`No Atlas experiment found for DOI ${doi}`);
}

async function validateOne(experimentId: string): Promise<{
  experimentId: string;
  atlasDatasetId: string | null;
  doi: string | null;
  issues: ReturnType<typeof validateZenodoDatasetMetadata>;
}> {
  const deposit = await db.experimentzenododeposits.findUnique({
    where: { experimentid: experimentId },
    select: {
      doi: true,
      zenododepositionid: true,
      state: true,
    },
  });
  const atlasDatasetId = await ensureAtlasDatasetId(db, experimentId);
  const snapshot = await loadZenodoMetadataSnapshot(db, experimentId);
  if (!snapshot) {
    return {
      experimentId,
      atlasDatasetId,
      doi: deposit?.doi ?? null,
      issues: [
        {
          code: "missing_atlas_dataset_id",
          message: `Experiment snapshot not found for ${experimentId}`,
        },
      ],
    };
  }
  const expected = buildZenodoDepositMetadata(snapshot);

  let remoteDescription = expected.description;
  let remoteTitle = expected.title;
  let remoteUploadType = expected.upload_type;
  let remoteRelated = expected.related_identifiers;
  let remoteDoi = deposit?.doi ?? null;

  if (deposit?.zenododepositionid != null && isZenodoMintingEnabled()) {
    try {
      const client = createZenodoClient();
      const remote = await client.getDeposition(deposit.zenododepositionid);
      const meta = remote.metadata;
      if (meta) {
        remoteDescription = meta.description ?? remoteDescription;
        remoteTitle = meta.title ?? remoteTitle;
        remoteUploadType = meta.upload_type ?? remoteUploadType;
        remoteRelated = meta.related_identifiers ?? remoteRelated;
      }
      remoteDoi = normalizeDoi(remote.doi) ?? remoteDoi;
    } catch (error) {
      console.warn(
        "[zenodo-refresh] remote fetch failed; validating local snapshot",
        {
          experimentId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  const issues = validateZenodoDatasetMetadata({
    atlasDatasetId,
    expectedDoi: deposit?.doi ?? null,
    metadata: {
      title: remoteTitle,
      description: remoteDescription,
      upload_type: remoteUploadType,
      related_identifiers: remoteRelated,
      doi: remoteDoi,
    },
  });

  return { experimentId, atlasDatasetId, doi: remoteDoi, issues };
}

async function main(): Promise<void> {
  const dryRun = hasFlag("--dry-run");
  const validateOnly = hasFlag("--validate-only");
  const modeRaw = flagValue("--mode") ?? "metadata";
  if (modeRaw !== "metadata" && modeRaw !== "files") {
    throw new Error(`Invalid --mode=${modeRaw} (expected metadata|files)`);
  }
  const mode: ZenodoSyncMode = modeRaw;

  if (!dryRun && !validateOnly && !isZenodoMintingEnabled()) {
    console.error(
      "Zenodo minting disabled: set ZENODO_ACCESS_TOKEN before refreshing.",
    );
    process.exitCode = 1;
    return;
  }

  const experimentIds = await resolveExperimentIds();
  console.info("[zenodo-refresh] targets", {
    count: experimentIds.length,
    dryRun,
    validateOnly,
    mode,
  });

  let failed = 0;
  for (const experimentId of experimentIds) {
    const before = await validateOne(experimentId);
    console.info("[zenodo-refresh] before", {
      experimentId,
      atlasDatasetId: before.atlasDatasetId,
      doi: before.doi,
      issueCount: before.issues.length,
      issues: before.issues,
    });

    if (validateOnly || dryRun) {
      if (before.issues.length > 0) failed += 1;
      continue;
    }

    const result = await syncZenodoDepositForExperiment(db, experimentId, {
      mode,
    });
    console.info("[zenodo-refresh] sync", { experimentId, result });

    const after = await validateOne(experimentId);
    console.info("[zenodo-refresh] after", {
      experimentId,
      atlasDatasetId: after.atlasDatasetId,
      doi: after.doi,
      issueCount: after.issues.length,
      issues: after.issues,
    });
    if (after.issues.length > 0 || result.state === "failed") {
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`[zenodo-refresh] ${failed} dataset(s) failed validation`);
    process.exitCode = 1;
  } else {
    console.info("[zenodo-refresh] all datasets passed validation");
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
