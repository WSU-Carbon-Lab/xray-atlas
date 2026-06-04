"use client";

import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";
import { Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  AUX_FILE_KIND_LABELS,
  formatAuxFileSize,
  type AuxFileKind,
} from "~/lib/aux-file-client";
import type { PendingAuxFile } from "~/features/process-nexafs/types";

export type AuxExplorerFile = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  kind: string;
  description: string | null;
};

type AuxExplorerFolderProps = {
  folderLabel: string;
  folderPath: string;
  files: AuxExplorerFile[];
  emptyMessage: string;
  isLoading?: boolean;
  canEdit?: boolean;
  deletingFileId?: string | null;
  onDelete?: (fileId: string) => void;
};

function kindLabelFor(kind: string): string {
  return kind in AUX_FILE_KIND_LABELS
    ? AUX_FILE_KIND_LABELS[kind as AuxFileKind]
    : kind;
}

function AuxExplorerFolder({
  folderLabel,
  folderPath,
  files,
  emptyMessage,
  isLoading,
  canEdit,
  deletingFileId,
  onDelete,
}: AuxExplorerFolderProps) {
  return (
    <div className="flex flex-col">
      <div className="text-foreground flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium">
        <ChevronRight className="text-muted size-3.5 shrink-0" aria-hidden />
        <FolderIcon className="text-muted size-4 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">{folderPath}</span>
        <span className="text-muted ms-auto shrink-0 text-xs tabular-nums">
          {files.length}
        </span>
      </div>
      <div className="border-border ms-3 border-s ps-2">
        {isLoading ? (
          <p className="text-muted flex items-center gap-2 px-2 py-2 text-xs">
            <Spinner size="sm" color="current" />
            Loading {folderLabel.toLowerCase()}…
          </p>
        ) : files.length === 0 ? (
          <p className="text-muted px-2 py-2 text-xs leading-snug">
            {emptyMessage}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 py-1">
            {files.map((file) => {
              const isDeleting = deletingFileId === file.id;
              return (
                <li key={file.id}>
                  <div
                    className={cn(
                      "hover:bg-default flex items-center gap-2 rounded-md px-2 py-1.5",
                      isDeleting && "opacity-60",
                    )}
                  >
                    <FileIcon
                      className="text-muted size-3.5 shrink-0"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm">
                        {file.originalFilename}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {kindLabelFor(file.kind)}
                        {file.description ? ` · ${file.description}` : ""}
                        {" · "}
                        {formatAuxFileSize(file.sizeBytes)}
                      </p>
                    </div>
                    {canEdit && onDelete ? (
                      <button
                        type="button"
                        className="text-muted hover:text-danger shrink-0 text-xs font-medium"
                        disabled={isDeleting}
                        onClick={() => onDelete(file.id)}
                      >
                        {isDeleting ? "Removing…" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function pendingToExplorerFiles(pending: PendingAuxFile[]): AuxExplorerFile[] {
  return pending.map((row) => {
    const description = row.description?.trim() ?? "";
    return {
      id: row.clientKey,
      originalFilename: row.file.name,
      sizeBytes: row.file.size,
      kind: row.kind,
      description: description.length > 0 ? description : null,
    };
  });
}

export type DatasetAuxExplorerProps = {
  variant: "draft" | "persisted";
  experimentFiles: AuxExplorerFile[];
  sampleFiles: AuxExplorerFile[];
  sampleLinked: boolean;
  experimentLoading?: boolean;
  sampleLoading?: boolean;
  draftPendingExperiment?: PendingAuxFile[];
  draftPendingSample?: PendingAuxFile[];
  canEdit?: boolean;
  deletingFileId?: string | null;
  onDeleteExperimentFile?: (fileId: string) => void;
  onDeleteSampleFile?: (fileId: string) => void;
};

/**
 * Directory-tree view of experiment and sample auxiliary folders for the
 * contribute dataset auxiliary-files tab.
 */
export function DatasetAuxExplorer({
  variant,
  experimentFiles,
  sampleFiles,
  sampleLinked,
  experimentLoading,
  sampleLoading,
  draftPendingExperiment = [],
  draftPendingSample = [],
  canEdit,
  deletingFileId,
  onDeleteExperimentFile,
  onDeleteSampleFile,
}: DatasetAuxExplorerProps) {
  const isDraft = variant === "draft";
  const draftExperimentFiles = pendingToExplorerFiles(draftPendingExperiment);
  const draftSampleFiles = pendingToExplorerFiles(draftPendingSample);
  const showDraftExperiment = isDraft ? draftExperimentFiles : experimentFiles;
  const showDraftSample = isDraft ? draftSampleFiles : sampleFiles;
  const hasDraftPending =
    draftPendingExperiment.length > 0 || draftPendingSample.length > 0;

  return (
    <div
      className="border-border bg-surface flex min-h-[360px] flex-col rounded-lg border p-3"
      aria-label="Auxiliary file folders"
    >
      <p className="text-muted mb-2 text-xs leading-snug">
        {isDraft
          ? hasDraftPending
            ? "Queued files upload when you submit this dataset."
            : "Upload auxiliary files after you submit this dataset, or queue them on the right before submit."
          : "Files stored with this dataset in experiment-aux and sample-aux storage."}
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <AuxExplorerFolder
          folderPath="experiment-aux/"
          folderLabel="Experiment"
          files={showDraftExperiment}
          isLoading={!isDraft && experimentLoading}
          emptyMessage={
            isDraft
              ? "No experiment files queued."
              : "No experiment auxiliary files uploaded yet."
          }
          canEdit={!isDraft && canEdit}
          deletingFileId={deletingFileId}
          onDelete={onDeleteExperimentFile}
        />
        <AuxExplorerFolder
          folderPath="sample-aux/"
          folderLabel="Sample"
          files={showDraftSample}
          isLoading={!isDraft && sampleLinked && sampleLoading}
          emptyMessage={
            !sampleLinked && !isDraft
              ? "No sample is linked to this experiment."
              : isDraft
                ? "No sample files queued."
                : "No sample auxiliary files uploaded yet."
          }
          canEdit={!isDraft && canEdit && sampleLinked}
          deletingFileId={deletingFileId}
          onDelete={onDeleteSampleFile}
        />
      </div>
    </div>
  );
}
