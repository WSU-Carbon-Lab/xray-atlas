"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "@heroui/react";
import {
  AuxFileDropZone,
  AuxUploadDefaultsRow,
  type AuxPersistedDisplayFile,
} from "~/components/forms";
import { GLOBAL_DROP_ZONE_IDS } from "~/hooks/useGlobalFileDropZone";
import type { AuxFileKind } from "~/lib/aux-file-client";
import type { DatasetState, PendingAuxFile } from "~/features/process-nexafs/types";
import { usePersistedAuxUpload } from "~/features/process-nexafs/hooks/usePersistedAuxUpload";
import { trpc } from "~/trpc/client";

/** When true, global experiment or sample aux drop handlers accept file drops. */
export type AuxDropTargetsActive = {
  experiment: boolean;
  sample: boolean;
};

/** @deprecated Use {@link AuxDropTargetsActive}. */
export type PersistedAuxAccordionExpanded = AuxDropTargetsActive;

type DatasetStatePatch =
  | Partial<DatasetState>
  | ((dataset: DatasetState) => Partial<DatasetState>);

/** Minimal dataset fields required by the auxiliary-files panel. */
export type DatasetAuxFilesDatasetRef = Pick<
  DatasetState,
  | "id"
  | "persistedExperimentId"
  | "persistedSampleId"
  | "pendingExperimentAuxFiles"
  | "pendingSampleAuxFiles"
>;

/**
 * Builds a dataset ref for browse panels that only need persisted aux file ids.
 */
export function browseAuxDatasetRef(
  experimentId: string,
  sampleId: string | null,
): DatasetAuxFilesDatasetRef {
  return {
    id: experimentId,
    persistedExperimentId: experimentId,
    persistedSampleId: sampleId,
    pendingExperimentAuxFiles: [],
    pendingSampleAuxFiles: [],
  };
}

export type DatasetAuxFilesPanelProps = {
  variant: "draft" | "persisted";
  dataset: DatasetAuxFilesDatasetRef;
  pendingKind: AuxFileKind;
  pendingDescription: string;
  onPendingKindChange: (kind: AuxFileKind) => void;
  onPendingDescriptionChange: (description: string) => void;
  onDatasetUpdate?: (datasetId: string, updates: DatasetStatePatch) => void;
  onValidationError?: (message: string) => void;
  onUploadComplete?: (message: string, type: "success" | "warning") => void;
  onDropTargetsChange?: (active: AuxDropTargetsActive) => void;
  auxTabActive: boolean;
  /** When false, drop zones and global drop targets stay off (browse upload lock). */
  uploadDropEnabled?: boolean;
};

/**
 * Two-column auxiliary-files panel: experiment and sample compact upload panels
 * each list queued (draft or in-flight) and persisted files in the stack UI.
 */
export function DatasetAuxFilesPanel({
  variant,
  dataset,
  pendingKind,
  pendingDescription,
  onPendingKindChange,
  onPendingDescriptionChange,
  onDatasetUpdate,
  onValidationError,
  onUploadComplete,
  onDropTargetsChange,
  auxTabActive,
  uploadDropEnabled = true,
}: DatasetAuxFilesPanelProps) {
  const isPersisted = variant === "persisted";
  const experimentId = dataset.persistedExperimentId ?? "";
  const sampleId = dataset.persistedSampleId;

  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [experimentQueue, setExperimentQueue] = useState<PendingAuxFile[]>([]);
  const [sampleQueue, setSampleQueue] = useState<PendingAuxFile[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: isPersisted && Boolean(experimentId) },
  );
  const canEdit = isPersisted ? (canEditQuery.data?.canEdit ?? false) : true;
  const canUpload = canEdit && uploadDropEnabled;
  const canMutateFiles = canEdit && uploadDropEnabled;

  const experimentListQuery = trpc.experimentFile.list.useQuery(
    { experimentId },
    { enabled: isPersisted && Boolean(experimentId) },
  );
  const sampleListQuery = trpc.sampleFile.list.useQuery(
    { sampleId: sampleId ?? "" },
    { enabled: isPersisted && Boolean(sampleId) },
  );

  const experimentSoftDelete = trpc.experimentFile.softDelete.useMutation({
    onSettled: () => {
      setDeletingFileId(null);
      void experimentListQuery.refetch();
    },
  });
  const sampleSoftDelete = trpc.sampleFile.softDelete.useMutation({
    onSettled: () => {
      setDeletingFileId(null);
      void sampleListQuery.refetch();
    },
  });

  const { uploadProgress, uploadExperimentFiles, uploadSampleFiles } =
    usePersistedAuxUpload({
      experimentId: isPersisted ? experimentId : null,
      sampleId: isPersisted ? sampleId : null,
      onValidationError,
    });

  useEffect(() => {
    if (!auxTabActive) {
      onDropTargetsChange?.({ experiment: false, sample: false });
      return;
    }
    onDropTargetsChange?.({
      experiment: canUpload,
      sample: canUpload && (isPersisted ? Boolean(sampleId) : true),
    });
  }, [
    auxTabActive,
    canUpload,
    isPersisted,
    onDropTargetsChange,
    sampleId,
  ]);

  const runExperimentUpload = useCallback(
    async (files: File[]) => {
      if (!isPersisted || !canEdit || files.length === 0) {
        return;
      }
      setUploadBusy(true);
      try {
        const result = await uploadExperimentFiles(
          files,
          pendingKind,
          pendingDescription,
        );
        if (!result) {
          return;
        }
        if (result.uploaded > 0) {
          onUploadComplete?.(
            result.uploaded === 1
              ? "Experiment file uploaded."
              : `${result.uploaded} experiment files uploaded.`,
            "success",
          );
        }
        if (result.failed.length > 0) {
          onUploadComplete?.(
            `${result.failed.length} experiment file(s) failed to upload.`,
            "warning",
          );
        }
      } finally {
        setUploadBusy(false);
        setExperimentQueue([]);
      }
    },
    [
      canEdit,
      isPersisted,
      onUploadComplete,
      pendingDescription,
      pendingKind,
      uploadExperimentFiles,
    ],
  );

  const runSampleUpload = useCallback(
    async (files: File[]) => {
      if (!isPersisted || !canEdit || !sampleId || files.length === 0) {
        return;
      }
      setUploadBusy(true);
      try {
        const result = await uploadSampleFiles(
          files,
          pendingKind,
          pendingDescription,
        );
        if (!result) {
          return;
        }
        if (result.uploaded > 0) {
          onUploadComplete?.(
            result.uploaded === 1
              ? "Sample file uploaded."
              : `${result.uploaded} sample files uploaded.`,
            "success",
          );
        }
        if (result.failed.length > 0) {
          onUploadComplete?.(
            `${result.failed.length} sample file(s) failed to upload.`,
            "warning",
          );
        }
      } finally {
        setUploadBusy(false);
        setSampleQueue([]);
      }
    },
    [
      canEdit,
      isPersisted,
      onUploadComplete,
      pendingDescription,
      pendingKind,
      sampleId,
      uploadSampleFiles,
    ],
  );

  const handleExperimentQueueChange = useCallback(
    (next: PendingAuxFile[]) => {
      if (isPersisted) {
        const added = next.filter(
          (entry) =>
            !experimentQueue.some((row) => row.clientKey === entry.clientKey),
        );
        setExperimentQueue(next);
        if (added.length > 0) {
          void runExperimentUpload(added.map((row) => row.file));
        }
        return;
      }
      onDatasetUpdate?.(dataset.id, {
        pendingExperimentAuxFiles: next,
      });
    },
    [
      dataset.id,
      experimentQueue,
      isPersisted,
      onDatasetUpdate,
      runExperimentUpload,
    ],
  );

  const handleSampleQueueChange = useCallback(
    (next: PendingAuxFile[]) => {
      if (isPersisted) {
        const added = next.filter(
          (entry) =>
            !sampleQueue.some((row) => row.clientKey === entry.clientKey),
        );
        setSampleQueue(next);
        if (added.length > 0) {
          void runSampleUpload(added.map((row) => row.file));
        }
        return;
      }
      onDatasetUpdate?.(dataset.id, {
        pendingSampleAuxFiles: next,
      });
    },
    [dataset.id, isPersisted, onDatasetUpdate, runSampleUpload, sampleQueue],
  );

  const persistedExperimentFiles: AuxPersistedDisplayFile[] =
    experimentListQuery.data ?? [];
  const persistedSampleFiles: AuxPersistedDisplayFile[] =
    sampleListQuery.data ?? [];

  const readOnlyHint = useMemo(() => {
    if (!isPersisted) {
      return null;
    }
    if (canEditQuery.isLoading) {
      return "Checking edit permissions…";
    }
    if (!canEdit) {
      return "You can view auxiliary files on this dataset but cannot add or remove them.";
    }
    return null;
  }, [canEdit, canEditQuery.isLoading, isPersisted]);

  const experimentDropFiles = isPersisted
    ? experimentQueue
    : dataset.pendingExperimentAuxFiles;
  const sampleDropFiles = isPersisted
    ? sampleQueue
    : dataset.pendingSampleAuxFiles;

  const samplePanelDisabled =
    uploadBusy || !canUpload || (isPersisted && !sampleId);

  return (
    <section
      className="flex w-full flex-col gap-4"
      aria-labelledby="dataset-aux-files-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="dataset-aux-files-heading"
            className="text-foreground text-sm font-semibold leading-none"
          >
            Auxiliary files
          </h2>
          {readOnlyHint ? (
            <p className="text-muted mt-1 text-xs leading-snug">
              {readOnlyHint}
            </p>
          ) : null}
        </div>
      </div>

      {canUpload ? (
        <AuxUploadDefaultsRow
          pendingKind={pendingKind}
          pendingDescription={pendingDescription}
          onPendingKindChange={onPendingKindChange}
          onPendingDescriptionChange={onPendingDescriptionChange}
          disabled={uploadBusy}
        />
      ) : null}

      <div className="grid w-full items-stretch gap-4 lg:grid-cols-2">
        <AuxFileDropZone
          variant="compact"
          hideUploadDefaults
          pendingKind={pendingKind}
          pendingDescription={pendingDescription}
          scope="experiment"
          title="Experiment files"
          description="Protocols, raw beamline data (up to 500 MB each)."
          globalDropZoneId={GLOBAL_DROP_ZONE_IDS.NEXAFS_EXPERIMENT_AUX}
          files={experimentDropFiles}
          persistedFiles={
            isPersisted ? persistedExperimentFiles : undefined
          }
          onPersistedFileRemove={
            isPersisted && canMutateFiles
              ? (fileId) => {
                  setDeletingFileId(fileId);
                  experimentSoftDelete.mutate({ experimentId, fileId });
                }
              : undefined
          }
          persistedRemovingFileId={deletingFileId}
          onFilesChange={handleExperimentQueueChange}
          disabled={uploadBusy || !canUpload}
          uploadProgress={isPersisted ? uploadProgress : undefined}
          onValidationError={onValidationError}
        />
        <AuxFileDropZone
          variant="compact"
          hideUploadDefaults
          pendingKind={pendingKind}
          pendingDescription={pendingDescription}
          scope="sample"
          title="Sample files"
          description={
            isPersisted && !sampleId
              ? "Link a sample to upload sample auxiliary files."
              : "Images and prep notes (up to 50 MB each)."
          }
          globalDropZoneId={GLOBAL_DROP_ZONE_IDS.NEXAFS_SAMPLE_AUX}
          files={sampleDropFiles}
          persistedFiles={isPersisted ? persistedSampleFiles : undefined}
          onPersistedFileRemove={
            isPersisted && canMutateFiles && sampleId
              ? (fileId) => {
                  setDeletingFileId(fileId);
                  sampleSoftDelete.mutate({ sampleId, fileId });
                }
              : undefined
          }
          persistedRemovingFileId={deletingFileId}
          onFilesChange={handleSampleQueueChange}
          disabled={samplePanelDisabled}
          uploadProgress={isPersisted ? uploadProgress : undefined}
          onValidationError={onValidationError}
        />
      </div>

      {uploadBusy ? (
        <p
          className="text-muted flex items-center gap-2 text-xs"
          role="status"
        >
          <Spinner size="sm" color="current" />
          Uploading auxiliary files…
        </p>
      ) : null}
    </section>
  );
}

/** @deprecated Prefer {@link DatasetAuxFilesPanel}. */
export type DatasetAuxFilesTabProps = DatasetAuxFilesPanelProps;

/** @deprecated Prefer {@link DatasetAuxFilesPanel}. */
export const DatasetAuxFilesTab = DatasetAuxFilesPanel;
