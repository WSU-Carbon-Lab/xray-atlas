/**
 * Idempotent Zenodo deposit sync for post-upload experiment edits.
 *
 * Keeps published Zenodo records aligned with Atlas when contributors change
 * attribution, source publications, spectrum payloads, or auxiliary files.
 * Never throws to edit mutation callers: failures persist on
 * `experiment_zenodo_deposits` and return a result object.
 *
 * ## Edit surfaces that should call {@link scheduleZenodoDepositSync}
 *
 * | Mode | Trigger |
 * | --- | --- |
 * | `metadata` | `experiments.setAttributions`, `datasetAttributions.acceptAttribution` / `declineAttribution` / `unclaimAttribution`, `experiments.confirmClaimContributions` / `setClaimState`, source-publication mutations, `experiments.update` / `updateDescriptors` (type/edge/instrument that affect title), `samples.update`, `sampleAux.upsert` |
 * | `files` | `experimentFile.commitUpload` / `softDelete`, `sampleFile.commitUpload` / `softDelete`, `spectrumpoints.updateKkDeltaBatch` |
 *
 * Sample preparation fields (process method, substrate, patterning layer, solvent,
 * thickness, molecular weight, vendor) are embedded in Zenodo description/notes via
 * {@link buildZenodoDepositMetadata}; core sample edits must schedule metadata sync.
 */

import { after } from "next/server";
import type { PrismaClient } from "~/prisma/client";
import { normalizeDoi } from "~/lib/doi";
import {
  buildZenodoDepositMetadata,
  loadZenodoMetadataSnapshot,
} from "~/server/zenodo/build-zenodo-metadata";
import {
  mintExperimentDatasetDoi,
  type MintZenodoDatasetDoiOptions,
  type MintZenodoDatasetDoiResult,
} from "~/server/zenodo/mint-experiment-dataset-doi";
import {
  createZenodoClient,
  ZenodoApiError,
  type ZenodoClient,
  type ZenodoDeposition,
} from "~/server/zenodo/zenodo-client";
import {
  isZenodoMintingEnabled,
  zenodoCommunityId,
} from "~/server/zenodo/zenodo-config";
import { buildDatasetAllDataBundle } from "~/server/nexafs/datasetAllDataBundle";

/**
 * Whether the sync only refreshes Zenodo metadata or also replaces deposited files.
 *
 * - `metadata`: unlock → PUT metadata → republish (DOI string unchanged).
 * - `files`: `newversion` → metadata + re-upload all-data bundle → publish (new version DOI).
 */
export type ZenodoSyncMode = "metadata" | "files";

export interface SyncZenodoDepositOptions extends MintZenodoDatasetDoiOptions {
  /**
   * Sync strategy when a published deposit already exists.
   * Defaults to `metadata`.
   */
  mode?: ZenodoSyncMode;
}

const DEFAULT_POLL_ATTEMPTS = 12;
const DEFAULT_POLL_DELAY_MS = 1_500;
const DEFAULT_OVERALL_TIMEOUT_MS = 10 * 60 * 1_000;
const ERROR_MESSAGE_MAX = 2_000;

function sleepDefault(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function truncateError(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= ERROR_MESSAGE_MAX) return trimmed;
  return `${trimmed.slice(0, ERROR_MESSAGE_MAX)}…`;
}

function archiveFilename(
  experimentId: string,
  canonicalSlug: string | null,
): string {
  const slug = canonicalSlug?.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  if (slug && slug.length > 0) {
    return `nexafs-${slug.slice(0, 120)}.tar.gz`;
  }
  return `nexafs-${experimentId}.tar.gz`;
}

function resolveRecordUrl(deposition: ZenodoDeposition): string | null {
  if (deposition.links.html?.trim()) {
    return deposition.links.html.trim();
  }
  if (deposition.doi_url?.trim()) {
    return deposition.doi_url.trim();
  }
  const doi = normalizeDoi(deposition.doi ?? null);
  if (doi) {
    return `https://doi.org/${doi}`;
  }
  return null;
}

function resolveRecordId(deposition: ZenodoDeposition): number | null {
  if (
    typeof deposition.record_id === "number" &&
    Number.isFinite(deposition.record_id)
  ) {
    return deposition.record_id;
  }
  return null;
}

async function markSyncFailed(
  db: PrismaClient,
  experimentId: string,
  errorMessage: string,
  depositionId: number | null,
  priorPublished: {
    doi: string;
    recordurl: string | null;
    zenododepositionid: number | null;
  } | null,
): Promise<MintZenodoDatasetDoiResult> {
  const message = truncateError(errorMessage);
  if (priorPublished) {
    const restoredDepositionId =
      priorPublished.zenododepositionid ?? depositionId;
    await db.experimentzenododeposits.update({
      where: { experimentid: experimentId },
      data: {
        state: "published",
        doi: priorPublished.doi,
        recordurl: priorPublished.recordurl,
        zenododepositionid: restoredDepositionId ?? undefined,
        errormessage: message,
        lastattemptat: new Date(),
      },
    });
    return {
      state: "published",
      doi: priorPublished.doi,
      recordUrl: priorPublished.recordurl,
      error: message,
      zenodoDepositionId: restoredDepositionId,
    };
  }
  await db.experimentzenododeposits.upsert({
    where: { experimentid: experimentId },
    create: {
      experimentid: experimentId,
      state: "failed",
      zenododepositionid: depositionId,
      errormessage: message,
      attemptcount: 1,
      lastattemptat: new Date(),
    },
    update: {
      state: "failed",
      zenododepositionid: depositionId ?? undefined,
      errormessage: message,
      lastattemptat: new Date(),
    },
  });
  return {
    state: "failed",
    doi: null,
    recordUrl: null,
    error: message,
    zenodoDepositionId: depositionId,
  };
}

async function persistPublished(
  db: PrismaClient,
  experimentId: string,
  deposition: ZenodoDeposition,
  depositionId: number,
  publishedAt: Date,
): Promise<MintZenodoDatasetDoiResult> {
  const doi = normalizeDoi(deposition.doi ?? null);
  if (!doi) {
    throw new Error("Zenodo publish completed but DOI was missing");
  }
  const recordUrl = resolveRecordUrl(deposition);
  const recordId = resolveRecordId(deposition);
  await db.$transaction([
    db.experimentzenododeposits.update({
      where: { experimentid: experimentId },
      data: {
        state: "published",
        doi,
        recordurl: recordUrl,
        zenodorecordid: recordId,
        publishedat: publishedAt,
        errormessage: null,
        zenododepositionid: depositionId,
      },
    }),
    db.experimentmetrics.upsert({
      where: { experimentid: experimentId },
      create: {
        experimentid: experimentId,
        datasetdoi: doi,
        hasdatasetdoi: true,
      },
      update: {
        datasetdoi: doi,
        hasdatasetdoi: true,
      },
    }),
  ]);
  return {
    state: "published",
    doi,
    recordUrl,
    error: null,
    zenodoDepositionId: depositionId,
  };
}

async function pollUntilDoi(
  client: ZenodoClient,
  depositionId: number,
  pollAttempts: number,
  pollDelayMs: number,
  sleep: (ms: number) => Promise<void>,
  assertWithinBudget: () => void,
): Promise<ZenodoDeposition> {
  let deposition = await client.getDeposition(depositionId);
  for (let i = 0; i < pollAttempts; i += 1) {
    assertWithinBudget();
    if (normalizeDoi(deposition.doi ?? null)) {
      return deposition;
    }
    await sleep(pollDelayMs);
    deposition = await client.getDeposition(depositionId);
  }
  return deposition;
}

/**
 * Syncs (or mints) the Zenodo deposit for one Atlas experiment after an edit.
 *
 * Behavior:
 * - Minting disabled → `{ state: "disabled" }` (no DB write).
 * - No published deposit → delegates to {@link mintExperimentDatasetDoi}.
 * - Published + `metadata` → unlock, rebuild metadata, republish (same DOI).
 * - Published + `files` → `newversion`, rebuild metadata, replace archive, publish.
 *
 * @param db - Prisma client.
 * @param experimentId - Atlas experiment UUID.
 * @param options - Sync mode, injected client, timeouts (for tests).
 * @returns Deposit outcome; never throws for Zenodo/API failures.
 */
export async function syncZenodoDepositForExperiment(
  db: PrismaClient,
  experimentId: string,
  options: SyncZenodoDepositOptions = {},
): Promise<MintZenodoDatasetDoiResult> {
  const mode: ZenodoSyncMode = options.mode ?? "metadata";
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? sleepDefault;
  const pollAttempts = options.pollAttempts ?? DEFAULT_POLL_ATTEMPTS;
  const pollDelayMs = options.pollDelayMs ?? DEFAULT_POLL_DELAY_MS;
  const overallTimeoutMs =
    options.overallTimeoutMs ?? DEFAULT_OVERALL_TIMEOUT_MS;

  if (!isZenodoMintingEnabled() && !options.client) {
    return {
      state: "disabled",
      doi: null,
      recordUrl: null,
      error: "Zenodo minting disabled: ZENODO_ACCESS_TOKEN is not configured.",
      zenodoDepositionId: null,
    };
  }

  const existing = await db.experimentzenododeposits.findUnique({
    where: { experimentid: experimentId },
  });

  if (
    existing?.state !== "published" ||
    existing.zenododepositionid == null ||
    !existing.doi
  ) {
    return mintExperimentDatasetDoi(db, experimentId, options);
  }

  const experimentExists = await db.experiments.findUnique({
    where: { id: experimentId },
    select: { id: true, canonicalslug: true },
  });
  if (!experimentExists) {
    return {
      state: "failed",
      doi: null,
      recordUrl: null,
      error: "Experiment not found",
      zenodoDepositionId: existing.zenododepositionid,
    };
  }

  const startedAt = now();
  await db.experimentzenododeposits.update({
    where: { experimentid: experimentId },
    data: {
      state: "depositing",
      attemptcount: { increment: 1 },
      lastattemptat: startedAt,
      errormessage: null,
    },
  });

  let depositionId: number = existing.zenododepositionid;
  const priorPublished = {
    doi: existing.doi,
    recordurl: existing.recordurl,
    zenododepositionid: existing.zenododepositionid,
  };

  const assertWithinBudget = (): void => {
    const elapsed = now().getTime() - startedAt.getTime();
    if (elapsed > overallTimeoutMs) {
      throw new Error(
        `Zenodo sync overall timeout after ${overallTimeoutMs}ms (elapsed ${elapsed}ms)`,
      );
    }
  };

  try {
    const client = options.client ?? createZenodoClient();
    console.info("[zenodo] sync start", {
      experimentId,
      mode,
      depositionId,
      overallTimeoutMs,
    });

    const snapshot = await loadZenodoMetadataSnapshot(db, experimentId);
    assertWithinBudget();
    if (!snapshot) {
      return markSyncFailed(
        db,
        experimentId,
        "Experiment not found",
        depositionId,
        priorPublished,
      );
    }
    const metadata = buildZenodoDepositMetadata(snapshot, {
      communityId: zenodoCommunityId(),
    });

    let deposition: ZenodoDeposition;

    if (mode === "metadata") {
      const current = await client.getDeposition(depositionId);
      assertWithinBudget();
      if (current.submitted) {
        console.info(
          "[zenodo] unlocking published deposition for metadata sync",
          {
            experimentId,
            depositionId,
          },
        );
        await client.editDeposition(depositionId);
        assertWithinBudget();
      }
      deposition = await client.updateDepositionMetadata(
        depositionId,
        metadata,
      );
      assertWithinBudget();
      console.info("[zenodo] republishing after metadata sync", {
        experimentId,
        depositionId,
      });
      deposition = await client.publishDeposition(depositionId);
    } else {
      console.info("[zenodo] creating new version for file sync", {
        experimentId,
        depositionId,
      });
      deposition = await client.newVersionDeposition(depositionId);
      depositionId = deposition.id;
      assertWithinBudget();

      deposition = await client.updateDepositionMetadata(
        depositionId,
        metadata,
      );
      assertWithinBudget();

      const bucketUrl = deposition.links.bucket;
      if (!bucketUrl) {
        return markSyncFailed(
          db,
          experimentId,
          "Zenodo new-version deposition missing bucket URL",
          depositionId,
          priorPublished,
        );
      }

      try {
        const files = await client.listDepositionFiles(depositionId);
        for (const file of files) {
          assertWithinBudget();
          await client.deleteDepositionFile(depositionId, file.id);
        }
      } catch (listError) {
        console.warn(
          "[zenodo] could not clear prior version files; uploading anyway",
          {
            experimentId,
            depositionId,
            error:
              listError instanceof Error
                ? listError.message
                : String(listError),
          },
        );
      }

      console.info("[zenodo] building all-data bundle for sync", {
        experimentId,
      });
      const bundle = await (options.buildBundle ?? buildDatasetAllDataBundle)(
        db,
        experimentId,
      );
      assertWithinBudget();
      const filename = archiveFilename(
        experimentId,
        experimentExists.canonicalslug,
      );
      console.info("[zenodo] uploading bundle for sync", {
        experimentId,
        depositionId,
        filename,
        bytes: bundle.buffer.byteLength,
      });
      await client.uploadBucketFile(bucketUrl, filename, bundle.buffer);
      assertWithinBudget();

      console.info("[zenodo] publishing new version", {
        experimentId,
        depositionId,
      });
      deposition = await client.publishDeposition(depositionId);
    }

    deposition = await pollUntilDoi(
      client,
      depositionId,
      pollAttempts,
      pollDelayMs,
      sleep,
      assertWithinBudget,
    );

    if (!normalizeDoi(deposition.doi ?? null)) {
      return markSyncFailed(
        db,
        experimentId,
        "Zenodo sync publish polling timed out before DOI was available",
        depositionId,
        priorPublished,
      );
    }

    const publishedAt = now();
    const result = await persistPublished(
      db,
      experimentId,
      deposition,
      depositionId,
      publishedAt,
    );
    console.info("[zenodo] sync complete", {
      experimentId,
      mode,
      zenodoDepositionId: depositionId,
      doi: result.doi,
      durationMs: publishedAt.getTime() - startedAt.getTime(),
    });
    return result;
  } catch (error) {
    const message =
      error instanceof ZenodoApiError
        ? `${error.message}: ${error.bodyText}`
        : error instanceof Error
          ? error.message
          : "Unknown Zenodo sync error";
    console.error("[zenodo] sync failed", {
      experimentId,
      mode,
      zenodoDepositionId: depositionId,
      error: message,
    });
    return markSyncFailed(
      db,
      experimentId,
      message,
      depositionId,
      priorPublished,
    );
  }
}

/**
 * Schedules {@link syncZenodoDepositForExperiment} after the HTTP response when
 * possible (`next/server` `after`), otherwise fire-and-forget.
 *
 * No-ops when Zenodo minting is disabled. Never awaits the sync; edit mutations
 * must not fail when Zenodo is down.
 *
 * @param db - Prisma client (captured for the deferred task).
 * @param experimentId - Atlas experiment UUID.
 * @param options - Sync mode and mint options.
 */
export function scheduleZenodoDepositSync(
  db: PrismaClient,
  experimentId: string,
  options: SyncZenodoDepositOptions = {},
): void {
  if (!isZenodoMintingEnabled()) {
    return;
  }

  const run = (): void => {
    void syncZenodoDepositForExperiment(db, experimentId, options).catch(
      (error: unknown) => {
        console.error("[zenodo] scheduled sync threw", {
          experimentId,
          mode: options.mode ?? "metadata",
          error: error instanceof Error ? error.message : String(error),
        });
      },
    );
  };

  try {
    after(run);
  } catch {
    run();
  }
}

/**
 * Schedules Zenodo sync for every experiment linked to a sample (aux file edits).
 *
 * @param db - Prisma client.
 * @param sampleId - Atlas sample UUID.
 * @param options - Sync options (typically `{ mode: "files" }`).
 */
export async function scheduleZenodoDepositSyncForSample(
  db: PrismaClient,
  sampleId: string,
  options: SyncZenodoDepositOptions = {},
): Promise<void> {
  if (!isZenodoMintingEnabled()) {
    return;
  }
  const experiments = await db.experiments.findMany({
    where: { sampleid: sampleId },
    select: { id: true },
  });
  for (const row of experiments) {
    scheduleZenodoDepositSync(db, row.id, options);
  }
}
