"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  AuxFileDropZone,
  AuxUploadDefaultsRow,
} from "~/components/forms";
import { GLOBAL_DROP_ZONE_IDS } from "~/hooks/useGlobalFileDropZone";
import type { AuxFileKind } from "~/lib/aux-file-client";
import type { DatasetState, PendingAuxFile } from "~/features/process-nexafs/types";
import { usePersistedAuxUpload } from "~/features/process-nexafs/hooks/usePersistedAuxUpload";
import { trpc } from "~/trpc/client";
import {
  DatasetAuxExplorer,
  type AuxExplorerFile,
} from "./dataset-aux-explorer";

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

export type DatasetAuxFilesTabProps = {
  variant: "draft" | "persisted";
  dataset: DatasetState;
  pendingKind: AuxFileKind;
  pendingDescription: string;
  onPendingKindChange: (kind: AuxFileKind) => void;
  onPendingDescriptionChange: (description: string) => void;
  onDatasetUpdate?: (datasetId: string, updates: DatasetStatePatch) => void;
  onValidationError?: (message: string) => void;
  onUploadComplete?: (message: string, type: "success" | "warning") => void;
  onDropTargetsChange?: (active: AuxDropTargetsActive) => void;
  auxTabActive: boolean;
};

/**
 * Two-column auxiliary-files tab: directory explorer on the left and compact
 * upload drop zones on the right (when the user may edit or the tab is draft).
 */
export function DatasetAuxFilesTab({
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
}: DatasetAuxFilesTabProps) {
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
  const showUploadPanel = !isPersisted || canEdit;

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
      experiment: showUploadPanel,
      sample: showUploadPanel && (isPersisted ? Boolean(sampleId) : true),
    });
  }, [
    auxTabActive,
    isPersisted,
    onDropTargetsChange,
    sampleId,
    showUploadPanel,
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

  const experimentFiles: AuxExplorerFile[] = experimentListQuery.data ?? [];
  const sampleFiles: AuxExplorerFile[] = sampleListQuery.data ?? [];

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

      <div
        className={cn(
          "grid w-full items-start gap-4",
          showUploadPanel ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        <DatasetAuxExplorer
          variant={variant}
          experimentFiles={experimentFiles}
          sampleFiles={sampleFiles}
          sampleLinked={isPersisted ? Boolean(sampleId) : true}
          experimentLoading={experimentListQuery.isLoading}
          sampleLoading={sampleListQuery.isLoading}
          draftPendingExperiment={dataset.pendingExperimentAuxFiles}
          draftPendingSample={dataset.pendingSampleAuxFiles}
          canEdit={canEdit}
          deletingFileId={deletingFileId}
          onDeleteExperimentFile={
            isPersisted && canEdit
              ? (fileId) => {
                  setDeletingFileId(fileId);
                  experimentSoftDelete.mutate({ experimentId, fileId });
                }
              : undefined
          }
          onDeleteSampleFile={
            isPersisted && canEdit && sampleId
              ? (fileId) => {
                  setDeletingFileId(fileId);
                  sampleSoftDelete.mutate({ sampleId, fileId });
                }
              : undefined
          }
        />

        {showUploadPanel ? (
          <div className="flex flex-col gap-3">
            <AuxUploadDefaultsRow
              pendingKind={pendingKind}
              pendingDescription={pendingDescription}
              onPendingKindChange={onPendingKindChange}
              onPendingDescriptionChange={onPendingDescriptionChange}
              disabled={uploadBusy}
            />
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
              onFilesChange={handleExperimentQueueChange}
              disabled={uploadBusy}
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
              description="Images and prep notes (up to 50 MB each)."
              globalDropZoneId={GLOBAL_DROP_ZONE_IDS.NEXAFS_SAMPLE_AUX}
              files={sampleDropFiles}
              onFilesChange={handleSampleQueueChange}
              disabled={uploadBusy}
              uploadProgress={isPersisted ? uploadProgress : undefined}
              onValidationError={onValidationError}
            />
            {uploadBusy ? (
              <p
                className="text-muted flex items-center gap-2 text-xs"
                role="status"
              >
                <Spinner size="sm" color="current" />
                Uploading auxiliary files…
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
