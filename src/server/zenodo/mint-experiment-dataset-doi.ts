/**
 * Idempotent orchestrator that mints a Zenodo dataset DOI for one Atlas NEXAFS experiment.
 *
 * Upload success must not depend on Zenodo: failures persist on `experiment_zenodo_deposits` and
 * return a result object instead of throwing to the contribute submit path.
 */

import type { PrismaClient } from "~/prisma/client";
import { normalizeDoi } from "~/lib/doi";
import { buildDatasetAllDataBundle } from "~/server/nexafs/datasetAllDataBundle";
import {
  buildZenodoDepositMetadata,
  loadZenodoMetadataSnapshot,
} from "~/server/zenodo/build-zenodo-metadata";
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

export type MintZenodoDatasetDoiState =
  | "disabled"
  | "pending"
  | "depositing"
  | "published"
  | "failed";

export interface MintZenodoDatasetDoiResult {
  state: MintZenodoDatasetDoiState;
  doi: string | null;
  recordUrl: string | null;
  error: string | null;
  zenodoDepositionId: number | null;
}

export interface MintZenodoDatasetDoiOptions {
  client?: ZenodoClient;
  pollAttempts?: number;
  pollDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  /**
   * Hard wall-clock budget for the entire mint attempt (bundle + upload + publish + poll).
   * Defaults to 10 minutes. On expiry the deposit is marked failed.
   */
  overallTimeoutMs?: number;
  /**
   * Optional bundle builder override for unit tests. Defaults to {@link buildDatasetAllDataBundle}.
   */
  buildBundle?: (
    db: PrismaClient,
    experimentId: string,
  ) => Promise<{ buffer: Buffer; downloadFilename: string }>;
}

const DEFAULT_POLL_ATTEMPTS = 12;
const DEFAULT_POLL_DELAY_MS = 1_500;
const DEFAULT_OVERALL_TIMEOUT_MS = 10 * 60 * 1_000;
const ERROR_MESSAGE_MAX = 2_000;
const DEPOSITING_STALE_MS = 10 * 60 * 1_000;

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

async function markFailed(
  db: PrismaClient,
  experimentId: string,
  errorMessage: string,
  depositionId: number | null,
): Promise<MintZenodoDatasetDoiResult> {
  const message = truncateError(errorMessage);
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

async function persistPublishedDeposit(
  db: PrismaClient,
  experimentId: string,
  deposition: ZenodoDeposition,
  depositionId: number,
  publishedAt: Date,
  startedAt: Date,
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

  console.info("[zenodo] minted dataset DOI", {
    experimentId,
    zenodoDepositionId: depositionId,
    doi,
    durationMs: publishedAt.getTime() - startedAt.getTime(),
  });

  return {
    state: "published",
    doi,
    recordUrl,
    error: null,
    zenodoDepositionId: depositionId,
  };
}

/**
 * Claims the mint row for this experiment (CAS) so concurrent editors do not
 * create duplicate Zenodo deposits.
 *
 * @returns `claimed` when this caller owns the attempt, or an early result when
 * another mint is in progress / already published.
 */
async function claimMintAttempt(
  db: PrismaClient,
  experimentId: string,
  startedAt: Date,
): Promise<
  | { kind: "claimed"; depositionId: number | null }
  | { kind: "result"; result: MintZenodoDatasetDoiResult }
> {
  const staleBefore = new Date(startedAt.getTime() - DEPOSITING_STALE_MS);

  const claimedExisting = await db.experimentzenododeposits.updateMany({
    where: {
      experimentid: experimentId,
      OR: [
        { state: { in: ["pending", "failed"] } },
        { state: "depositing", lastattemptat: { lt: staleBefore } },
      ],
    },
    data: {
      state: "depositing",
      attemptcount: { increment: 1 },
      lastattemptat: startedAt,
      errormessage: null,
    },
  });

  if (claimedExisting.count === 1) {
    const row = await db.experimentzenododeposits.findUnique({
      where: { experimentid: experimentId },
      select: { zenododepositionid: true },
    });
    return { kind: "claimed", depositionId: row?.zenododepositionid ?? null };
  }

  try {
    await db.experimentzenododeposits.create({
      data: {
        experimentid: experimentId,
        state: "depositing",
        attemptcount: 1,
        lastattemptat: startedAt,
        errormessage: null,
      },
    });
    return { kind: "claimed", depositionId: null };
  } catch {
    const row = await db.experimentzenododeposits.findUnique({
      where: { experimentid: experimentId },
    });
    if (row?.state === "published" && row.doi) {
      return {
        kind: "result",
        result: {
          state: "published",
          doi: row.doi,
          recordUrl: row.recordurl,
          error: null,
          zenodoDepositionId: row.zenododepositionid,
        },
      };
    }
    if (row?.state === "depositing") {
      return {
        kind: "result",
        result: {
          state: "depositing",
          doi: null,
          recordUrl: null,
          error: "Zenodo mint already in progress for this experiment",
          zenodoDepositionId: row.zenododepositionid,
        },
      };
    }
    return {
      kind: "result",
      result: {
        state: "failed",
        doi: null,
        recordUrl: null,
        error: "Could not claim Zenodo mint attempt",
        zenodoDepositionId: row?.zenododepositionid ?? null,
      },
    };
  }
}

/**
 * Mints (or resumes) a Zenodo dataset DOI for `experimentId` using the Atlas depositor token.
 *
 * Idempotent: when a deposit row is already `published` with a DOI, returns that result without
 * calling Zenodo. When `ZENODO_ACCESS_TOKEN` is unset, returns `state: "disabled"` without writing.
 * Failures are persisted and returned; this function does not throw for Zenodo/API errors.
 *
 * @param db - Prisma client.
 * @param experimentId - Atlas experiment UUID.
 * @param options - Optional injected client, poll budget, and clock for tests.
 * @returns Deposit outcome including DOI and record URL when published.
 */
export async function mintExperimentDatasetDoi(
  db: PrismaClient,
  experimentId: string,
  options: MintZenodoDatasetDoiOptions = {},
): Promise<MintZenodoDatasetDoiResult> {
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? sleepDefault;
  const pollAttempts = options.pollAttempts ?? DEFAULT_POLL_ATTEMPTS;
  const pollDelayMs = options.pollDelayMs ?? DEFAULT_POLL_DELAY_MS;

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

  if (existing?.state === "published" && existing.doi) {
    return {
      state: "published",
      doi: existing.doi,
      recordUrl: existing.recordurl,
      error: null,
      zenodoDepositionId: existing.zenododepositionid,
    };
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
      zenodoDepositionId: null,
    };
  }

  const startedAt = now();
  const claim = await claimMintAttempt(db, experimentId, startedAt);
  if (claim.kind === "result") {
    return claim.result;
  }

  let depositionId: number | null = claim.depositionId;
  const overallTimeoutMs =
    options.overallTimeoutMs ?? DEFAULT_OVERALL_TIMEOUT_MS;

  const assertWithinBudget = (): void => {
    const elapsed = now().getTime() - startedAt.getTime();
    if (elapsed > overallTimeoutMs) {
      throw new Error(
        `Zenodo mint overall timeout after ${overallTimeoutMs}ms (elapsed ${elapsed}ms)`,
      );
    }
  };

  try {
    const client = options.client ?? createZenodoClient();
    console.info("[zenodo] mint start", {
      experimentId,
      existingDepositionId: depositionId,
      overallTimeoutMs,
    });

    const snapshot = await loadZenodoMetadataSnapshot(db, experimentId);
    assertWithinBudget();
    if (!snapshot) {
      return markFailed(db, experimentId, "Experiment not found", depositionId);
    }

    const metadata = buildZenodoDepositMetadata(snapshot, {
      communityId: zenodoCommunityId(),
    });

    let deposition: ZenodoDeposition;
    if (depositionId != null) {
      console.info("[zenodo] resuming existing deposition", {
        experimentId,
        depositionId,
      });
      deposition = await client.getDeposition(depositionId);
      assertWithinBudget();

      if (deposition.submitted) {
        const publishedAt = now();
        const existingDoi = normalizeDoi(deposition.doi ?? null);
        if (existingDoi) {
          return persistPublishedDeposit(
            db,
            experimentId,
            deposition,
            depositionId,
            publishedAt,
            startedAt,
          );
        }
        for (let i = 0; i < pollAttempts; i += 1) {
          assertWithinBudget();
          deposition = await client.getDeposition(depositionId);
          if (normalizeDoi(deposition.doi ?? null)) {
            return persistPublishedDeposit(
              db,
              experimentId,
              deposition,
              depositionId,
              now(),
              startedAt,
            );
          }
          await sleep(pollDelayMs);
        }
        return markFailed(
          db,
          experimentId,
          "Zenodo publish polling timed out before DOI was available",
          depositionId,
        );
      }

      deposition = await client.updateDepositionMetadata(depositionId, metadata);
    } else {
      console.info("[zenodo] creating deposition", { experimentId });
      deposition = await client.createDeposition();
      depositionId = deposition.id;
      await db.experimentzenododeposits.update({
        where: { experimentid: experimentId },
        data: { zenododepositionid: depositionId },
      });
      deposition = await client.updateDepositionMetadata(depositionId, metadata);
    }
    assertWithinBudget();

    const bucketUrl = deposition.links.bucket;
    if (!bucketUrl) {
      return markFailed(
        db,
        experimentId,
        "Zenodo deposition response missing bucket URL",
        depositionId,
      );
    }

    console.info("[zenodo] building all-data bundle", { experimentId });
    const bundleStarted = now();
    const bundle = await (options.buildBundle ?? buildDatasetAllDataBundle)(
      db,
      experimentId,
    );
    assertWithinBudget();
    const filename = archiveFilename(
      experimentId,
      experimentExists.canonicalslug,
    );
    console.info("[zenodo] uploading bundle", {
      experimentId,
      depositionId,
      filename,
      bytes: bundle.buffer.byteLength,
      bundleMs: now().getTime() - bundleStarted.getTime(),
    });
    await client.uploadBucketFile(bucketUrl, filename, bundle.buffer);
    assertWithinBudget();

    console.info("[zenodo] publishing deposition", {
      experimentId,
      depositionId,
    });
    deposition = await client.publishDeposition(depositionId);

    for (let i = 0; i < pollAttempts; i += 1) {
      assertWithinBudget();
      const doi = normalizeDoi(deposition.doi ?? null);
      if (doi) {
        return persistPublishedDeposit(
          db,
          experimentId,
          deposition,
          depositionId,
          now(),
          startedAt,
        );
      }
      console.info("[zenodo] waiting for DOI", {
        experimentId,
        depositionId,
        pollAttempt: i + 1,
        pollAttempts,
      });
      await sleep(pollDelayMs);
      deposition = await client.getDeposition(depositionId);
    }

    return markFailed(
      db,
      experimentId,
      "Zenodo publish polling timed out before DOI was available",
      depositionId,
    );
  } catch (error) {
    const message =
      error instanceof ZenodoApiError
        ? `${error.message}: ${error.bodyText}`
        : error instanceof Error
          ? error.message
          : "Unknown Zenodo minting error";
    console.error("[zenodo] mint failed", {
      experimentId,
      zenodoDepositionId: depositionId,
      error: message,
    });
    return markFailed(db, experimentId, message, depositionId);
  }
}
