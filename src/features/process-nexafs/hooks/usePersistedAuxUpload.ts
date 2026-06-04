"use client";

import { useCallback, useState } from "react";
import { trpc } from "~/trpc/client";
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

/**
 * Uploads auxiliary files immediately against persisted experiment or sample rows
 * and exposes upload progress keyed by ephemeral client keys.
 */
export function usePersistedAuxUpload({
  experimentId,
  sampleId,
  onValidationError,
}: UsePersistedAuxUploadArgs) {
  const utils = trpc.useUtils();
  const [uploadProgress, setUploadProgress] = useState<AuxUploadProgress>({});

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

      const pending = [];
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

      const result = await uploadQueuedAuxFiles(utils, {
        scope,
        subjectId,
        files: pending,
        onProgress: (patch) => {
          setUploadProgress((prev) => ({ ...prev, ...patch }));
        },
      });

      for (const entry of pending) {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[entry.clientKey];
          return next;
        });
      }

      if (scope === "experiment") {
        await utils.experimentFile.list.invalidate({ experimentId: subjectId });
      } else {
        await utils.sampleFile.list.invalidate({ sampleId: subjectId });
      }

      return {
        uploaded: result.uploaded,
        failed: result.failed.map((row) => ({
          filename: row.filename,
          message: row.message,
        })),
      };
    },
    [utils],
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
  };
}
