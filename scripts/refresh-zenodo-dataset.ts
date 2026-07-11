/**
 * Refreshes Zenodo deposit metadata for Atlas datasets and validates `/d/` citation parity.
 *
 * Primary ops entrypoint for Zenodo deposit audit and repair.
 *
 * Run:
 *   bun scripts/refresh-zenodo-dataset.ts --doi=10.5281/zenodo.21299145
 *   bun scripts/refresh-zenodo-dataset.ts --experiment-id=<uuid>
 *   bun scripts/refresh-zenodo-dataset.ts --atlas-id=k7m2xq4n
 *   bun scripts/refresh-zenodo-dataset.ts --all --validate-only --json
 *   bun scripts/refresh-zenodo-dataset.ts --all --apply-failing
 *   bun scripts/refresh-zenodo-dataset.ts --all --dry-run
 *
 * Package scripts:
 *   bun run zenodo:audit   (validate-only JSON report)
 *   bun run zenodo:apply   (sync deposits that fail audit)
 *   bun run zenodo:refresh (full refresh helper)
 *
 * Requires `DATABASE_URL`. Apply / live refresh also need `ZENODO_ACCESS_TOKEN`.
 * Validate-only can run with DB alone (remote checks skipped when token unset).
 */

import { db } from "~/server/db";
import { normalizeDoi } from "~/lib/doi";
import { normalizeAtlasDatasetId } from "~/lib/atlas-dataset-id";
import {
  ensureAtlasDatasetId,
  readAtlasDatasetId,
} from "~/server/nexafs/atlas-dataset-id";
import {
  createZenodoClient,
  isZenodoMintingEnabled,
  loadZenodoMetadataSnapshot,
  buildZenodoDepositMetadata,
  syncZenodoDepositForExperiment,
  type ZenodoSyncMode,
} from "~/server/zenodo";
import { validateZenodoDatasetMetadata } from "~/server/zenodo/validate-zenodo-dataset-metadata";
import {
  formatZenodoCitationAuditMarkdown,
  type ZenodoCitationAuditEntry,
  type ZenodoCitationAuditReport,
} from "~/server/zenodo/zenodo-citation-audit-report";

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

async function validateOne(
  experimentId: string,
  options: { assignMissingAtlasId: boolean },
): Promise<ZenodoCitationAuditEntry> {
  const deposit = await db.experimentzenododeposits.findUnique({
    where: { experimentid: experimentId },
    select: {
      doi: true,
      zenododepositionid: true,
      state: true,
    },
  });
  const atlasDatasetId = options.assignMissingAtlasId
    ? await ensureAtlasDatasetId(db, experimentId)
    : await readAtlasDatasetId(db, experimentId);
  const snapshot = await loadZenodoMetadataSnapshot(db, experimentId);
  if (!snapshot) {
    return {
      experimentId,
      atlasDatasetId,
      doi: deposit?.doi ?? null,
      zenodoDepositionId: deposit?.zenododepositionid ?? null,
      issues: [
        {
          code: "missing_atlas_dataset_id",
          message: `Experiment snapshot not found for ${experimentId}`,
        },
      ],
      plannedAction: "none",
      expectedTitle: null,
      remoteTitle: null,
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

  if (
    expected.title.trim() &&
    remoteTitle.trim() &&
    expected.title.trim() !== remoteTitle.trim()
  ) {
    issues.push({
      code: "title_drift",
      message: `Title drift: Zenodo has "${remoteTitle.trim()}" but Atlas expects "${expected.title.trim()}"`,
    });
  }

  return {
    experimentId,
    atlasDatasetId,
    doi: remoteDoi,
    zenodoDepositionId: deposit?.zenododepositionid ?? null,
    issues,
    plannedAction: issues.length > 0 ? "metadata_sync" : "none",
    expectedTitle: expected.title,
    remoteTitle,
  };
}

async function buildAuditReport(
  experimentIds: string[],
  assignMissingAtlasId: boolean,
): Promise<ZenodoCitationAuditReport> {
  const requiredUpdates: ZenodoCitationAuditEntry[] = [];
  const passed: ZenodoCitationAuditEntry[] = [];
  for (const experimentId of experimentIds) {
    const entry = await validateOne(experimentId, { assignMissingAtlasId });
    if (entry.issues.length > 0) requiredUpdates.push(entry);
    else passed.push(entry);
  }
  return {
    generatedAt: new Date().toISOString(),
    mode: "audit",
    totalPublished: experimentIds.length,
    requiredUpdateCount: requiredUpdates.length,
    requiredUpdates,
    passed,
  };
}

async function main(): Promise<void> {
  const dryRun = hasFlag("--dry-run");
  const validateOnly = hasFlag("--validate-only");
  const applyFailing = hasFlag("--apply-failing");
  const jsonOut = hasFlag("--json");
  const modeRaw = flagValue("--mode") ?? "metadata";
  if (modeRaw !== "metadata" && modeRaw !== "files") {
    throw new Error(`Invalid --mode=${modeRaw} (expected metadata|files)`);
  }
  const mode: ZenodoSyncMode = modeRaw;

  if (applyFailing && (validateOnly || dryRun)) {
    throw new Error(
      "Do not combine --apply-failing with --validate-only/--dry-run",
    );
  }

  if (!dryRun && !validateOnly && !isZenodoMintingEnabled()) {
    console.error(
      "Zenodo minting disabled: set ZENODO_ACCESS_TOKEN before refreshing.",
    );
    process.exitCode = 1;
    return;
  }

  const experimentIds = await resolveExperimentIds();
  if (!jsonOut) {
    console.info("[zenodo-refresh] targets", {
      count: experimentIds.length,
      dryRun,
      validateOnly,
      applyFailing,
      mode,
    });
  }

  const assignMissingAtlasId = !validateOnly;
  const audit = await buildAuditReport(experimentIds, assignMissingAtlasId);
  audit.mode = applyFailing
    ? "apply"
    : validateOnly || dryRun
      ? "audit"
      : "refresh";

  if (validateOnly || dryRun) {
    if (jsonOut) {
      console.log(JSON.stringify(audit, null, 2));
    } else {
      for (const entry of audit.requiredUpdates) {
        console.info("[zenodo-refresh] required update", entry);
      }
      console.info(formatZenodoCitationAuditMarkdown(audit));
    }
    if (audit.requiredUpdateCount > 0) {
      process.exitCode = 1;
    }
    return;
  }

  const targets = applyFailing
    ? audit.requiredUpdates.map((entry) => entry.experimentId)
    : experimentIds;

  if (applyFailing && targets.length === 0) {
    if (jsonOut) {
      console.log(JSON.stringify({ ...audit, applied: [] }, null, 2));
    } else {
      console.info("[zenodo-refresh] no failing deposits to apply");
    }
    return;
  }

  let failed = 0;
  const applied: Array<{
    experimentId: string;
    resultState: string;
    doi: string | null;
    remainingIssues: number;
  }> = [];

  for (const experimentId of targets) {
    if (!jsonOut) {
      const before =
        audit.requiredUpdates.find(
          (entry) => entry.experimentId === experimentId,
        ) ?? audit.passed.find((entry) => entry.experimentId === experimentId);
      console.info("[zenodo-refresh] before", before);
    }

    const result = await syncZenodoDepositForExperiment(db, experimentId, {
      mode,
    });
    const after = await validateOne(experimentId, {
      assignMissingAtlasId: true,
    });
    applied.push({
      experimentId,
      resultState: result.state,
      doi: result.doi,
      remainingIssues: after.issues.length,
    });
    if (!jsonOut) {
      console.info("[zenodo-refresh] sync", { experimentId, result });
      console.info("[zenodo-refresh] after", after);
    }
    if (after.issues.length > 0 || result.state === "failed") {
      failed += 1;
    }
  }

  if (jsonOut) {
    const afterAudit = await buildAuditReport(experimentIds, true);
    afterAudit.mode = "apply";
    console.log(
      JSON.stringify(
        {
          before: audit,
          applied,
          after: afterAudit,
        },
        null,
        2,
      ),
    );
  } else if (failed > 0) {
    console.error(`[zenodo-refresh] ${failed} dataset(s) failed validation`);
  } else {
    console.info("[zenodo-refresh] all datasets passed validation");
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
