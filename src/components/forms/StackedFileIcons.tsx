"use client";

import type { CSSProperties } from "react";
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

export type StackedPageStackAccent = "accent" | "danger";

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

function stackAccentLayerClasses(
  accent: StackedPageStackAccent,
  emphasized: boolean,
): {
  text: string;
  border: string;
  bg: string;
} {
  if (accent === "danger") {
    return {
      text: "text-foreground",
      border: emphasized ? "border-danger" : "border-border",
      bg: "bg-surface",
    };
  }
  return {
    text: "text-foreground",
    border: emphasized ? "border-accent" : "border-border",
    bg: "bg-surface",
  };
}

function truncateStackFilename(name: string, maxChars = 22): string {
  if (name.length <= maxChars) {
    return name;
  }
  const head = Math.ceil((maxChars - 1) / 2);
  const tail = Math.floor((maxChars - 1) / 2);
  return `${name.slice(0, head)}…${name.slice(-tail)}`;
}

const COMPACT_GRID_MAX_COLUMNS = 6;
const COMPACT_GRID_MIN_CELL_REM = 4.75;

/** Minimum block height (rem) for the expanded hover grid from file count. */
function compactGridMinHeightRem(fileCount: number): number {
  const rows = Math.ceil(fileCount / COMPACT_GRID_MAX_COLUMNS);
  const rowHeightRem = 4.5;
  return Math.max(4.75, rows * rowHeightRem + 0.25);
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
  /** Multi-file default stack uses filled accent styling without hover. */
  filledStack?: boolean;
  stackAccent?: StackedPageStackAccent;
  /** Hovering the visual expands all queued files into a removable icon grid. */
  expandToGridOnHover?: boolean;
  isStackHovered?: boolean;
};

type LayerSlot = "backLeft" | "backRight" | "front";

const layerTransforms: Record<
  LayerSlot,
  {
    idle: (px: number, py: number, rot: number) => string;
    active: string;
    filled: string;
  }
> = {
  backLeft: {
    idle: (px, py) =>
      `translate(calc(-0.25rem + ${px}px), calc(${py}px)) rotate(-9deg)`,
    active: "translate(-0.65rem, -0.125rem) rotate(-14deg) scale(1.02)",
    filled: "translate(-0.8rem, -0.2rem) rotate(-15deg) scale(1.04)",
  },
  backRight: {
    idle: (px, py) =>
      `translate(calc(0.25rem + ${px}px), calc(${py}px)) rotate(7deg)`,
    active: "translate(0.65rem, -0.25rem) rotate(12deg) scale(1.03)",
    filled: "translate(0.8rem, -0.3rem) rotate(14deg) scale(1.04)",
  },
  front: {
    idle: (px, py, rot) =>
      `translate(${px}px, ${py}px) rotate(${rot}deg)`,
    active: "translateY(-0.375rem) scale(1.05)",
    filled: "translateY(-0.5rem) scale(1.06)",
  },
};

function layerTransformForSlot(
  slot: LayerSlot,
  active: boolean,
  filledStack: boolean,
  pointerOffsetX: number,
  pointerOffsetY: number,
  pointerRotate: number,
): string {
  const slotTransforms = layerTransforms[slot];
  if (active) {
    return slotTransforms.active;
  }
  if (filledStack) {
    return slotTransforms.filled;
  }
  return slotTransforms.idle(pointerOffsetX, pointerOffsetY, pointerRotate);
}

function StackedPageRemoveButton({
  filename,
  disabled,
  onRemove,
}: {
  filename: string;
  disabled?: boolean;
  onRemove?: () => void;
}) {
  if (!onRemove) {
    return null;
  }

  return (
    <Button
      type="button"
      isIconOnly
      size="sm"
      variant="ghost"
      className={cn(
        "text-muted hover:text-danger bg-surface border-border absolute top-0 right-0 z-10 h-3.5 w-3.5 min-h-3.5 min-w-3.5 rounded-sm border p-0 shadow-sm",
        "opacity-100",
      )}
      aria-label={`Remove ${filename}`}
      isDisabled={disabled}
      onPress={() => onRemove()}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <X className="size-1.5" strokeWidth={2.5} aria-hidden />
    </Button>
  );
}

function StackedPageLayer({
  slot,
  file,
  visualKind,
  isActive,
  isDragHighlight,
  filledStack,
  stackAccent,
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
  filledStack: boolean;
  stackAccent: StackedPageStackAccent;
  pointerOffsetX: number;
  pointerOffsetY: number;
  pointerRotate: number;
  isDecorative: boolean;
}) {
  const active = isActive || isDragHighlight;
  const emphasized = active || (filledStack && Boolean(file));
  const accentClasses = stackAccentLayerClasses(stackAccent, emphasized);
  const kind = file?.visualKind ?? visualKind;
  const transform = layerTransformForSlot(
    slot,
    active,
    filledStack && !active,
    pointerOffsetX,
    pointerOffsetY,
    pointerRotate,
  );
  const isFront = slot === "front";

  return (
    <span
      className={cn(
        "absolute flex h-11 w-[2.35rem] items-center justify-center rounded-md border shadow-sm",
        "motion-safe:transition-transform motion-safe:duration-300 motion-reduce:transition-none",
        isDecorative && !file
          ? isFront
            ? "border-border bg-surface text-muted"
            : "border-border bg-surface-2 text-muted"
          : file
            ? cn(accentClasses.border, accentClasses.bg, accentClasses.text)
            : cn(
                isFront ? "border-border bg-surface" : "border-border bg-surface-2",
                isFront ? (active ? "text-foreground" : "text-muted") : "text-muted",
              ),
        file && "pointer-events-auto",
      )}
      style={{ transform }}
      title={file ? file.filename : undefined}
    >
      <AuxFileVisualIcon
        kind={kind}
        className={cn(
          isFront && emphasized ? "size-5" : "size-4",
          "text-muted",
        )}
      />
    </span>
  );
}

function StackedPageFileGridCell({
  file,
  stackAccent,
}: {
  file: StackedPageQueuedFile;
  stackAccent: StackedPageStackAccent;
}) {
  const accentClasses = stackAccentLayerClasses(stackAccent, true);

  return (
    <div
      className="group/layer pointer-events-auto flex min-w-0 w-full flex-col items-center gap-1"
      title={file.filename}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <div
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border shadow-sm",
          accentClasses.border,
          accentClasses.bg,
        )}
      >
        <AuxFileVisualIcon
          kind={file.visualKind}
          className="text-muted size-4"
        />
        <StackedPageRemoveButton
          filename={file.filename}
          disabled={file.removeDisabled}
          onRemove={file.onRemove}
        />
      </div>
      <p className="text-foreground line-clamp-2 w-full max-w-[4.75rem] text-center text-[9px] leading-tight font-medium break-all">
        {truncateStackFilename(file.filename)}
      </p>
    </div>
  );
}

function StackedPageFileGrid({
  files,
  stackAccent,
  className,
}: {
  files: StackedPageQueuedFile[];
  stackAccent: StackedPageStackAccent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto grid w-full gap-3 px-0.5 motion-safe:transition-[opacity,transform] motion-safe:duration-250 motion-safe:ease-out motion-reduce:transition-none",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${COMPACT_GRID_MIN_CELL_REM}rem, 1fr))`,
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      {files.map((file) => (
        <StackedPageFileGridCell
          key={file.id}
          file={file}
          stackAccent={stackAccent}
        />
      ))}
    </div>
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
  filledStack = false,
  stackAccent = "accent",
  expandToGridOnHover = false,
  isStackHovered = false,
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
  const showGrid =
    expandToGridOnHover && isStackHovered && hasQueuedFiles && !isDragHighlight;

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
    filledStack,
    stackAccent,
    pointerOffsetX,
    pointerOffsetY,
    pointerRotate,
  };

  const gridMinHeightRem = compactGridMinHeightRem(files.length);

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full items-center justify-center",
        showGrid ? "min-h-[var(--stacked-grid-min-h)]" : "h-12 w-[4.75rem]",
        className,
      )}
      style={
        showGrid
          ? ({
              "--stacked-grid-min-h": `${gridMinHeightRem}rem`,
            } as CSSProperties)
          : undefined
      }
      aria-hidden={!hasQueuedFiles}
    >
      <div
        className={cn(
          "relative flex h-12 w-[4.75rem] items-center justify-center",
          "motion-safe:transition-[opacity,transform] motion-safe:duration-250 motion-safe:ease-out motion-reduce:transition-none",
          showGrid
            ? "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.92] opacity-0"
            : "opacity-100",
        )}
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
        {hasQueuedFiles && !showGrid ? (
          <span
            className={cn(
              "border-border bg-surface text-foreground pointer-events-none absolute -top-1 -right-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[9px] font-semibold leading-none tabular-nums shadow-sm",
              stackAccent === "danger" && "border-danger text-danger",
              stackAccent === "accent" && "border-accent text-accent",
            )}
            aria-label={`${files.length} queued files`}
          >
            {files.length}
          </span>
        ) : null}
      </div>
      {expandToGridOnHover ? (
        <div
          className={cn(
            "absolute inset-0 flex w-full items-center justify-center py-0.5",
            "motion-safe:transition-[opacity,transform] motion-safe:duration-250 motion-safe:ease-out motion-reduce:transition-none",
            showGrid
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.97] opacity-0",
          )}
        >
          <StackedPageFileGrid files={files} stackAccent={stackAccent} />
        </div>
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
