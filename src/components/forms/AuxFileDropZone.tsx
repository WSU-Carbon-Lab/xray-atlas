"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextField,
} from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  FileIcon,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";
import {
  AUX_FILE_KIND_LABELS,
  AUX_FILE_KINDS,
  formatAuxFileSize,
  type AuxFileKind,
  type AuxFileScope,
} from "~/lib/aux-file-client";
import { appendPendingAuxFiles } from "~/lib/pending-aux-file";
import type { PendingAuxFile } from "~/features/process-nexafs/types";
import { ContributionFileDropOverlay } from "@/components/contribute";
import {
  globalDropZoneProps,
  useOptionalGlobalFileDropZoneContext,
  type GlobalDropZoneId,
} from "~/hooks/useGlobalFileDropZone";
import { StackedFileIcons } from "./StackedFileIcons";

type AuxFileDropZoneProps = {
  scope: AuxFileScope;
  title: string;
  description: string;
  files: PendingAuxFile[];
  onFilesChange: (files: PendingAuxFile[]) => void;
  disabled?: boolean;
  uploadProgress?: Record<string, number>;
  onValidationError?: (message: string) => void;
  variant?: "default" | "compact";
  globalDropZoneId?: GlobalDropZoneId;
  pendingKind?: AuxFileKind;
  pendingDescription?: string;
  onPendingKindChange?: (kind: AuxFileKind) => void;
  onPendingDescriptionChange?: (description: string) => void;
  hideUploadDefaults?: boolean;
};

const kindIconClass = "size-4 shrink-0";

function kindIcon(kind: AuxFileKind) {
  switch (kind) {
    case "image":
      return <ImageIcon className={kindIconClass} aria-hidden />;
    case "spreadsheet":
      return <FileSpreadsheet className={kindIconClass} aria-hidden />;
    case "document":
    case "protocol":
      return <FileText className={kindIconClass} aria-hidden />;
    default:
      return <FileIcon className={kindIconClass} aria-hidden />;
  }
}

function AuxUploadDefaultsFields({
  pendingKind,
  pendingDescription,
  onPendingKindChange,
  onPendingDescriptionChange,
  disabled,
  descriptionInputName,
}: {
  pendingKind: AuxFileKind;
  pendingDescription: string;
  onPendingKindChange: (kind: AuxFileKind) => void;
  onPendingDescriptionChange: (description: string) => void;
  disabled?: boolean;
  descriptionInputName: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted text-xs font-medium">File kind</Label>
        <Select
          aria-label="Auxiliary file kind"
          selectedKey={pendingKind}
          isDisabled={disabled}
          onSelectionChange={(key) => {
            if (key == null) {
              return;
            }
            onPendingKindChange(String(key) as AuxFileKind);
          }}
        >
          <Select.Trigger className="border-border bg-field-background min-h-9 w-full rounded-lg border shadow-none">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="File kinds">
              {AUX_FILE_KINDS.map((kind) => (
                <ListBox.Item
                  id={kind}
                  key={kind}
                  textValue={AUX_FILE_KIND_LABELS[kind]}
                >
                  {AUX_FILE_KIND_LABELS[kind]}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      <TextField
        name={descriptionInputName}
        value={pendingDescription}
        onChange={onPendingDescriptionChange}
        isDisabled={disabled}
        fullWidth
      >
        <Label className="text-muted text-xs font-medium">
          Description (optional)
        </Label>
        <Input
          placeholder="Brief note for this batch"
          className="min-h-9"
          aria-label="Auxiliary file description"
        />
      </TextField>
    </div>
  );
}

/**
 * Drag-and-drop and file-picker surface for queuing auxiliary uploads before or after submit.
 */
export function AuxFileDropZone({
  scope,
  title,
  description,
  files,
  onFilesChange,
  disabled = false,
  uploadProgress,
  onValidationError,
  variant = "default",
  globalDropZoneId,
  pendingKind: pendingKindProp,
  pendingDescription: pendingDescriptionProp,
  onPendingKindChange,
  onPendingDescriptionChange,
  hideUploadDefaults = false,
}: AuxFileDropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localKind, setLocalKind] = useState<AuxFileKind>("other");
  const [localDescription, setLocalDescription] = useState("");

  const globalDropState = useOptionalGlobalFileDropZoneContext();
  const showGlobalOverlay = Boolean(
    globalDropZoneId &&
      globalDropState?.showOverlayForZone(globalDropZoneId),
  );

  const pendingKind = pendingKindProp ?? localKind;
  const pendingDescription = pendingDescriptionProp ?? localDescription;
  const setPendingKind = onPendingKindChange ?? setLocalKind;
  const setPendingDescription =
    onPendingDescriptionChange ?? setLocalDescription;

  const isCompact = variant === "compact";
  const capLabel = scope === "sample" ? "50 MB" : "500 MB";

  const reportError = useCallback(
    (message: string) => {
      onValidationError?.(message);
    },
    [onValidationError],
  );

  const queueFiles = useCallback(
    (incoming: FileList | File[]) => {
      if (disabled) {
        return;
      }
      const next = appendPendingAuxFiles(
        files,
        incoming,
        scope,
        pendingKind,
        pendingDescription,
        reportError,
      );
      if (next.length > files.length) {
        onFilesChange(next);
        if (!onPendingDescriptionChange) {
          setLocalDescription("");
        }
      }
    },
    [
      disabled,
      files,
      onFilesChange,
      onPendingDescriptionChange,
      pendingDescription,
      pendingKind,
      reportError,
      scope,
    ],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        queueFiles(event.target.files);
        event.target.value = "";
      }
    },
    [queueFiles],
  );

  const removeFile = useCallback(
    (clientKey: string) => {
      onFilesChange(files.filter((entry) => entry.clientKey !== clientKey));
    },
    [files, onFilesChange],
  );

  const dropTargetProps = globalDropZoneId
    ? globalDropZoneProps(globalDropZoneId)
    : {};

  const dropTarget = (
    <div
      {...dropTargetProps}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center transition-colors",
        isCompact
          ? "border-border min-h-[5.5rem] flex-1 px-3 py-3"
          : "border-border min-h-[7.5rem] px-4 py-5 gap-2",
        showGlobalOverlay && "border-accent bg-accent/5",
        disabled && "cursor-not-allowed opacity-60",
      )}
      onClick={() => {
        if (!disabled) {
          inputRef.current?.click();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!disabled) {
            inputRef.current?.click();
          }
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`Upload ${scope} auxiliary files, up to ${capLabel} each`}
    >
      {showGlobalOverlay && globalDropZoneId && globalDropState ? (
        <ContributionFileDropOverlay
          variant="inset"
          isDragging
          fileKind="mixed"
          fileName={globalDropState.fileName}
          messageOverride={globalDropState.messageForZone(globalDropZoneId)}
        />
      ) : null}
      <Upload
        className={cn(
          isCompact ? "size-4" : "size-5",
          showGlobalOverlay ? "text-accent" : "text-muted",
        )}
        aria-hidden
      />
      <p
        className={cn(
          "text-foreground font-medium",
          isCompact ? "text-xs" : "text-sm",
        )}
      >
        {isCompact ? "Drop or click to browse" : "Drop files or click to browse"}
      </p>
      <p className={cn("text-muted", isCompact ? "text-[11px]" : "text-xs")}>
        Up to {capLabel} per file
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={handleInputChange}
      />
    </div>
  );

  const stackedQueue = (
    <StackedFileIcons
      files={files.map((entry) => {
        const progress = uploadProgress?.[entry.clientKey];
        const isUploading = progress != null && progress > 0 && progress < 100;
        return {
          clientKey: entry.clientKey,
          name: entry.file.name,
          size: entry.file.size,
          kind: entry.kind,
          onRemove: () => removeFile(entry.clientKey),
          removeDisabled: disabled || isUploading,
        };
      })}
    />
  );

  const detailedQueue =
    files.length > 0 ? (
      <ul className="flex flex-col gap-2" aria-label="Queued auxiliary files">
        {files.map((entry) => {
          const progress = uploadProgress?.[entry.clientKey];
          const isUploading =
            progress != null && progress > 0 && progress < 100;
          return (
            <li
              key={entry.clientKey}
              className="border-border bg-surface-2 flex items-start gap-2 rounded-md border px-2.5 py-2"
            >
              <span className="text-muted mt-0.5">{kindIcon(entry.kind)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-xs font-medium">
                  {entry.file.name}
                </p>
                <p className="text-muted text-[11px]">
                  {AUX_FILE_KIND_LABELS[entry.kind]} ·{" "}
                  {formatAuxFileSize(entry.file.size)}
                </p>
                {entry.description ? (
                  <p className="text-muted mt-0.5 line-clamp-2 text-[11px]">
                    {entry.description}
                  </p>
                ) : null}
                {progress != null && progress > 0 ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="bg-default h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-accent h-full rounded-full transition-[width]"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    {isUploading ? (
                      <Spinner size="sm" aria-label="Uploading" />
                    ) : null}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                isIconOnly
                size="sm"
                variant="ghost"
                className="text-muted hover:text-danger min-h-7 min-w-7 shrink-0"
                aria-label={`Remove ${entry.file.name}`}
                isDisabled={disabled || isUploading}
                onPress={() => removeFile(entry.clientKey)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
    ) : null;

  if (isCompact) {
    return (
      <section
        className="border-border bg-surface flex h-full min-h-0 flex-col gap-2 rounded-lg border p-3"
        aria-labelledby={`${inputId}-heading`}
      >
        <div>
          <h3
            id={`${inputId}-heading`}
            className="text-muted text-sm font-medium leading-none"
          >
            {title}
          </h3>
          <p className="text-muted mt-1 text-xs leading-snug">{description}</p>
        </div>
        {!hideUploadDefaults ? (
          <AuxUploadDefaultsFields
            pendingKind={pendingKind}
            pendingDescription={pendingDescription}
            onPendingKindChange={setPendingKind}
            onPendingDescriptionChange={setPendingDescription}
            disabled={disabled}
            descriptionInputName={`${inputId}-description`}
          />
        ) : null}
        {dropTarget}
        {stackedQueue}
      </section>
    );
  }

  return (
    <section
      className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4"
      aria-labelledby={`${inputId}-heading`}
    >
      <div>
        <h2
          id={`${inputId}-heading`}
          className="text-muted text-sm font-medium leading-none"
        >
          {title}
        </h2>
        <p className="text-muted mt-1 text-xs leading-snug">{description}</p>
      </div>

      {!hideUploadDefaults ? (
        <AuxUploadDefaultsFields
          pendingKind={pendingKind}
          pendingDescription={pendingDescription}
          onPendingKindChange={setPendingKind}
          onPendingDescriptionChange={setPendingDescription}
          disabled={disabled}
          descriptionInputName={`${inputId}-description`}
        />
      ) : null}

      {dropTarget}
      {detailedQueue}
    </section>
  );
}

/**
 * Shared file kind and description defaults for paired compact aux upload zones.
 */
export function AuxUploadDefaultsRow({
  pendingKind,
  pendingDescription,
  onPendingKindChange,
  onPendingDescriptionChange,
  disabled = false,
}: {
  pendingKind: AuxFileKind;
  pendingDescription: string;
  onPendingKindChange: (kind: AuxFileKind) => void;
  onPendingDescriptionChange: (description: string) => void;
  disabled?: boolean;
}) {
  return (
    <AuxUploadDefaultsFields
      pendingKind={pendingKind}
      pendingDescription={pendingDescription}
      onPendingKindChange={onPendingKindChange}
      onPendingDescriptionChange={onPendingDescriptionChange}
      disabled={disabled}
      descriptionInputName="aux-upload-default-description"
    />
  );
}
