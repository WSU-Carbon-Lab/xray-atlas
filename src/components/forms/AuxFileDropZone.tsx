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
import { FileIcon, FileSpreadsheet, FileText, ImageIcon, X } from "lucide-react";
import {
  AUX_FILE_KIND_LABELS,
  AUX_FILE_KINDS,
  auxFileVisualKindFromAuxKind,
  formatAuxFileSize,
  inferAuxFileKindFromBatch,
  inferAuxFileVisualKindFromDropLabel,
  type AuxFileKind,
  type AuxFileScope,
  type AuxFileVisualKind,
} from "~/lib/aux-file-client";
import { appendPendingAuxFiles } from "~/lib/pending-aux-file";
import type { PendingAuxFile } from "~/features/process-nexafs/types";
import { ContributionFileDropOverlay } from "@/components/contribute";
import {
  globalDropZoneProps,
  useOptionalGlobalFileDropZoneContext,
  type GlobalDropZoneId,
} from "~/hooks/useGlobalFileDropZone";
import {
  StackedPageDropVisual,
  type StackedPageQueuedFile,
} from "./StackedFileIcons";

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
  /** Reader-facing upload target in global drop overlay copy (defaults from `scope`). */
  uploadTypeLabel?: string;
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
  uploadTypeLabel: uploadTypeLabelProp,
}: AuxFileDropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropSurfaceRef = useRef<HTMLDivElement>(null);
  const [localKind, setLocalKind] = useState<AuxFileKind>("other");
  const [localDescription, setLocalDescription] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const [isStackHovered, setIsStackHovered] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

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
  const uploadTypeLabel =
    uploadTypeLabelProp ??
    (scope === "sample" ? "sample files" : "experiment files");

  const syncPointer = useCallback((clientX: number, clientY: number) => {
    const rect = dropSurfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPointer({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  }, []);

  const dragVisualKind: AuxFileVisualKind = showGlobalOverlay
    ? inferAuxFileVisualKindFromDropLabel(
        globalDropState?.fileTypeLabel ?? "files",
      )
    : auxFileVisualKindFromAuxKind(pendingKind);

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
      const list = Array.from(incoming);
      const batchKind =
        list.length > 0 ? inferAuxFileKindFromBatch(list).kind : pendingKind;
      if (list.length > 0 && batchKind !== pendingKind) {
        setPendingKind(batchKind);
      }
      const next = appendPendingAuxFiles(
        files,
        incoming,
        scope,
        batchKind,
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
      setPendingKind,
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

  const stackedPageFiles: StackedPageQueuedFile[] = files.map((entry) => {
    const progress = uploadProgress?.[entry.clientKey];
    const isUploading = progress != null && progress > 0 && progress < 100;
    return {
      id: entry.clientKey,
      filename: entry.file.name,
      visualKind: auxFileVisualKindFromAuxKind(entry.kind),
      onRemove: () => removeFile(entry.clientKey),
      removeDisabled: disabled || isUploading,
    };
  });

  const hasQueuedInStack = isCompact && stackedPageFiles.length > 0;
  const hasMultiFile = isCompact && files.length >= 2;
  const stackAccent = scope === "experiment" ? "danger" : "accent";
  const experimentDangerZone =
    isCompact &&
    scope === "experiment" &&
    !showGlobalOverlay &&
    (hasMultiFile || (isHovering && files.length > 0));
  const sampleFilledZone =
    isCompact &&
    scope === "sample" &&
    !showGlobalOverlay &&
    hasMultiFile;

  const dropTargetProps = globalDropZoneId
    ? globalDropZoneProps(globalDropZoneId)
    : {};

  const dropTarget = (
    <div
      ref={dropSurfaceRef}
      {...dropTargetProps}
      onDragOver={(event) => {
        event.preventDefault();
        syncPointer(event.clientX, event.clientY);
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setPointer({ x: 50, y: 50 });
      }}
      onMouseMove={(event) => syncPointer(event.clientX, event.clientY)}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed text-center transition-colors",
        isCompact
          ? "border-border min-h-[6.75rem] flex-1 px-3 py-3"
          : "border-border min-h-[8.5rem] px-4 py-5 gap-2",
        (showGlobalOverlay ||
          (isHovering && !experimentDangerZone) ||
          sampleFilledZone) &&
          "border-accent/70 bg-accent/5",
        showGlobalOverlay && "border-accent bg-accent/8",
        experimentDangerZone && "border-danger/70 bg-danger/5",
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
      aria-label={`Upload ${uploadTypeLabel}, up to ${capLabel} each`}
    >
      {showGlobalOverlay && globalDropZoneId && globalDropState ? (
        <ContributionFileDropOverlay
          variant="inset"
          isDragging
          fileKind="mixed"
          fileName={globalDropState.fileName}
          messageOverride={globalDropState.messageForZone(globalDropZoneId)}
          dropTypeLabel={globalDropState.fileTypeLabel}
          visualKind={dragVisualKind}
        />
      ) : null}
      <div
        className={cn(
          "relative flex w-full justify-center",
          hasQueuedInStack && "h-[5.25rem]",
          showGlobalOverlay && "opacity-0",
        )}
        onMouseEnter={() => {
          if (hasQueuedInStack) {
            setIsStackHovered(true);
          }
        }}
        onMouseLeave={() => setIsStackHovered(false)}
      >
        <StackedPageDropVisual
          visualKind={dragVisualKind}
          dropTypeLabel={
            showGlobalOverlay ? (globalDropState?.fileTypeLabel ?? null) : null
          }
          isActive={isHovering || showGlobalOverlay}
          isDragHighlight={showGlobalOverlay}
          filledStack={hasMultiFile}
          stackAccent={stackAccent}
          expandToGridOnHover={hasQueuedInStack}
          isStackHovered={isStackHovered}
          pointerX={pointer.x}
          pointerY={pointer.y}
          files={isCompact ? stackedPageFiles : undefined}
        />
      </div>
      <p
        className={cn(
          "text-foreground font-medium",
          isCompact ? "text-xs" : "text-sm",
          hasQueuedInStack && "text-[11px]",
          showGlobalOverlay && "opacity-0",
        )}
      >
        {isCompact
          ? hasQueuedInStack
            ? "Add more files"
            : "Drop or click to browse"
          : "Drop files or click to browse"}
      </p>
      {!(isCompact && isStackHovered && hasQueuedInStack) ? (
        <p
          className={cn(
            "text-muted",
            isCompact ? "text-[11px]" : "text-xs",
            hasQueuedInStack && isCompact && "text-[10px]",
            showGlobalOverlay && "opacity-0",
          )}
        >
          Up to {capLabel} per file
        </p>
      ) : null}
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
