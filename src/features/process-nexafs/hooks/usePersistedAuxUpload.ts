"use client";

import { useCallback, useRef, useState } from "react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { useVersionedEdit } from "~/components/nexafs/use-versioned-edit";
import type { PendingAuxFile } from "~/features/process-nexafs/types";
import { createPendingAuxFile } from "~/lib/pending-aux-file";
import {
  inferAuxFileKindFromBatch,
  validateAuxFileForScope,
  type AuxFileKind,
  type AuxFileScope,
} from "~/lib/aux-file-client";
import {
  uploadQueuedAuxFiles,
  type AuxUploadProgress,
} from "~/hooks/useAuxFileUpload";

type UploadPersistedAuxFilesArgs = {
  scope: AuxFileScope;
  subjectId: string;
  files: File[];
  kind: AuxFileKind;
  description: string;
  onValidationError?: (message: string) => void;
};

type UsePersistedAuxUploadArgs = {
  experimentId: string | null;
  sampleId: string | null;
  onValidationError?: (message: string) => void;
};

/** Result of a persisted upload; `cancelled` is true when the user declined the version bump. */
export type PersistedAuxUploadResult = {
  uploaded: number;
  failed: Array<{ filename: string; message: string }>;
  cancelled?: boolean;
};

/**
 * Uploads auxiliary files immediately against persisted experiment or sample rows
 * and exposes upload progress keyed by ephemeral client keys.
 *
 * One call (one drop of N files) opens one upload session, asks the user once to confirm the
 * minor version bump before any file is sent, commits every file into the session, and closes
 * it with the confirmed version, so N files yield exactly one bump. Sample uploads are made
 * through `experimentId` (that experiment alone is bumped). A sample upload without an
 * experiment is refused. `removeFile` confirms and bumps once per removal. Render the
 * returned `dialogs` once in the owning tree.
 */
export function usePersistedAuxUpload({
  experimentId,
  sampleId,
  onValidationError,
}: UsePersistedAuxUploadArgs) {
  const utils = trpc.useUtils();
  const [uploadProgress, setUploadProgress] = useState<AuxUploadProgress>({});
  const { runVersionedEdit, dialogs } = useVersionedEdit();
  // One versioned aux operation at a time: a second drop while a dialog or upload is open is refused.
  const busyRef = useRef(false);

  const uploadPersistedFiles = useCallback(
    async ({
      scope,
      subjectId,
      files,
      kind,
      description,
      onValidationError: reportError,
    }: UploadPersistedAuxFilesArgs) => {
      if (files.length === 0) {
        return {
          uploaded: 0,
          failed: [] as Array<{ filename: string; message: string }>,
        };
      }
      if (busyRef.current) {
        showToast(
          "Another auxiliary file change is in progress. Wait for it to finish, then drop the files again.",
          "warning",
        );
        return {
          uploaded: 0,
          failed: [] as Array<{ filename: string; message: string }>,
          cancelled: true,
        } satisfies PersistedAuxUploadResult;
      }

      const pending: PendingAuxFile[] = [];
      for (const file of files) {
        const validation = validateAuxFileForScope(file, scope);
        if (!validation.ok) {
          reportError?.(`${file.name}: ${validation.message}`);
          continue;
        }
        pending.push(createPendingAuxFile(file, kind, description));
      }

      if (pending.length === 0) {
        return {
          uploaded: 0,
          failed: [] as Array<{ filename: string; message: string }>,
        };
      }

      busyRef.current = true;
      try {
        const sendFiles = (sessionId: string | undefined) =>
          uploadQueuedAuxFiles(utils, {
            scope,
            subjectId,
            files: pending,
            experimentId:
              scope === "sample" ? (experimentId ?? undefined) : undefined,
            sessionId,
            onProgress: (patch) => {
              setUploadProgress((prev) => ({ ...prev, ...patch }));
            },
          });

        let result: Awaited<ReturnType<typeof sendFiles>> | undefined;
        let cancelled = false;
        const versionedExperimentId =
          scope === "experiment" ? subjectId : experimentId;
        if (versionedExperimentId) {
          let sessionId: string | undefined;
          let sent: Awaited<ReturnType<typeof sendFiles>> | undefined;
          try {
            const outcome = await runVersionedEdit(
              versionedExperimentId,
              ["aux_added"],
              async (confirmVersionBump) => {
                // Cached so a CONFLICT retry only re-confirms the close and never re-uploads.
                sessionId ??= (
                  await utils.client.experimentFile.openUploadSession.mutate({
                    experimentId: versionedExperimentId,
                  })
                ).sessionId;
                sent ??= await sendFiles(sessionId);
                await utils.client.experimentFile.closeUploadSession.mutate({
                  sessionId,
                  confirmVersionBump,
                });
                return sent;
              },
            );
            if (outcome.status === "done") {
              result = outcome.value;
            } else {
              cancelled = true;
            }
          } catch (error) {
            showToast(
              error instanceof Error && error.message
                ? error.message
                : "Auxiliary upload failed.",
              "error",
            );
            result = sent;
          }
          void utils.experiments.previewVersionBump.invalidate();
        } else {
          result = {
            uploaded: 0,
            failed: pending.map((entry) => ({
              clientKey: entry.clientKey,
              filename: entry.file.name,
              message:
                "Sample files are committed through a dataset. Save the dataset first.",
            })),
          };
        }

        for (const entry of pending) {
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[entry.clientKey];
            return next;
          });
        }

        if (scope === "experiment") {
          await utils.experimentFile.list.invalidate({
            experimentId: subjectId,
          });
        } else {
          await utils.sampleFile.list.invalidate({ sampleId: subjectId });
        }

        return {
          uploaded: result?.uploaded ?? 0,
          failed: (result?.failed ?? []).map((row) => ({
            filename: row.filename,
            message: row.message,
          })),
          cancelled,
        } satisfies PersistedAuxUploadResult;
      } finally {
        busyRef.current = false;
      }
    },
    [experimentId, runVersionedEdit, utils],
  );

  const removeFile = useCallback(
    async (scope: AuxFileScope, fileId: string): Promise<boolean> => {
      const versionedExperimentId = experimentId;
      if (!versionedExperimentId) {
        return false;
      }
      if (busyRef.current) {
        showToast(
          "Another auxiliary file change is in progress. Wait for it to finish, then try again.",
          "warning",
        );
        return false;
      }
      busyRef.current = true;
      try {
        const outcome = await runVersionedEdit(
          versionedExperimentId,
          ["aux_removed"],
          (confirmVersionBump) =>
            scope === "experiment"
              ? utils.client.experimentFile.softDelete.mutate({
                  experimentId: versionedExperimentId,
                  fileId,
                  confirmVersionBump,
                })
              : utils.client.sampleFile.softDelete.mutate({
                  sampleId: sampleId ?? "",
                  experimentId: versionedExperimentId,
                  fileId,
                  confirmVersionBump,
                }),
        );
        if (outcome.status === "cancelled") {
          return false;
        }
        if (scope === "experiment") {
          await utils.experimentFile.list.invalidate({
            experimentId: versionedExperimentId,
          });
        } else if (sampleId) {
          await utils.sampleFile.list.invalidate({ sampleId });
        }
        return true;
      } catch (error) {
        showToast(
          error instanceof Error && error.message
            ? error.message
            : "Could not remove the file.",
          "error",
        );
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [experimentId, runVersionedEdit, sampleId, utils],
  );

  const uploadExperimentFiles = useCallback(
    async (files: File[], kind: AuxFileKind, description: string) => {
      if (!experimentId) {
        return;
      }
      const batchKind =
        files.length > 0 ? inferAuxFileKindFromBatch(files).kind : kind;
      return uploadPersistedFiles({
        scope: "experiment",
        subjectId: experimentId,
        files,
        kind: batchKind,
        description,
        onValidationError,
      });
    },
    [experimentId, onValidationError, uploadPersistedFiles],
  );

  const uploadSampleFiles = useCallback(
    async (files: File[], kind: AuxFileKind, description: string) => {
      if (!sampleId) {
        return;
      }
      const batchKind =
        files.length > 0 ? inferAuxFileKindFromBatch(files).kind : kind;
      return uploadPersistedFiles({
        scope: "sample",
        subjectId: sampleId,
        files,
        kind: batchKind,
        description,
        onValidationError,
      });
    },
    [onValidationError, sampleId, uploadPersistedFiles],
  );

  return {
    uploadProgress,
    uploadExperimentFiles,
    uploadSampleFiles,
    removeFile,
    dialogs,
  };
}
