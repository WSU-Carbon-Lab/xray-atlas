"use client";

import { Button } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  Archive,
  Database,
  FileIcon,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  X,
} from "lucide-react";
import {
  AUX_FILE_KIND_LABELS,
  auxFileVisualKindFromAuxKind,
  formatAuxFileSize,
  inferAuxFileVisualKindFromDropLabel,
  type AuxFileKind,
  type AuxFileVisualKind,
} from "~/lib/aux-file-client";

export type StackedFileEntry = {
  clientKey: string;
  name: string;
  size: number;
  kind: AuxFileKind;
  onRemove?: () => void;
  removeDisabled?: boolean;
};

/** Queued file represented as one layer in {@link StackedPageDropVisual}. */
export type StackedPageQueuedFile = {
  id: string;
  filename: string;
  visualKind: AuxFileVisualKind;
  onRemove?: () => void;
  removeDisabled?: boolean;
};

const kindIconClass = "size-3.5 shrink-0";

const DEFAULT_MAX_STACK_LAYERS = 3;

/**
 * Renders a Lucide icon for a stacked-file or drop-zone visual category.
 */
export function AuxFileVisualIcon({
  kind,
  className,
}: {
  kind: AuxFileVisualKind;
  className?: string;
}) {
  const iconClass = cn(kindIconClass, className);
  switch (kind) {
    case "image":
      return <ImageIcon className={iconClass} aria-hidden />;
    case "spreadsheet":
      return <FileSpreadsheet className={iconClass} aria-hidden />;
    case "document":
      return <FileText className={iconClass} aria-hidden />;
    case "data":
      return <Database className={iconClass} aria-hidden />;
    case "archive":
      return <Archive className={iconClass} aria-hidden />;
    default:
      return <FileIcon className={iconClass} aria-hidden />;
  }
}

function kindIconForAuxKind(kind: AuxFileKind) {
  return <AuxFileVisualIcon kind={auxFileVisualKindFromAuxKind(kind)} />;
}

type StackedPageDropVisualProps = {
  visualKind?: AuxFileVisualKind;
  dropTypeLabel?: string | null;
  isActive?: boolean;
  isDragHighlight?: boolean;
  className?: string;
  pointerX?: number;
  pointerY?: number;
  /** When set, replaces the decorative stack with queued file layers (newest on top). */
  files?: StackedPageQueuedFile[];
  maxStackLayers?: number;
};

type LayerSlot = "backLeft" | "backRight" | "front";

const layerTransforms: Record<
  LayerSlot,
  { idle: (px: number, py: number, rot: number) => string; active: string }
> = {
  backLeft: {
    idle: (px, py) =>
      `translate(calc(-0.25rem + ${px}px), calc(${py}px)) rotate(-9deg)`,
    active: "translate(-0.65rem, -0.125rem) rotate(-14deg) scale(1.02)",
  },
  backRight: {
    idle: (px, py) =>
      `translate(calc(0.25rem + ${px}px), calc(${py}px)) rotate(7deg)`,
    active: "translate(0.65rem, -0.25rem) rotate(12deg) scale(1.03)",
  },
  front: {
    idle: (px, py, rot) =>
      `translate(${px}px, ${py}px) rotate(${rot}deg)`,
    active: "translateY(-0.375rem) scale(1.05)",
  },
};

function StackedPageLayer({
  slot,
  file,
  visualKind,
  isActive,
  isDragHighlight,
  pointerOffsetX,
  pointerOffsetY,
  pointerRotate,
  isDecorative,
}: {
  slot: LayerSlot;
  file?: StackedPageQueuedFile;
  visualKind: AuxFileVisualKind;
  isActive: boolean;
  isDragHighlight: boolean;
  pointerOffsetX: number;
  pointerOffsetY: number;
  pointerRotate: number;
  isDecorative: boolean;
}) {
  const active = isActive || isDragHighlight;
  const kind = file?.visualKind ?? visualKind;
  const transform = active
    ? layerTransforms[slot].active
    : layerTransforms[slot].idle(
        pointerOffsetX,
        pointerOffsetY,
        pointerRotate,
      );
  const isFront = slot === "front";

  return (
    <span
      className={cn(
        "group/layer absolute flex h-11 w-[2.35rem] items-center justify-center rounded-md border shadow-sm",
        "motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-300 motion-reduce:transition-none",
        isFront
          ? "border-border bg-surface shadow-md"
          : "border-border/80 bg-surface-2",
        isDecorative && !file
          ? isFront
            ? "text-muted"
            : active
              ? "opacity-90"
              : "opacity-70"
          : file
            ? isFront
              ? active
                ? "text-accent motion-safe:shadow-lg"
                : "text-foreground"
              : active
                ? "opacity-95"
                : "opacity-85"
            : isFront
              ? active
                ? "text-accent motion-safe:shadow-lg"
                : "text-muted"
              : active
                ? "opacity-95"
                : "opacity-80",
        isDragHighlight && isFront && "border-accent/60 ring-accent/20 ring-2",
        file && "pointer-events-auto",
      )}
      style={{ transform }}
      title={file ? file.filename : undefined}
    >
      <AuxFileVisualIcon
        kind={kind}
        className={cn(
          isFront && active ? "size-5" : "size-4",
          "text-current",
        )}
      />
      {file?.onRemove ? (
        <Button
          type="button"
          isIconOnly
          size="sm"
          variant="ghost"
          className={cn(
            "text-muted hover:text-danger bg-surface/95 border-border absolute -top-1 -right-1 z-10 min-h-5 min-w-5 rounded-full border p-0 shadow-sm",
            "opacity-0 group-hover/layer:opacity-100 focus:opacity-100",
            "motion-safe:transition-opacity motion-reduce:transition-none",
          )}
          aria-label={`Remove ${file.filename}`}
          isDisabled={file.removeDisabled}
          onPress={() => file.onRemove?.()}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <X className="size-2.5" aria-hidden />
        </Button>
      ) : null}
    </span>
  );
}

/**
 * Animated stacked document layers for aux upload drop targets; tilts toward pointer when active.
 * With `files`, queued uploads replace the decorative stack (newest on top, up to `maxStackLayers`).
 */
export function StackedPageDropVisual({
  visualKind: visualKindProp,
  dropTypeLabel,
  isActive = false,
  isDragHighlight = false,
  className,
  pointerX = 50,
  pointerY = 50,
  files = [],
  maxStackLayers = DEFAULT_MAX_STACK_LAYERS,
}: StackedPageDropVisualProps) {
  const fallbackVisualKind =
    visualKindProp ??
    (dropTypeLabel
      ? inferAuxFileVisualKindFromDropLabel(dropTypeLabel)
      : "generic");
  const pointerOffsetX = (pointerX - 50) * 0.08;
  const pointerOffsetY = (pointerY - 50) * 0.06;
  const pointerRotate = (pointerX - 50) * 0.14;

  const hasQueuedFiles = files.length > 0;
  const visibleFiles = hasQueuedFiles
    ? files.slice(-maxStackLayers)
    : [];
  const overflowCount = hasQueuedFiles
    ? files.length - visibleFiles.length
    : 0;

  const slotFiles: Record<LayerSlot, StackedPageQueuedFile | undefined> = {
    backLeft: undefined,
    backRight: undefined,
    front: undefined,
  };

  if (visibleFiles.length === 1) {
    slotFiles.front = visibleFiles[0];
  } else if (visibleFiles.length === 2) {
    slotFiles.backLeft = visibleFiles[0];
    slotFiles.front = visibleFiles[1];
  } else if (visibleFiles.length >= 3) {
    slotFiles.backLeft = visibleFiles[0];
    slotFiles.backRight = visibleFiles[1];
    slotFiles.front = visibleFiles[2];
  }

  const layerProps = {
    visualKind: fallbackVisualKind,
    isActive,
    isDragHighlight,
    pointerOffsetX,
    pointerOffsetY,
    pointerRotate,
  };

  return (
    <div
      className={cn(
        "relative mx-auto flex h-12 w-[4.75rem] items-center justify-center",
        "pointer-events-none",
        className,
      )}
      aria-hidden={!hasQueuedFiles}
    >
      <StackedPageLayer
        slot="backLeft"
        file={slotFiles.backLeft}
        isDecorative={!slotFiles.backLeft}
        {...layerProps}
      />
      <StackedPageLayer
        slot="backRight"
        file={slotFiles.backRight}
        isDecorative={!slotFiles.backRight}
        {...layerProps}
      />
      <StackedPageLayer
        slot="front"
        file={slotFiles.front}
        isDecorative={!slotFiles.front}
        {...layerProps}
      />
      {overflowCount > 0 ? (
        <span
          className="border-border bg-surface text-muted pointer-events-none absolute -top-0.5 -right-1 z-20 rounded-full border px-1 py-px text-[9px] font-semibold leading-none shadow-sm"
          aria-hidden
        >
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}

type StackedFileIconsProps = {
  files: StackedFileEntry[];
  className?: string;
  maxVisible?: number;
};

/**
 * Compact overlapping file chips with per-file remove affordances for aux upload queues.
 */
export function StackedFileIcons({
  files,
  className,
  maxVisible = 6,
}: StackedFileIconsProps) {
  if (files.length === 0) {
    return null;
  }

  const visible = files.slice(0, maxVisible);
  const overflow = files.length - visible.length;

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Queued files"
    >
      {visible.map((entry) => (
        <li
          key={entry.clientKey}
          className="border-border bg-surface-2 group flex max-w-[min(100%,14rem)] items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-2 shadow-sm"
        >
          <span className="text-muted">{kindIconForAuxKind(entry.kind)}</span>
          <span
            className="text-foreground min-w-0 flex-1 truncate text-[11px] font-medium"
            title={`${entry.name} (${AUX_FILE_KIND_LABELS[entry.kind]}, ${formatAuxFileSize(entry.size)})`}
          >
            {entry.name}
          </span>
          {entry.onRemove ? (
            <Button
              type="button"
              isIconOnly
              size="sm"
              variant="ghost"
              className="text-muted hover:text-danger min-h-6 min-w-6 shrink-0"
              aria-label={`Remove ${entry.name}`}
              isDisabled={entry.removeDisabled}
              onPress={entry.onRemove}
            >
              <X className="size-3" aria-hidden />
            </Button>
          ) : null}
        </li>
      ))}
      {overflow > 0 ? (
        <li
          className="border-border bg-surface text-muted rounded-full border px-2 py-0.5 text-[11px] font-medium"
          aria-label={`${overflow} more queued files`}
        >
          +{overflow}
        </li>
      ) : null}
    </ul>
  );
}
