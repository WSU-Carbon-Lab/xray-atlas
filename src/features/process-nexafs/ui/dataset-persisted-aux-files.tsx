"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Accordion, Button, Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import { FileIcon, Trash2 } from "lucide-react";
import {
  AuxFileDropZone,
  AuxUploadDefaultsRow,
} from "~/components/forms";
import { GLOBAL_DROP_ZONE_IDS } from "~/hooks/useGlobalFileDropZone";
import {
  AUX_FILE_KIND_LABELS,
  formatAuxFileSize,
  type AuxFileKind,
} from "~/lib/aux-file-client";
import type { PendingAuxFile } from "~/features/process-nexafs/types";
import { usePersistedAuxUpload } from "~/features/process-nexafs/hooks/usePersistedAuxUpload";
import { trpc } from "~/trpc/client";

const EXPERIMENT_AUX_ACCORDION_ID = "persisted-experiment-aux";
const SAMPLE_AUX_ACCORDION_ID = "persisted-sample-aux";

type SerializedAuxFile = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  kind: string;
  description: string | null;
};

type PersistedAuxFileListProps = {
  files: SerializedAuxFile[];
  canEdit: boolean;
  deletingFileId: string | null;
  onDelete: (fileId: string) => void;
  emptyMessage: string;
};

function PersistedAuxFileList({
  files,
  canEdit,
  deletingFileId,
  onDelete,
  emptyMessage,
}: PersistedAuxFileListProps) {
  if (files.length === 0) {
    return (
      <p className="text-muted text-xs leading-snug">{emptyMessage}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {files.map((file) => {
        const kindLabel =
          file.kind in AUX_FILE_KIND_LABELS
            ? AUX_FILE_KIND_LABELS[file.kind as AuxFileKind]
            : file.kind;
        const isDeleting = deletingFileId === file.id;
        return (
          <li
            key={file.id}
            className="border-border bg-field-background flex items-center gap-2 rounded-lg border px-2.5 py-2"
          >
            <FileIcon className="text-muted size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">
                {file.originalFilename}
              </p>
              <p className="text-muted text-xs">
                {kindLabel}
                {file.description ? ` · ${file.description}` : ""}
                {" · "}
                {formatAuxFileSize(file.sizeBytes)}
              </p>
            </div>
            {canEdit ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={`Remove ${file.originalFilename}`}
                isDisabled={isDeleting}
                onPress={() => onDelete(file.id)}
              >
                {isDeleting ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export type PersistedAuxAccordionExpanded = {
  experiment: boolean;
  sample: boolean;
};

export type DatasetPersistedAuxFilesAccordionProps = {
  experimentId: string;
  sampleId: string | null;
  pendingKind: AuxFileKind;
  pendingDescription: string;
  onPendingKindChange: (kind: AuxFileKind) => void;
  onPendingDescriptionChange: (description: string) => void;
  onValidationError?: (message: string) => void;
  onUploadComplete?: (message: string, type: "success" | "warning") => void;
  onExpandedChange?: (expanded: PersistedAuxAccordionExpanded) => void;
};

/**
 * Accordion below the dataset plot for uploading and listing committed experiment
 * and sample auxiliary files after the experiment row exists in the database.
 */
export function DatasetPersistedAuxFilesAccordion({
  experimentId,
  sampleId,
  pendingKind,
  pendingDescription,
  onPendingKindChange,
  onPendingDescriptionChange,
  onValidationError,
  onUploadComplete,
  onExpandedChange,
}: DatasetPersistedAuxFilesAccordionProps) {
  const [expandedKeys, setExpandedKeys] = useState(
    () => new Set([EXPERIMENT_AUX_ACCORDION_ID]),
  );
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [experimentQueue, setExperimentQueue] = useState<PendingAuxFile[]>([]);
  const [sampleQueue, setSampleQueue] = useState<PendingAuxFile[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: Boolean(experimentId) },
  );
  const canEdit = canEditQuery.data?.canEdit ?? false;

  const experimentListQuery = trpc.experimentFile.list.useQuery(
    { experimentId },
    { enabled: Boolean(experimentId) },
  );
  const sampleListQuery = trpc.sampleFile.list.useQuery(
    { sampleId: sampleId ?? "" },
    { enabled: Boolean(sampleId) },
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
      experimentId,
      sampleId,
      onValidationError,
    });

  const experimentExpanded = expandedKeys.has(EXPERIMENT_AUX_ACCORDION_ID);
  const sampleExpanded = expandedKeys.has(SAMPLE_AUX_ACCORDION_ID);

  useEffect(() => {
    onExpandedChange?.({
      experiment: experimentExpanded,
      sample: sampleExpanded,
    });
  }, [experimentExpanded, onExpandedChange, sampleExpanded]);

  const runExperimentUpload = useCallback(
    async (files: File[]) => {
      if (!canEdit || files.length === 0) {
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
      onUploadComplete,
      pendingDescription,
      pendingKind,
      uploadExperimentFiles,
    ],
  );

  const runSampleUpload = useCallback(
    async (files: File[]) => {
      if (!canEdit || !sampleId || files.length === 0) {
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
      onUploadComplete,
      pendingDescription,
      pendingKind,
      sampleId,
      uploadSampleFiles,
    ],
  );

  const handleExperimentQueueChange = useCallback(
    (next: PendingAuxFile[]) => {
      const added = next.filter(
        (entry) =>
          !experimentQueue.some((row) => row.clientKey === entry.clientKey),
      );
      setExperimentQueue(next);
      if (added.length > 0) {
        void runExperimentUpload(added.map((row) => row.file));
      }
    },
    [experimentQueue, runExperimentUpload],
  );

  const handleSampleQueueChange = useCallback(
    (next: PendingAuxFile[]) => {
      const added = next.filter(
        (entry) =>
          !sampleQueue.some((row) => row.clientKey === entry.clientKey),
      );
      setSampleQueue(next);
      if (added.length > 0) {
        void runSampleUpload(added.map((row) => row.file));
      }
    },
    [runSampleUpload, sampleQueue],
  );

  const experimentFiles = experimentListQuery.data ?? [];
  const sampleFiles = sampleListQuery.data ?? [];

  const readOnlyHint = useMemo(() => {
    if (canEditQuery.isLoading) {
      return "Checking edit permissions…";
    }
    if (!canEdit) {
      return "You can view auxiliary files on this dataset but cannot add or remove them.";
    }
    return null;
  }, [canEdit, canEditQuery.isLoading]);

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="persisted-aux-files-heading"
    >
      <div>
        <h2
          id="persisted-aux-files-heading"
          className="text-muted text-sm font-medium leading-none"
        >
          Auxiliary files
        </h2>
        <p className="text-muted mt-1 text-xs leading-snug">
          Upload attaches files to this dataset immediately. Expand a section to
          enable drag-and-drop for that target.
        </p>
        {readOnlyHint ? (
          <p className="text-muted mt-1 text-xs leading-snug">{readOnlyHint}</p>
        ) : null}
      </div>

      {canEdit ? (
        <AuxUploadDefaultsRow
          pendingKind={pendingKind}
          pendingDescription={pendingDescription}
          onPendingKindChange={onPendingKindChange}
          onPendingDescriptionChange={onPendingDescriptionChange}
          disabled={uploadBusy}
        />
      ) : null}

      <Accordion
        allowsMultipleExpanded
        variant="surface"
        aria-label="Persisted auxiliary files"
        className="border-border w-full rounded-lg border"
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) => {
          setExpandedKeys(new Set([...keys].map(String)));
        }}
      >
        <Accordion.Item id={EXPERIMENT_AUX_ACCORDION_ID}>
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Experiment files
              </span>
              <span className="text-muted shrink-0 text-xs tabular-nums">
                {experimentFiles.length}
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="flex flex-col gap-3 pt-0">
              <PersistedAuxFileList
                files={experimentFiles}
                canEdit={canEdit}
                deletingFileId={deletingFileId}
                onDelete={(fileId) => {
                  setDeletingFileId(fileId);
                  experimentSoftDelete.mutate({ experimentId, fileId });
                }}
                emptyMessage="No experiment auxiliary files uploaded yet."
              />
              {canEdit && experimentExpanded ? (
                <AuxFileDropZone
                  variant="compact"
                  hideUploadDefaults
                  pendingKind={pendingKind}
                  pendingDescription={pendingDescription}
                  scope="experiment"
                  title="Add experiment files"
                  description="Protocols, raw beamline data (up to 500 MB each)."
                  globalDropZoneId={GLOBAL_DROP_ZONE_IDS.NEXAFS_EXPERIMENT_AUX}
                  files={experimentQueue}
                  onFilesChange={handleExperimentQueueChange}
                  disabled={uploadBusy}
                  uploadProgress={uploadProgress}
                  onValidationError={onValidationError}
                />
              ) : null}
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item id={SAMPLE_AUX_ACCORDION_ID}>
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                Sample files
              </span>
              <span className="text-muted shrink-0 text-xs tabular-nums">
                {sampleId ? sampleFiles.length : "—"}
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="flex flex-col gap-3 pt-0">
              {!sampleId ? (
                <p className="text-muted text-xs leading-snug">
                  No sample is linked to this experiment.
                </p>
              ) : (
                <>
                  <PersistedAuxFileList
                    files={sampleFiles}
                    canEdit={canEdit}
                    deletingFileId={deletingFileId}
                    onDelete={(fileId) => {
                      if (!sampleId) {
                        return;
                      }
                      setDeletingFileId(fileId);
                      sampleSoftDelete.mutate({ sampleId, fileId });
                    }}
                    emptyMessage="No sample auxiliary files uploaded yet."
                  />
                  {canEdit && sampleExpanded ? (
                    <AuxFileDropZone
                      variant="compact"
                      hideUploadDefaults
                      pendingKind={pendingKind}
                      pendingDescription={pendingDescription}
                      scope="sample"
                      title="Add sample files"
                      description="Images and prep notes (up to 50 MB each)."
                      globalDropZoneId={GLOBAL_DROP_ZONE_IDS.NEXAFS_SAMPLE_AUX}
                      files={sampleQueue}
                      onFilesChange={handleSampleQueueChange}
                      disabled={uploadBusy}
                      uploadProgress={uploadProgress}
                      onValidationError={onValidationError}
                    />
                  ) : null}
                </>
              )}
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {uploadBusy ? (
        <p
          className={cn(
            "text-muted flex items-center gap-2 text-xs",
          )}
          role="status"
        >
          <Spinner size="sm" color="current" />
          Uploading auxiliary files…
        </p>
      ) : null}
    </section>
  );
}
