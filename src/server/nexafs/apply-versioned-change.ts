/**
 * Transactional dataset version bump shared by every mutation that advances a dataset version.
 *
 * Locks the experiment row, verifies the caller's confirmed version, writes an
 * `experiment_revisions` row, advances the version columns, and emits a `dataset.version` audit
 * event, all on the caller's transaction client. It does not schedule Zenodo work and never
 * creates a Zenodo deposit; callers read `hasDeposit` from the result to decide.
 */

import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "~/prisma/client";
import { emitAuditEvent } from "~/server/audit/emit-audit-event";
import {
  bumpLevelForChange,
  formatDatasetVersion,
  highestBumpLevel,
  nextDatasetVersion,
  parseDatasetVersion,
  type DatasetChangeKind,
  type DatasetVersion,
  type VersionBumpLevel,
} from "~/server/nexafs/dataset-versioning";

/** Error message of the BAD_REQUEST thrown when a bump arrives without a confirmed version. */
export const VERSION_BUMP_CONFIRMATION_REQUIRED =
  "VERSION_BUMP_CONFIRMATION_REQUIRED";

/** Zod input for `confirmVersionBump` on every mutation that bumps a dataset version. */
export const confirmVersionBumpSchema = z.object({
  fromVersion: z.string().trim().min(1).max(32),
});

/** Zod enum of {@link DatasetChangeKind} values for preview and mutation inputs. */
export const datasetChangeKindSchema = z.enum([
  "normalization",
  "kk_first_calculation",
  "kk_recalculation",
  "aux_added",
  "aux_removed",
]);

/** Input for {@link applyVersionedChange}. */
export interface ApplyVersionedChangeInput {
  experimentId: string;
  actorUserId: string;
  /** Non-empty; the highest level among these kinds applies once. */
  changes: readonly DatasetChangeKind[];
  /** Edit parameters only (windows, scope, engine label), stored on the revision. */
  parameters: Prisma.InputJsonValue;
  /** SHA-256 hex of the derived output; see {@link canonicalJsonChecksum}. */
  derivedChecksum: string;
  /** Delta copy on the persisted energy axis for KK revisions. */
  kkDelta?: Prisma.InputJsonValue;
  /** Version the user confirmed; absent or blank is rejected. */
  confirmFromVersion: string | undefined;
  /** True when a maintenance sweep (not the user) closed the change; recorded in the audit payload. */
  autoClosed?: boolean;
}

/** Result of {@link applyVersionedChange}. */
export interface ApplyVersionedChangeResult {
  from: string;
  to: string;
  revisionId: string;
  /** True when a published, in-flight, or pending Zenodo deposit row exists for the experiment. */
  hasDeposit: boolean;
}

function canonicalize(value: Prisma.InputJsonValue | null): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot checksum a non-finite number");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => canonicalize(item as Prisma.InputJsonValue | null))
      .join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, Prisma.InputJsonValue>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(
      ([k, v]) =>
        `${JSON.stringify(k)}:${canonicalize(v as Prisma.InputJsonValue | null)}`,
    );
  return `{${entries.join(",")}}`;
}

/**
 * Lowercase SHA-256 hex digest of `value` serialized as canonical JSON: object keys sorted
 * lexicographically at every depth, array order preserved, `undefined` members dropped, no
 * whitespace. Throws when `value` contains a non-finite number, since JSON cannot represent it.
 */
export function canonicalJsonChecksum(value: Prisma.InputJsonValue): string {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

/** Row shape returned by the `FOR UPDATE` version read. */
type LockedVersionRow = {
  dataset_version_major: number;
  dataset_version_minor: number;
  dataset_version_patch: number;
};

/**
 * Reads the stored version of `experimentId` without locking. Throws NOT_FOUND when the
 * experiment does not exist.
 */
export async function readDatasetVersion(
  client:
    | Prisma.TransactionClient
    | { experiments: Prisma.TransactionClient["experiments"] },
  experimentId: string,
): Promise<DatasetVersion> {
  const row = await client.experiments.findUnique({
    where: { id: experimentId },
    select: {
      datasetVersionMajor: true,
      datasetVersionMinor: true,
      datasetVersionPatch: true,
    },
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
  }
  return {
    major: row.datasetVersionMajor,
    minor: row.datasetVersionMinor,
    patch: row.datasetVersionPatch,
  };
}

/**
 * Whether a Zenodo deposit row in state pending, depositing, or published exists for
 * `experimentId`. A bump mints a Zenodo version only when this is true.
 */
export async function experimentHasZenodoDeposit(
  client: {
    experimentzenododeposits: Prisma.TransactionClient["experimentzenododeposits"];
  },
  experimentId: string,
): Promise<boolean> {
  const deposit = await client.experimentzenododeposits.findFirst({
    where: {
      experimentid: experimentId,
      state: { in: ["pending", "depositing", "published"] },
    },
    select: { experimentid: true },
  });
  return deposit !== null;
}

/**
 * Highest bump level and the change kind that determines it (first kind at that level).
 * Throws when `changes` is empty.
 */
export function resolveBumpLevel(changes: readonly DatasetChangeKind[]): {
  level: VersionBumpLevel;
  primaryKind: DatasetChangeKind;
} {
  const level = highestBumpLevel(changes.map(bumpLevelForChange));
  const primaryKind = changes.find((c) => bumpLevelForChange(c) === level);
  if (!primaryKind) throw new Error("resolveBumpLevel requires a change");
  return { level, primaryKind };
}

/**
 * Applies one confirmed dataset version bump inside the caller's transaction `tx`.
 *
 * Throws BAD_REQUEST with message {@link VERSION_BUMP_CONFIRMATION_REQUIRED} when
 * `confirmFromVersion` is absent or blank, NOT_FOUND when the experiment is missing, and CONFLICT
 * when `confirmFromVersion` differs from the version stored under a `SELECT ... FOR UPDATE` row
 * lock (stale confirmation or concurrent edit). On success it inserts the revision, advances the
 * version columns and `updatedat`, and emits `dataset.version`. The revision's `changeKind` is the
 * first change at the highest level; the baseline revision's empty checksum is never compared.
 */
export async function applyVersionedChange(
  tx: Prisma.TransactionClient,
  input: ApplyVersionedChangeInput,
): Promise<ApplyVersionedChangeResult> {
  const confirmed = input.confirmFromVersion?.trim();
  if (!confirmed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: VERSION_BUMP_CONFIRMATION_REQUIRED,
    });
  }

  const locked = await tx.$queryRaw<LockedVersionRow[]>`
    SELECT dataset_version_major, dataset_version_minor, dataset_version_patch
    FROM public.experiments
    WHERE id = ${input.experimentId}::uuid
    FOR UPDATE
  `;
  const row = locked[0];
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
  }
  const current: DatasetVersion = {
    major: Number(row.dataset_version_major),
    minor: Number(row.dataset_version_minor),
    patch: Number(row.dataset_version_patch),
  };
  const fromLabel = formatDatasetVersion(current);

  let confirmedVersion: DatasetVersion;
  try {
    confirmedVersion = parseDatasetVersion(confirmed);
  } catch {
    throw new TRPCError({
      code: "CONFLICT",
      message: `Dataset version changed (confirmed ${confirmed}, current ${fromLabel}). Review and confirm again.`,
    });
  }
  if (formatDatasetVersion(confirmedVersion) !== fromLabel) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `Dataset version changed (confirmed ${confirmed}, current ${fromLabel}). Review and confirm again.`,
    });
  }

  const { level, primaryKind } = resolveBumpLevel(input.changes);
  const next = nextDatasetVersion(current, level);
  const toLabel = formatDatasetVersion(next);

  const revision = await tx.experimentRevision.create({
    data: {
      experimentId: input.experimentId,
      versionMajor: next.major,
      versionMinor: next.minor,
      versionPatch: next.patch,
      actorUserId: input.actorUserId,
      changeKind: primaryKind,
      parameters: input.parameters,
      derivedChecksum: input.derivedChecksum,
      kkDelta: input.kkDelta,
    },
    select: { id: true },
  });

  await tx.experiments.update({
    where: { id: input.experimentId },
    data: {
      datasetVersionMajor: next.major,
      datasetVersionMinor: next.minor,
      datasetVersionPatch: next.patch,
      updatedat: new Date(),
    },
  });

  await emitAuditEvent({
    eventType: "dataset.version",
    eventScope: `experiment:${input.experimentId}`,
    actorUserId: input.actorUserId,
    payload: {
      experimentId: input.experimentId,
      from: fromLabel,
      to: toLabel,
      level,
      changes: [...input.changes],
      revisionId: revision.id,
      ...(input.autoClosed ? { autoClosed: true } : {}),
    },
    db: tx,
  });

  const hasDeposit = await experimentHasZenodoDeposit(tx, input.experimentId);

  return { from: fromLabel, to: toLabel, revisionId: revision.id, hasDeposit };
}
