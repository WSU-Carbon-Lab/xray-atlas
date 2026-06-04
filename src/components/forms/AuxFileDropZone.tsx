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
import { Upload, X } from "lucide-react";
import {
  AUX_FILE_KIND_LABELS,
  AUX_FILE_KINDS,
  formatAuxFileSize,
  type AuxFileKind,
  type AuxFileScope,
} from "~/lib/aux-file-client";
import { appendPendingAuxFiles } from "~/lib/pending-aux-file";
import type { PendingAuxFile } from "~/features/process-nexafs/types";
import {
  globalDropZoneProps,
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
  dropLabel?: string;
  globalDropZoneId?: GlobalDropZoneId;
};

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
  dropLabel,
  globalDropZoneId,
}: AuxFileDropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingKind, setPendingKind] = useState<AuxFileKind>("other");
  const [pendingDescription, setPendingDescription] = useState("");

  const capLabel = scope === "sample" ? "50 MB" : "500 MB";
  const isCompact = variant === "compact";
  const zoneMessage =
    dropLabel ??
    (scope === "sample"
      ? "Drop sample files or click"
      : "Drop experiment files or click");

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
        setPendingDescription("");
      }
    },
    [
      disabled,
      files,
      onFilesChange,
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

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (event.dataTransfer.files?.length) {
        queueFiles(event.dataTransfer.files);
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

  const kindDescriptionRow = (
    <div
      className={cn(
        "grid gap-2",
        isCompact ? "grid-cols-1 sm:grid-cols-2" : "gap-3 sm:grid-cols-2",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Label className="text-foreground text-xs font-medium">File kind</Label>
        <Select
          aria-label="Auxiliary file kind"
          selectedKey={pendingKind}
          isDisabled={disabled}
          onSelectionChange={(key) => {
            if (key == null) {
              return;
            }
            setPendingKind(String(key) as AuxFileKind);
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
        name="aux-file-description"
        value={pendingDescription}
        onChange={setPendingDescription}
        isDisabled={disabled}
        fullWidth
      >
        <Label className="text-foreground text-xs font-medium">
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

  const dropSurface = (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) {
          setIsDragging(true);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget === event.target) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
      className={cn(
        "border-border flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center transition-colors",
        isCompact ? "min-h-[4.25rem] px-3 py-3" : "min-h-[7.5rem] px-4 py-5",
        isDragging && "border-accent bg-accent/5",
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
      <Upload
        className={cn("text-muted", isCompact ? "size-4" : "size-5")}
        aria-hidden
      />
      <p
        className={cn(
          "text-foreground font-medium",
          isCompact ? "text-xs" : "text-sm",
        )}
      >
        {zoneMessage}
      </p>
      <p className="text-muted text-[11px]">Up to {capLabel} per file</p>
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
        const isUploading =
          progress != null && progress > 0 && progress < 100;
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

  const zoneProps = globalDropZoneId
    ? globalDropZoneProps(globalDropZoneId)
    : {};

  if (isCompact) {
    return (
      <section
        {...zoneProps}
        className="flex min-w-0 flex-col gap-2"
        aria-labelledby={`${inputId}-heading`}
      >
        <div>
          <h2
            id={`${inputId}-heading`}
            className="text-muted text-sm font-medium leading-none"
          >
            {title}
          </h2>
          <p className="text-muted mt-0.5 text-[11px] leading-snug">
            {description}
          </p>
        </div>
        {kindDescriptionRow}
        {stackedQueue}
        {dropSurface}
      </section>
    );
  }

  return (
    <section
      {...zoneProps}
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
      {kindDescriptionRow}
      {dropSurface}
      {detailedQueue}
    </section>
  );
}
