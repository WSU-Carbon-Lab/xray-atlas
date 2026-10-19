"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { ContributionAgreementModal } from "~/components/contribute/contribution-agreement-modal";
import {
  VersionBumpConfirmDialog,
  type VersionBumpPreview,
} from "./version-bump-confirm-dialog";

/** Dataset change kinds accepted by `experiments.previewVersionBump`. */
export type VersionedChangeKind =
  | "normalization"
  | "kk_first_calculation"
  | "kk_recalculation"
  | "aux_added"
  | "aux_removed";

/** Server message carried by the FORBIDDEN error when the contribution agreement is outdated. */
export const CONTRIBUTION_AGREEMENT_REQUIRED =
  "CONTRIBUTION_AGREEMENT_REQUIRED";

/** Outcome of {@link UseVersionedEditResult.runVersionedEdit}. */
export type VersionedEditOutcome<T> =
  | { status: "done"; value: T }
  | { status: "cancelled" };

export interface UseVersionedEditResult {
  /**
   * Previews the version bump for `changes`, asks the user to confirm, then runs `execute`
   * with `confirmVersionBump` set to the previewed current version.
   * A CONFLICT re-runs the preview and confirmation once more after a toast; a FORBIDDEN
   * `CONTRIBUTION_AGREEMENT_REQUIRED` opens the agreement modal and retries `execute` after
   * acceptance. Cancelling either dialog resolves `cancelled` without calling the mutation
   * (or, after a failed agreement, without retrying). Other errors are rethrown.
   */
  runVersionedEdit: <T>(
    experimentId: string,
    changes: readonly VersionedChangeKind[],
    execute: (confirmVersionBump: { fromVersion: string }) => Promise<T>,
  ) => Promise<VersionedEditOutcome<T>>;
  /** Dialogs to render once inside the owning component tree. */
  dialogs: ReactNode;
}

function trpcErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return undefined;
  }
  const data = (error as { data?: { code?: unknown } }).data;
  return typeof data?.code === "string" ? data.code : undefined;
}

function isAgreementRequired(error: unknown): boolean {
  return (
    trpcErrorCode(error) === "FORBIDDEN" &&
    error instanceof Error &&
    error.message === CONTRIBUTION_AGREEMENT_REQUIRED
  );
}

/**
 * Shared flow for dataset edits that advance the dataset version: server preview, confirm
 * dialog, mutation with a pinned `fromVersion`, and contribution-agreement recovery.
 */
export function useVersionedEdit(): UseVersionedEditResult {
  const utils = trpc.useUtils();
  const acceptAgreement = trpc.users.acceptContributionAgreement.useMutation();

  const [confirmState, setConfirmState] = useState<VersionBumpPreview | null>(
    null,
  );
  const confirmResolver = useRef<((ok: boolean) => void) | null>(null);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const agreementResolver = useRef<((ok: boolean) => void) | null>(null);

  // Dialog requests are serialized so overlapping calls each get their own answer.
  const confirmQueue = useRef<Promise<unknown>>(Promise.resolve());
  const agreementQueue = useRef<Promise<unknown>>(Promise.resolve());

  const askConfirm = useCallback((preview: VersionBumpPreview) => {
    const run = confirmQueue.current.then(
      () =>
        new Promise<boolean>((resolve) => {
          confirmResolver.current = resolve;
          setConfirmState(preview);
        }),
    );
    confirmQueue.current = run.catch(() => undefined);
    return run;
  }, []);

  const settleConfirm = useCallback((ok: boolean) => {
    setConfirmState(null);
    confirmResolver.current?.(ok);
    confirmResolver.current = null;
  }, []);

  const askAgreement = useCallback(() => {
    const run = agreementQueue.current.then(
      () =>
        new Promise<boolean>((resolve) => {
          agreementResolver.current = resolve;
          setAgreementOpen(true);
        }),
    );
    agreementQueue.current = run.catch(() => undefined);
    return run;
  }, []);

  const settleAgreement = useCallback((ok: boolean) => {
    setAgreementOpen(false);
    agreementResolver.current?.(ok);
    agreementResolver.current = null;
  }, []);

  const onAgreementAgree = useCallback(() => {
    acceptAgreement
      .mutateAsync()
      .then(() => {
        void utils.users.getContributionAgreementStatus.invalidate();
        settleAgreement(true);
      })
      .catch((error: unknown) => {
        showToast(
          error instanceof Error && error.message
            ? error.message
            : "Could not save your contribution agreement.",
          "error",
        );
        settleAgreement(false);
      });
  }, [acceptAgreement, settleAgreement, utils]);

  const runVersionedEdit = useCallback(
    async <T,>(
      experimentId: string,
      changes: readonly VersionedChangeKind[],
      execute: (confirmVersionBump: { fromVersion: string }) => Promise<T>,
    ): Promise<VersionedEditOutcome<T>> => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const preview = await utils.experiments.previewVersionBump.fetch(
          { experimentId, changes: [...changes] },
          { staleTime: 0 },
        );
        const confirmed = await askConfirm({
          currentVersion: preview.currentVersion,
          nextVersion: preview.nextVersion,
          level: preview.level,
          willMintDoi: preview.willMintDoi,
        });
        if (!confirmed) {
          return { status: "cancelled" };
        }
        const confirmVersionBump = { fromVersion: preview.currentVersion };
        try {
          let value: T;
          try {
            value = await execute(confirmVersionBump);
          } catch (error) {
            if (!isAgreementRequired(error)) throw error;
            const accepted = await askAgreement();
            if (!accepted) return { status: "cancelled" };
            value = await execute(confirmVersionBump);
          }
          return { status: "done", value };
        } catch (error) {
          if (trpcErrorCode(error) === "CONFLICT" && attempt === 0) {
            showToast(
              "This dataset changed since you opened it. Review the updated version and confirm again.",
              "info",
            );
            void utils.experiments.moleculeFormulaForExperiment.invalidate({
              experimentId,
            });
            continue;
          }
          throw error;
        }
      }
      return { status: "cancelled" };
    },
    [askAgreement, askConfirm, utils],
  );

  const dialogs = (
    <>
      {confirmState ? (
        <VersionBumpConfirmDialog
          isOpen
          preview={confirmState}
          onConfirm={() => settleConfirm(true)}
          onCancel={() => settleConfirm(false)}
        />
      ) : null}
      <ContributionAgreementModal
        isOpen={agreementOpen}
        onClose={() => settleAgreement(false)}
        onAgree={onAgreementAgree}
        isSubmitting={acceptAgreement.isPending}
      />
    </>
  );

  return { runVersionedEdit, dialogs };
}
