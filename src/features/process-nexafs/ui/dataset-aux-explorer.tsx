"use client";

import { ChevronRight, FolderOpen, FolderClosed } from "lucide-react";
import { Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import { AuxFileVisualIcon } from "~/components/forms";
import {
  AUX_FILE_KIND_LABELS,
  auxFileVisualKindFromAuxKind,
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

function auxKindFromString(kind: string): AuxFileKind {
  return kind in AUX_FILE_KIND_LABELS ? (kind as AuxFileKind) : "other";
}

function kindLabelFor(kind: string): string {
  return AUX_FILE_KIND_LABELS[auxKindFromString(kind)];
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
  const isEmpty = files.length === 0 && !isLoading;

  return (
    <div className="flex flex-col">
      <div className="text-foreground flex items-center gap-1 px-1.5 py-1 text-xs font-medium">
        <ChevronRight
          className="text-muted size-3 shrink-0"
          aria-hidden
        />
        {isEmpty ? (
          <FolderClosed className="text-muted size-3.5 shrink-0" aria-hidden />
        ) : (
          <FolderOpen className="text-accent size-3.5 shrink-0" aria-hidden />
        )}
        <span className="text-foreground font-mono min-w-0 truncate">
          {folderPath}
        </span>
        <span
          className={cn(
            "ms-auto shrink-0 tabular-nums",
            files.length > 0 ? "text-foreground" : "text-muted",
          )}
        >
          {files.length}
        </span>
      </div>

      <div className="border-border ms-4 border-s ps-2">
        {isLoading ? (
          <p className="text-muted flex items-center gap-1.5 px-1.5 py-2 text-xs">
            <Spinner size="sm" color="current" />
            Loading {folderLabel.toLowerCase()}…
          </p>
        ) : files.length === 0 ? (
          <p className="text-muted px-1.5 py-1.5 text-xs leading-snug italic">
            {emptyMessage}
          </p>
        ) : (
          <ul className="flex flex-col py-0.5">
            {files.map((file) => {
              const isDeleting = deletingFileId === file.id;
              return (
                <li key={file.id}>
                  <div
                    className={cn(
                      "hover:bg-default group flex items-center gap-2 rounded px-1.5 py-1 transition-colors",
                      isDeleting && "opacity-50",
                    )}
                  >
                    <AuxFileVisualIcon
                      kind={auxFileVisualKindFromAuxKind(
                        auxKindFromString(file.kind),
                      )}
                      className="text-muted size-3.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-mono text-xs">
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
                        className="text-muted hover:text-danger shrink-0 text-xs font-medium opacity-0 group-hover:opacity-100"
                        disabled={isDeleting}
                        onClick={() => onDelete(file.id)}
                        aria-label={`Remove ${file.originalFilename}`}
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
 * Directory-tree file browser for experiment and sample auxiliary folders.
 *
 * Displays two virtual folders (`experiment-aux/` and `sample-aux/`) with
 * file rows styled in a Finder-like monospace layout. In draft mode the
 * folders reflect queued-but-not-yet-uploaded files; in persisted mode they
 * reflect server-fetched file lists with optional inline delete controls.
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
      className="border-border bg-surface flex min-h-[360px] flex-col rounded-lg border"
      aria-label="Auxiliary file folders"
    >
      <div className="border-border border-b px-3 py-2">
        <p className="text-muted text-xs leading-snug">
          {isDraft
            ? hasDraftPending
              ? "Queued files upload when you submit this dataset."
              : "Queue files using the upload panel, or upload after submit."
            : "Files stored in experiment-aux and sample-aux storage."}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
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
