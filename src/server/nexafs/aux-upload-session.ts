/**
 * Auxiliary-data upload sessions: coalesce every auxiliary file addition or removal made while
 * editing one experiment into a single minor dataset version bump.
 *
 * A session is an `experiment_aux_sessions` row opened by one user for one experiment. File
 * mutations register `aux_added` / `aux_removed` markers on the open session instead of bumping;
 * closing the session applies one {@link applyVersionedChange} with the recorded kinds and then
 * queues the Zenodo sync. Only the experiment edited is bumped (no fan-out to other experiments
 * sharing a sample). It does not authorize callers: transport layers (tRPC, REST) must verify
 * edit rights on the experiment before calling these functions. All functions take a plain Prisma
 * client so tRPC procedures and REST routes share them.
 */

import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "~/prisma/client";
import {
  applyVersionedChange,
  canonicalJsonChecksum,
  datasetChangeKindSchema,
  experimentHasZenodoDeposit,
  readDatasetVersion,
  resolveBumpLevel,
  VERSION_BUMP_CONFIRMATION_REQUIRED,
} from "~/server/nexafs/apply-versioned-change";
import {
  formatDatasetVersion,
  nextDatasetVersion,
  type DatasetChangeKind,
  type VersionBumpLevel,
} from "~/server/nexafs/dataset-versioning";
import { syncAfterEdit } from "~/server/zenodo/zenodo-sync-queue";

/** Change kinds an auxiliary upload session records. */
export type AuxChangeKind = "aux_added" | "aux_removed";

/** Client usable both inside and outside a transaction for the session reads and writes. */
type SessionClient = PrismaClient | Prisma.TransactionClient;

/** Preview of the bump a session would apply if closed now. */
export interface AuxSessionBumpPreview {
  currentVersion: string;
  /** Equals `currentVersion` when the session recorded no changes. */
  nextVersion: string;
  /** Bump level of the recorded changes; null when nothing is recorded (no bump). */
  level: VersionBumpLevel | null;
  /** False when closing would not bump. */
  hasChanges: boolean;
  hasDeposit: boolean;
  /** Equals `hasDeposit`. */
  willMintDoi: boolean;
}

/** Result of {@link closeAuxUploadSession}; `from === to` when no bump occurred. */
export interface AuxSessionCloseResult {
  from: string;
  to: string;
}

const SESSION_CLOSED_MESSAGE = "Upload session is already closed";

function sessionNotFound(): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "Upload session not found",
  });
}

function toChangeKinds(raw: readonly string[]): DatasetChangeKind[] {
  const kinds = new Set<DatasetChangeKind>();
  for (const value of raw) {
    kinds.add(datasetChangeKindSchema.parse(value));
  }
  return [...kinds];
}

function countKind(raw: readonly string[], kind: AuxChangeKind): number {
  return raw.filter((value) => value === kind).length;
}

/**
 * Opens a session for `experimentId` owned by `actorUserId` and returns its id. The caller must
 * already have verified that the actor may edit the experiment. Throws NOT_FOUND when the
 * experiment does not exist.
 */
export async function openAuxUploadSession(
  db: SessionClient,
  input: { experimentId: string; actorUserId: string },
): Promise<{ sessionId: string }> {
  const experiment = await db.experiments.findUnique({
    where: { id: input.experimentId },
    select: { id: true },
  });
  if (!experiment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
  }
  const row = await db.experimentAuxSession.create({
    data: { experimentId: input.experimentId, actorUserId: input.actorUserId },
    select: { id: true },
  });
  return { sessionId: row.id };
}

/**
 * Appends one `kind` marker to the open session `sessionId`. Throws NOT_FOUND when the session
 * does not exist or, when `expected` is given, belongs to another experiment or opener, and
 * BAD_REQUEST when it is already closed. Safe inside the caller's transaction so the marker
 * commits atomically with the file mutation it describes.
 *
 * @param expected - Optional `experimentId` and `actorUserId` the session must belong to.
 */
export async function registerAuxChange(
  db: SessionClient,
  input: {
    sessionId: string;
    kind: AuxChangeKind;
    expected?: { experimentId?: string; actorUserId?: string };
  },
): Promise<void> {
  const session = await db.experimentAuxSession.findUnique({
    where: { id: input.sessionId },
    select: { experimentId: true, actorUserId: true, closedAt: true },
  });
  if (
    !session ||
    (input.expected?.experimentId !== undefined &&
      session.experimentId !== input.expected.experimentId) ||
    (input.expected?.actorUserId !== undefined &&
      session.actorUserId !== input.expected.actorUserId)
  ) {
    throw sessionNotFound();
  }
  const updated = await db.experimentAuxSession.updateMany({
    where: { id: input.sessionId, closedAt: null },
    data: { changes: { push: input.kind } },
  });
  if (updated.count === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: SESSION_CLOSED_MESSAGE,
    });
  }
}

/**
 * Previews the bump closing `sessionId` would apply, in the shape of
 * `experiments.previewVersionBump` plus `hasChanges`. Throws NOT_FOUND for an unknown session
 * (or one not opened by `actorUserId` when given) and BAD_REQUEST when it is already closed.
 */
export async function previewAuxSessionBump(
  db: SessionClient,
  input: { sessionId: string; actorUserId?: string },
): Promise<AuxSessionBumpPreview> {
  const session = await db.experimentAuxSession.findUnique({
    where: { id: input.sessionId },
  });
  if (
    !session ||
    (input.actorUserId !== undefined &&
      session.actorUserId !== input.actorUserId)
  ) {
    throw sessionNotFound();
  }
  if (session.closedAt !== null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: SESSION_CLOSED_MESSAGE,
    });
  }
  const current = await readDatasetVersion(db, session.experimentId);
  const currentVersion = formatDatasetVersion(current);
  const hasDeposit = await experimentHasZenodoDeposit(db, session.experimentId);
  const kinds = toChangeKinds(session.changes);
  if (kinds.length === 0) {
    return {
      currentVersion,
      nextVersion: currentVersion,
      level: null,
      hasChanges: false,
      hasDeposit,
      willMintDoi: hasDeposit,
    };
  }
  const { level } = resolveBumpLevel(kinds);
  return {
    currentVersion,
    nextVersion: formatDatasetVersion(nextDatasetVersion(current, level)),
    level,
    hasChanges: true,
    hasDeposit,
    willMintDoi: hasDeposit,
  };
}

/**
 * Closes `sessionId` and applies the recorded changes as one version bump.
 *
 * Only the opener (`actorUserId`) may close, and only once: a second close fails with
 * BAD_REQUEST. A session with no recorded changes closes without a bump and returns
 * `from === to`. Otherwise the session close and {@link applyVersionedChange} share one
 * transaction (a CONFLICT or missing confirmation leaves the session open) with revision
 * parameters `{ aux: { sessionId, added, removed } }` and a checksum over them, and
 * `syncAfterEdit` runs after commit. `confirmFromVersion` must equal the stored version.
 *
 * @throws TRPCError NOT_FOUND (unknown session or other opener), BAD_REQUEST
 * (`VERSION_BUMP_CONFIRMATION_REQUIRED` or already closed), CONFLICT (stale version).
 */
export async function closeAuxUploadSession(
  db: PrismaClient,
  input: {
    sessionId: string;
    actorUserId: string;
    confirmFromVersion: string | undefined;
  },
): Promise<AuxSessionCloseResult> {
  const result = await db.$transaction((tx) =>
    closeSessionInTransaction(tx, {
      sessionId: input.sessionId,
      actorUserId: input.actorUserId,
      confirmFromVersion: input.confirmFromVersion,
      autoClose: false,
    }),
  );
  if (result.bumped) {
    await syncAfterEdit({
      experimentId: result.experimentId,
      bump: { to: result.to },
    });
  }
  return { from: result.from, to: result.to };
}

/** Outcome of closing one session inside a transaction. */
interface SessionCloseOutcome {
  experimentId: string;
  from: string;
  to: string;
  bumped: boolean;
}

/**
 * Claims and closes a session on `tx`. For a user close, `actorUserId` must be the opener and
 * `confirmFromVersion` must match. For `autoClose`, the opener check is skipped, the experiment
 * row is locked and the bump is applied from its current version (the user confirmed this drop
 * before uploading), and the audit payload is marked `autoClosed`.
 */
async function closeSessionInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    sessionId: string;
    actorUserId: string | null;
    confirmFromVersion: string | undefined;
    autoClose: boolean;
  },
): Promise<SessionCloseOutcome> {
  const session = await tx.experimentAuxSession.findUnique({
    where: { id: input.sessionId },
  });
  if (
    !session ||
    (!input.autoClose && session.actorUserId !== input.actorUserId)
  ) {
    throw sessionNotFound();
  }
  const claimed = await tx.experimentAuxSession.updateMany({
    where: { id: input.sessionId, closedAt: null },
    data: { closedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: SESSION_CLOSED_MESSAGE,
    });
  }
  // Re-read after the claim: the row lock excludes concurrent registrations.
  const fresh = await tx.experimentAuxSession.findUniqueOrThrow({
    where: { id: input.sessionId },
    select: { changes: true },
  });
  const kinds = toChangeKinds(fresh.changes);
  if (kinds.length === 0) {
    const current = await readDatasetVersion(tx, session.experimentId);
    const label = formatDatasetVersion(current);
    return {
      experimentId: session.experimentId,
      from: label,
      to: label,
      bumped: false,
    };
  }
  let confirmFromVersion = input.confirmFromVersion;
  if (input.autoClose) {
    await tx.$queryRaw`
      SELECT id FROM public.experiments
      WHERE id = ${session.experimentId}::uuid
      FOR UPDATE
    `;
    confirmFromVersion = formatDatasetVersion(
      await readDatasetVersion(tx, session.experimentId),
    );
  } else if (!confirmFromVersion?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: VERSION_BUMP_CONFIRMATION_REQUIRED,
    });
  }
  const parameters = {
    aux: {
      sessionId: input.sessionId,
      added: countKind(fresh.changes, "aux_added"),
      removed: countKind(fresh.changes, "aux_removed"),
    },
  };
  const applied = await applyVersionedChange(tx, {
    experimentId: session.experimentId,
    actorUserId: session.actorUserId,
    changes: kinds,
    parameters,
    derivedChecksum: canonicalJsonChecksum(parameters),
    confirmFromVersion,
    autoClosed: input.autoClose,
  });
  return {
    experimentId: session.experimentId,
    from: applied.from,
    to: applied.to,
    bumped: true,
  };
}

/** Age after which an open upload session is closed by {@link closeStaleAuxUploadSessions}. */
export const AUX_SESSION_STALE_AFTER_MS = 30 * 60 * 1000;

/** Counts returned by {@link closeStaleAuxUploadSessions}. */
export interface StaleAuxSessionSweepSummary {
  /** Sessions closed with a bump. */
  bumped: number;
  /** Sessions closed with nothing recorded (no bump). */
  closedEmpty: number;
  /** Sessions whose close threw; they stay open and are retried next sweep. */
  failed: number;
}

/**
 * Closes every upload session still open {@link AUX_SESSION_STALE_AFTER_MS} (30 minutes) after
 * it was opened, at most `limit` per call, oldest first.
 *
 * Sessions with recorded changes are closed on behalf of their opener: the highest recorded
 * level is applied once from the experiment's CURRENT version under the row lock (a version
 * that moved since the drop never fails the sweep, because the user confirmed the drop before
 * uploading), the `dataset.version` audit payload carries `autoClosed: true`, and
 * `syncAfterEdit` runs after commit. Sessions with no changes are only marked closed. A
 * failing session is counted and skipped so one bad row cannot stall the sweep.
 *
 * @param now - Reference time; sessions opened before `now - 30 min` are stale.
 * @param limit - Maximum sessions processed in this call (positive integer).
 */
export async function closeStaleAuxUploadSessions(
  db: PrismaClient,
  now: Date,
  limit: number,
): Promise<StaleAuxSessionSweepSummary> {
  const cutoff = new Date(now.getTime() - AUX_SESSION_STALE_AFTER_MS);
  const stale = await db.experimentAuxSession.findMany({
    where: { closedAt: null, openedAt: { lt: cutoff } },
    orderBy: { openedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const summary: StaleAuxSessionSweepSummary = {
    bumped: 0,
    closedEmpty: 0,
    failed: 0,
  };
  for (const { id } of stale) {
    try {
      const outcome = await db.$transaction((tx) =>
        closeSessionInTransaction(tx, {
          sessionId: id,
          actorUserId: null,
          confirmFromVersion: undefined,
          autoClose: true,
        }),
      );
      if (outcome.bumped) {
        summary.bumped += 1;
        await syncAfterEdit({
          experimentId: outcome.experimentId,
          bump: { to: outcome.to },
        });
      } else {
        summary.closedEmpty += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error("[aux-sessions] auto-close failed", {
        sessionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return summary;
}

/** Window after creation during which the creator's first auxiliary uploads are not a bump. */
const INITIAL_UPLOAD_WINDOW_MS = 60 * 60 * 1000;

/**
 * Whether `actorUserId` may attach auxiliary files to `experimentId` as part of its initial
 * creation without a version bump: the actor created the experiment less than an hour ago, it
 * is still at version 1.0.0, and no Zenodo deposit exists yet (the first deposit then includes
 * the files).
 */
async function isInitialAuxUploadEligible(
  db: SessionClient,
  experimentId: string,
  actorUserId: string,
): Promise<boolean> {
  const row = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      createdby: true,
      createdat: true,
      datasetVersionMajor: true,
      datasetVersionMinor: true,
      datasetVersionPatch: true,
    },
  });
  if (!row || row.createdby !== actorUserId) return false;
  if (
    row.datasetVersionMajor !== 1 ||
    row.datasetVersionMinor !== 0 ||
    row.datasetVersionPatch !== 0
  ) {
    return false;
  }
  if (Date.now() - row.createdat.getTime() > INITIAL_UPLOAD_WINDOW_MS)
    return false;
  return !(await experimentHasZenodoDeposit(db, experimentId));
}

/**
 * Runs one auxiliary file mutation `mutate` and accounts for its version effect.
 *
 * With `sessionId`, `mutate` and the session marker commit in one transaction and no bump
 * happens (the session close bumps once). Without a session it behaves as a one-file session
 * closed immediately: `confirmFromVersion` is required (BAD_REQUEST
 * `VERSION_BUMP_CONFIRMATION_REQUIRED`, checked before `mutate` runs), and `mutate`, the
 * revision, and the version bump commit atomically, followed by `syncAfterEdit`. The caller
 * must already have authorized the edit on `experimentId`.
 *
 * `initialUpload` marks the creator's first uploads right after the experiment is created: when
 * {@link isInitialAuxUploadEligible} holds and no session is given, `mutate` runs without a
 * bump or confirmation; otherwise the call is treated as a normal bump.
 *
 * @param mutate - Database writes for the file change, run on the transaction client.
 * @returns The value `mutate` returned.
 */
export async function runAuxFileMutation<T>(
  db: PrismaClient,
  input: {
    experimentId: string;
    actorUserId: string;
    kind: AuxChangeKind;
    sessionId: string | undefined;
    confirmFromVersion: string | undefined;
    initialUpload?: boolean;
    mutate: (tx: Prisma.TransactionClient) => Promise<T>;
  },
): Promise<T> {
  if (input.sessionId !== undefined) {
    const sessionId = input.sessionId;
    return db.$transaction(async (tx) => {
      await registerAuxChange(tx, {
        sessionId,
        kind: input.kind,
        expected: {
          experimentId: input.experimentId,
          actorUserId: input.actorUserId,
        },
      });
      return input.mutate(tx);
    });
  }

  if (
    input.initialUpload === true &&
    input.kind === "aux_added" &&
    (await isInitialAuxUploadEligible(
      db,
      input.experimentId,
      input.actorUserId,
    ))
  ) {
    return db.$transaction((tx) => input.mutate(tx));
  }

  if (!input.confirmFromVersion?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: VERSION_BUMP_CONFIRMATION_REQUIRED,
    });
  }
  const parameters = {
    aux: {
      added: input.kind === "aux_added" ? 1 : 0,
      removed: input.kind === "aux_removed" ? 1 : 0,
    },
  };
  const { value, to } = await db.$transaction(async (tx) => {
    const mutated = await input.mutate(tx);
    const applied = await applyVersionedChange(tx, {
      experimentId: input.experimentId,
      actorUserId: input.actorUserId,
      changes: [input.kind],
      parameters,
      derivedChecksum: canonicalJsonChecksum(parameters),
      confirmFromVersion: input.confirmFromVersion,
    });
    return { value: mutated, to: applied.to };
  });
  await syncAfterEdit({ experimentId: input.experimentId, bump: { to } });
  return value;
}
