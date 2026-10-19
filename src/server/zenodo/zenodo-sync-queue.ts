/**
 * Durable Zenodo sync queue for dataset versions.
 *
 * Responsible for: recording a `pending` Zenodo version when a dataset bump
 * happens on a deposited experiment, queueing the `files`-mode sync that mints
 * the new Zenodo version, retrying failures with exponential backoff, and the
 * single entry point (`syncAfterEdit`) that every edit mutation calls.
 *
 * Not responsible for: choosing bump levels or writing revisions (see
 * `~/server/nexafs/apply-versioned-change`), talking to Zenodo (see
 * `sync-zenodo-deposit.ts`), or creating first deposits. A bump on an experiment
 * without a deposit never creates one; first deposits stay the explicit
 * `mintExperimentDatasetDoi` action.
 *
 * Invariants: a job is claimed by an atomic `queued -> running` update, so
 * concurrent cron runs cannot process the same job; before any Zenodo call a
 * job exits when a `published` version row already exists for its target label,
 * so retries never mint a second Zenodo version.
 */

import { after } from "next/server";
import { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import {
  formatDatasetVersion,
  parseDatasetVersion,
} from "~/server/nexafs/dataset-versioning";
import { experimentHasZenodoDeposit } from "~/server/nexafs/apply-versioned-change";
import {
  scheduleZenodoDepositSync,
  syncZenodoDepositForExperiment,
  ZENODO_SYNC_BUDGET_MS,
  type ZenodoSyncMode,
} from "~/server/zenodo/sync-zenodo-deposit";
import { compareVersionLabels } from "~/server/zenodo/zenodo-version-records";
import { isZenodoMintingEnabled } from "~/server/zenodo/zenodo-config";

/** Maximum failed attempts before a job is flagged `dead` for maintainers. */
export const ZENODO_SYNC_MAX_ATTEMPTS = 8;

const BASE_BACKOFF_MS = 2 * 60 * 1_000;
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1_000;
/** A `running` job untouched for this long is presumed crashed and re-queued. */
const STALE_RUNNING_MS = 20 * 60 * 1_000;
const ERROR_MESSAGE_MAX = 2_000;

/** Counts reported by {@link runDueZenodoSyncJobs}. */
export interface ZenodoSyncRunSummary {
  /** Jobs that finished successfully (including jobs with nothing left to do). */
  done: number;
  /** Jobs that failed and were re-queued with backoff. */
  retried: number;
  /** Jobs that hit the attempt cap and are now `dead`. */
  dead: number;
}

interface JobKey {
  experimentId: string;
  targetVersionLabel: string;
  mode: ZenodoSyncMode;
}

interface ClaimedJob extends JobKey {
  id: string;
  attempts: number;
}

/**
 * Delay before the next attempt after `failedAttempts` failures.
 *
 * @param failedAttempts - Number of failed attempts so far (at least 1).
 * @returns Milliseconds: 2 minutes doubling per failure, capped at 6 hours.
 */
export function zenodoSyncBackoffMs(failedAttempts: number): number {
  const exponent = Math.max(0, failedAttempts - 1);
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** exponent);
}

function truncateError(message: string): string {
  const trimmed = message.trim();
  return trimmed.length <= ERROR_MESSAGE_MAX
    ? trimmed
    : `${trimmed.slice(0, ERROR_MESSAGE_MAX)}...`;
}

function jobWhere(key: JobKey) {
  return {
    experimentId_targetVersionLabel_mode: {
      experimentId: key.experimentId,
      targetVersionLabel: key.targetVersionLabel,
      mode: key.mode,
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Queues a Zenodo sync job for one experiment version. Idempotent per
 * `(experimentId, targetVersionLabel, mode)`: an existing job that is not
 * currently running is reset to `queued` with zero attempts and an immediate
 * due time; a running job is left untouched.
 *
 * @param input - Experiment UUID, target dataset version `M.m.p`, and sync mode.
 */
export async function enqueueZenodoSync(input: JobKey): Promise<void> {
  try {
    await db.zenodoSyncJob.create({
      data: {
        experimentId: input.experimentId,
        targetVersionLabel: input.targetVersionLabel,
        mode: input.mode,
        status: "queued",
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    await db.zenodoSyncJob.updateMany({
      where: {
        experimentId: input.experimentId,
        targetVersionLabel: input.targetVersionLabel,
        mode: input.mode,
        status: { not: "running" },
      },
      data: {
        status: "queued",
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: null,
      },
    });
  }
}

async function claimJob(id: string, now: Date): Promise<ClaimedJob | null> {
  const claimed = await db.zenodoSyncJob.updateMany({
    where: { id, status: "queued", nextAttemptAt: { lte: now } },
    data: { status: "running" },
  });
  if (claimed.count !== 1) return null;
  const row = await db.zenodoSyncJob.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    experimentId: row.experimentId,
    targetVersionLabel: row.targetVersionLabel,
    mode: row.mode === "metadata" ? "metadata" : "files",
    attempts: row.attempts,
  };
}

async function publishedVersionExists(
  experimentId: string,
  versionLabel: string,
): Promise<boolean> {
  const row = await db.experimentZenodoVersion.findUnique({
    where: {
      experimentId_versionLabel: { experimentId, versionLabel },
    },
    select: { status: true },
  });
  return row?.status === "published";
}

type JobOutcome = "done" | "retried" | "dead" | "released";

async function finishJobFailure(
  job: ClaimedJob,
  now: Date,
  message: string,
): Promise<JobOutcome> {
  const attempts = job.attempts + 1;
  const lastError = truncateError(message);
  if (attempts >= ZENODO_SYNC_MAX_ATTEMPTS) {
    await db.zenodoSyncJob.update({
      where: { id: job.id },
      data: { status: "dead", attempts, lastError },
    });
    if (job.mode === "files") {
      await db.experimentZenodoVersion.updateMany({
        where: {
          experimentId: job.experimentId,
          versionLabel: job.targetVersionLabel,
          status: "pending",
        },
        data: { status: "failed" },
      });
    }
    console.error("[zenodo-queue] job dead; maintainer attention needed", {
      jobId: job.id,
      experimentId: job.experimentId,
      targetVersionLabel: job.targetVersionLabel,
      mode: job.mode,
      attempts,
      lastError,
    });
    return "dead";
  }
  await db.zenodoSyncJob.update({
    where: { id: job.id },
    data: {
      status: "queued",
      attempts,
      lastError,
      nextAttemptAt: new Date(now.getTime() + zenodoSyncBackoffMs(attempts)),
    },
  });
  return "retried";
}

/** Highest label among published rows and other open files jobs that outranks `job`, if any. */
async function findSupersedingLabel(job: ClaimedJob): Promise<string | null> {
  const [published, openJobs] = await Promise.all([
    db.experimentZenodoVersion.findMany({
      where: { experimentId: job.experimentId, status: "published" },
      select: { versionLabel: true },
    }),
    db.zenodoSyncJob.findMany({
      where: {
        experimentId: job.experimentId,
        mode: "files",
        status: { in: ["queued", "running"] },
        id: { not: job.id },
      },
      select: { targetVersionLabel: true },
    }),
  ]);
  const labels = [
    ...published.map((row) => row.versionLabel),
    ...openJobs.map((row) => row.targetVersionLabel),
  ];
  let best: string | null = null;
  for (const label of labels) {
    const cmp = compareVersionLabels(label, job.targetVersionLabel);
    if (cmp === null || cmp <= 0) continue;
    if (best === null || (compareVersionLabels(label, best) ?? 0) > 0) {
      best = label;
    }
  }
  return best;
}

async function releaseJob(id: string, delayMs: number, now: Date) {
  await db.zenodoSyncJob.update({
    where: { id },
    data: {
      status: "queued",
      nextAttemptAt: new Date(now.getTime() + delayMs),
    },
  });
}

async function processClaimedJob(
  job: ClaimedJob,
  now: Date,
): Promise<JobOutcome> {
  try {
    if (job.mode === "files") {
      // Serialize: one files job per experiment at a time.
      const sibling = await db.zenodoSyncJob.findFirst({
        where: {
          experimentId: job.experimentId,
          mode: "files",
          status: "running",
          id: { not: job.id },
        },
        select: { id: true },
      });
      if (sibling) {
        await releaseJob(job.id, 60_000, now);
        return "released";
      }

      if (
        await publishedVersionExists(job.experimentId, job.targetVersionLabel)
      ) {
        await db.zenodoSyncJob.update({
          where: { id: job.id },
          data: { status: "done", lastError: null },
        });
        return "done";
      }

      // Supersede: a newer label already published or is queued, so minting
      // this one would publish newer content under an older label.
      const newer = await findSupersedingLabel(job);
      if (newer) {
        await db.experimentZenodoVersion.updateMany({
          where: {
            experimentId: job.experimentId,
            versionLabel: job.targetVersionLabel,
            status: "pending",
          },
          data: { status: "failed" },
        });
        await db.zenodoSyncJob.update({
          where: { id: job.id },
          data: { status: "done", lastError: `Superseded by version ${newer}` },
        });
        console.info("[zenodo-queue] job superseded", {
          jobId: job.id,
          targetVersionLabel: job.targetVersionLabel,
          supersededBy: newer,
        });
        return "done";
      }
    }

    const result = await syncZenodoDepositForExperiment(db, job.experimentId, {
      mode: job.mode,
      versionLabel: job.targetVersionLabel,
      overallTimeoutMs: ZENODO_SYNC_BUDGET_MS,
    });

    if (result.state === "disabled") {
      await releaseJob(job.id, 0, now);
      return "released";
    }
    if (result.state === "depositing") {
      await releaseJob(job.id, BASE_BACKOFF_MS, now);
      return "released";
    }

    if (
      job.mode === "files" &&
      result.state === "published" &&
      result.error === null
    ) {
      const row = await db.experimentZenodoVersion.findUnique({
        where: {
          experimentId_versionLabel: {
            experimentId: job.experimentId,
            versionLabel: job.targetVersionLabel,
          },
        },
        select: { doi: true },
      });
      const clash = row?.doi
        ? await db.experimentZenodoVersion.findFirst({
            where: {
              experimentId: job.experimentId,
              doi: row.doi,
              versionLabel: { not: job.targetVersionLabel },
            },
            select: { versionLabel: true },
          })
        : null;
      if (clash) {
        await db.experimentZenodoVersion.update({
          where: {
            experimentId_versionLabel: {
              experimentId: job.experimentId,
              versionLabel: job.targetVersionLabel,
            },
          },
          data: {
            status: "pending",
            doi: null,
            recordId: null,
            depositionId: null,
            publishedAt: null,
          },
        });
        return await finishJobFailure(
          job,
          now,
          `DOI ${row?.doi ?? ""} duplicates version ${clash.versionLabel}; no new Zenodo version was minted`,
        );
      }
    }

    const succeeded =
      result.state === "published" &&
      result.error === null &&
      (job.mode === "metadata" ||
        (await publishedVersionExists(
          job.experimentId,
          job.targetVersionLabel,
        )));
    if (succeeded) {
      await db.zenodoSyncJob.update({
        where: { id: job.id },
        data: { status: "done", lastError: null },
      });
      return "done";
    }
    return await finishJobFailure(
      job,
      now,
      result.error ?? `Zenodo sync ended in state ${result.state}`,
    );
  } catch (error) {
    return finishJobFailure(
      job,
      now,
      error instanceof Error ? error.message : "Unknown Zenodo queue error",
    );
  }
}

/**
 * Runs due Zenodo sync jobs. Each job is claimed with an atomic
 * `queued -> running` update; a job that fails is re-queued with exponential
 * backoff until {@link ZENODO_SYNC_MAX_ATTEMPTS} failures, after which it is
 * `dead` with its last error retained and its pending version row marked
 * `failed`. Jobs left `running` past 20 minutes are first re-queued as crashed.
 * Does nothing when `ZENODO_ACCESS_TOKEN` is unset.
 *
 * @param now - Reference time for due and stale checks.
 * @param limit - Maximum jobs to process in this run (positive integer).
 * @returns Counts of jobs completed, re-queued, and declared dead.
 */
export async function runDueZenodoSyncJobs(
  now: Date,
  limit: number,
): Promise<ZenodoSyncRunSummary> {
  const summary: ZenodoSyncRunSummary = { done: 0, retried: 0, dead: 0 };
  if (!isZenodoMintingEnabled() || limit < 1) return summary;

  await db.zenodoSyncJob.updateMany({
    where: {
      status: "running",
      updatedAt: { lt: new Date(now.getTime() - STALE_RUNNING_MS) },
    },
    data: { status: "queued" },
  });

  try {
    await reconcileMissingZenodoVersions(now);
  } catch (error) {
    console.error("[zenodo-queue] reconciliation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const due = await db.zenodoSyncJob.findMany({
    where: { status: "queued", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.floor(limit),
    select: { id: true },
  });

  for (const { id } of due) {
    const job = await claimJob(id, now);
    if (!job) continue;
    const outcome = await processClaimedJob(job, now);
    if (outcome === "done") summary.done += 1;
    else if (outcome === "retried") summary.retried += 1;
    else if (outcome === "dead") summary.dead += 1;
  }
  return summary;
}

async function attemptJobNow(key: JobKey): Promise<void> {
  const row = await db.zenodoSyncJob.findUnique({
    where: jobWhere(key),
    select: { id: true },
  });
  if (!row) return;
  const now = new Date();
  const job = await claimJob(row.id, now);
  if (!job) return;
  await processClaimedJob(job, now);
}

async function recordPendingVersion(
  experimentId: string,
  versionLabel: string,
): Promise<void> {
  const version = await db.experimentZenodoVersion.upsert({
    where: {
      experimentId_versionLabel: { experimentId, versionLabel },
    },
    create: { experimentId, versionLabel, status: "pending" },
    update: {},
    select: { id: true },
  });
  const parsed = parseDatasetVersion(versionLabel);
  await db.experimentRevision.updateMany({
    where: {
      experimentId,
      versionMajor: parsed.major,
      versionMinor: parsed.minor,
      versionPatch: parsed.patch,
      zenodoVersionId: null,
    },
    data: { zenodoVersionId: version.id },
  });
}

/** Bumps younger than this are left to their own `syncAfterEdit` call. */
const RECONCILE_GRACE_MS = 5 * 60 * 1_000;
const RECONCILE_BATCH = 100;

/**
 * Enqueues Zenodo versions for committed bumps that lost them: bumping
 * revisions (every kind except `baseline`) older than five minutes, on
 * experiments that have a deposit, with no `zenodo_version_id`, no pending or
 * published version row for their label, and no job for that label. Covers a
 * process dying between the bump commit and `syncAfterEdit`. Idempotent.
 *
 * @param now - Reference time for the grace window.
 * @returns Number of versions re-recorded and queued.
 */
export async function reconcileMissingZenodoVersions(
  now: Date,
): Promise<number> {
  const orphans = await db.experimentRevision.findMany({
    where: {
      changeKind: { not: "baseline" },
      zenodoVersionId: null,
      createdAt: { lt: new Date(now.getTime() - RECONCILE_GRACE_MS) },
      experiments: {
        experimentzenododeposit: {
          is: { state: { in: ["pending", "depositing", "published"] } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: RECONCILE_BATCH,
    select: {
      experimentId: true,
      versionMajor: true,
      versionMinor: true,
      versionPatch: true,
    },
  });

  let queued = 0;
  for (const revision of orphans) {
    const label = formatDatasetVersion({
      major: revision.versionMajor,
      minor: revision.versionMinor,
      patch: revision.versionPatch,
    });
    const [row, job] = await Promise.all([
      db.experimentZenodoVersion.findUnique({
        where: {
          experimentId_versionLabel: {
            experimentId: revision.experimentId,
            versionLabel: label,
          },
        },
        select: { status: true },
      }),
      db.zenodoSyncJob.findFirst({
        where: {
          experimentId: revision.experimentId,
          targetVersionLabel: label,
          mode: "files",
        },
        select: { id: true },
      }),
    ]);
    if (job) continue;
    if (row && row.status !== "failed") {
      // Row exists but the revision link was lost: re-link only.
      await recordPendingVersion(revision.experimentId, label);
      continue;
    }
    if (row) continue;
    await recordPendingVersion(revision.experimentId, label);
    await enqueueZenodoSync({
      experimentId: revision.experimentId,
      targetVersionLabel: label,
      mode: "files",
    });
    queued += 1;
  }
  return queued;
}

async function hasPublishedDeposit(experimentId: string): Promise<boolean> {
  const row = await db.experimentzenododeposits.findFirst({
    where: { experimentid: experimentId, state: "published" },
    select: { experimentid: true },
  });
  return row !== null;
}

async function hasOpenSyncJob(experimentId: string): Promise<boolean> {
  const row = await db.zenodoSyncJob.findFirst({
    where: { experimentId, status: { in: ["queued", "running"] } },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Propagates one committed edit to Zenodo. Every edit mutation calls this once,
 * after its transaction commits.
 *
 * - `bump` present and the experiment has a deposit: records a `pending`
 *   Zenodo version for `bump.to`, links the matching revision, queues a
 *   `files`-mode job, and attempts it right after the response. Failures stay
 *   `pending` and retry from the cron runner.
 * - `bump` present and no deposit: does nothing; a bump never creates a deposit.
 * - `bump` null: schedules a `metadata`-mode sync when a published deposit
 *   exists and no sync job is already open for the experiment.
 *
 * Never throws; failures are logged so an edit that already committed is not
 * reported as failed.
 *
 * @param input - Experiment UUID and the committed bump (`to` is the new `M.m.p`) or `null`.
 */
export async function syncAfterEdit(input: {
  experimentId: string;
  bump: { to: string } | null;
}): Promise<void> {
  try {
    if (input.bump === null) {
      if (!isZenodoMintingEnabled()) return;
      if (!(await hasPublishedDeposit(input.experimentId))) return;
      if (await hasOpenSyncJob(input.experimentId)) return;
      scheduleZenodoDepositSync(db, input.experimentId, { mode: "metadata" });
      return;
    }

    if (!(await experimentHasZenodoDeposit(db, input.experimentId))) return;
    const key: JobKey = {
      experimentId: input.experimentId,
      targetVersionLabel: input.bump.to,
      mode: "files",
    };
    await recordPendingVersion(key.experimentId, key.targetVersionLabel);
    await enqueueZenodoSync(key);

    if (!isZenodoMintingEnabled()) return;
    const run = (): void => {
      void attemptJobNow(key).catch((error: unknown) => {
        console.error("[zenodo-queue] immediate attempt threw", {
          ...key,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    };
    try {
      after(run);
    } catch {
      run();
    }
  } catch (error) {
    console.error("[zenodo-queue] syncAfterEdit failed", {
      experimentId: input.experimentId,
      bump: input.bump,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
