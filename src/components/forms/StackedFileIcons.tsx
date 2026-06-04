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
  ring: string;
} {
  if (accent === "danger") {
    return {
      text: emphasized ? "text-danger" : "text-foreground",
      border: emphasized ? "border-danger/55" : "border-border",
      bg: emphasized ? "bg-danger/10" : "bg-surface",
      ring: "ring-danger/25",
    };
  }
  return {
    text: emphasized ? "text-accent" : "text-foreground",
    border: emphasized ? "border-accent/55" : "border-border",
    bg: emphasized ? "bg-accent/10" : "bg-surface",
    ring: "ring-accent/25",
  };
}

function gridColumnsForCount(count: number): number {
  if (count <= 1) {
    return 1;
  }
  if (count <= 4) {
    return 2;
  }
  if (count <= 9) {
    return 3;
  }
  return 4;
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
  showAlways,
  variant,
}: {
  filename: string;
  disabled?: boolean;
  onRemove?: () => void;
  showAlways: boolean;
  variant: "stack" | "grid";
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
        "text-muted hover:text-danger bg-surface/95 border-border absolute z-10 rounded-full border p-0 shadow-sm",
        "motion-safe:transition-opacity motion-reduce:transition-none",
        variant === "stack"
          ? "-top-0.5 -right-0.5 h-4 w-4 min-h-4 min-w-4"
          : "top-0 right-0 h-3.5 w-3.5 min-h-3.5 min-w-3.5 rounded-sm",
        showAlways
          ? "opacity-100"
          : "opacity-0 group-hover/layer:opacity-100 focus:opacity-100",
      )}
      aria-label={`Remove ${filename}`}
      isDisabled={disabled}
      onPress={() => onRemove()}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <X
        className={variant === "stack" ? "size-2" : "size-1.5"}
        strokeWidth={variant === "grid" ? 2.5 : 2}
        aria-hidden
      />
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
  const emphasized = active || filledStack;
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
        "group/layer absolute flex h-11 w-[2.35rem] items-center justify-center rounded-md border shadow-sm",
        "motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-300 motion-reduce:transition-none",
        isFront ? "shadow-md" : "shadow-sm",
        isDecorative && !file
          ? isFront
            ? "border-border bg-surface text-muted"
            : cn(
                "border-border/80 bg-surface-2",
                active ? "opacity-90" : "opacity-70",
              )
          : file
            ? cn(
                accentClasses.border,
                accentClasses.bg,
                isFront
                  ? cn(
                      accentClasses.text,
                      emphasized && "motion-safe:shadow-lg",
                    )
                  : emphasized
                    ? "opacity-95"
                    : "opacity-85",
              )
            : cn(
                isFront
                  ? "border-border bg-surface"
                  : "border-border/80 bg-surface-2",
                isFront
                  ? active
                    ? cn(accentClasses.text, "motion-safe:shadow-lg")
                    : "text-muted"
                  : active
                    ? "opacity-95"
                    : "opacity-80",
              ),
        isDragHighlight &&
          isFront &&
          cn(accentClasses.ring, "ring-2"),
        file && "pointer-events-auto",
      )}
      style={{ transform }}
      title={file ? file.filename : undefined}
    >
      <AuxFileVisualIcon
        kind={kind}
        className={cn(
          isFront && emphasized ? "size-5" : "size-4",
          "text-current",
        )}
      />
      <StackedPageRemoveButton
        filename={file?.filename ?? ""}
        disabled={file?.removeDisabled}
        onRemove={file?.onRemove}
        showAlways={Boolean(file?.onRemove) && emphasized}
        variant="stack"
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
      className={cn(
        "group/layer relative flex h-10 w-10 items-center justify-center rounded-md border shadow-sm",
        accentClasses.border,
        accentClasses.bg,
        accentClasses.text,
        "pointer-events-auto",
      )}
      title={file.filename}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <AuxFileVisualIcon kind={file.visualKind} className="size-4 text-current" />
      <StackedPageRemoveButton
        filename={file.filename}
        disabled={file.removeDisabled}
        onRemove={file.onRemove}
        showAlways
        variant="grid"
      />
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
  const columns = gridColumnsForCount(files.length);

  return (
    <div
      className={cn(
        "pointer-events-auto grid justify-center gap-1.5 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transition-none",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 2.5rem))` }}
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
  const overflowCount = hasQueuedFiles
    ? files.length - visibleFiles.length
    : 0;

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

  return (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center",
        showGrid ? "min-h-[5.25rem] w-full max-w-[11rem]" : "h-12 w-[4.75rem]",
        className,
      )}
      aria-hidden={!hasQueuedFiles}
    >
      <div
        className={cn(
          "relative flex h-12 w-[4.75rem] items-center justify-center",
          "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transition-none",
          showGrid
            ? "pointer-events-none absolute inset-0 scale-95 opacity-0"
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
        {overflowCount > 0 ? (
          <span
            className={cn(
              "border-border bg-surface text-muted pointer-events-none absolute -top-0.5 -right-1 z-20 rounded-full border px-1 py-px text-[9px] font-semibold leading-none shadow-sm",
              filledStack && stackAccent === "danger" && "border-danger/40 text-danger",
              filledStack && stackAccent === "accent" && "border-accent/40 text-accent",
            )}
            aria-hidden
          >
            +{overflowCount}
          </span>
        ) : null}
      </div>
      {expandToGridOnHover ? (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transition-none",
            showGrid
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0",
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
