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

const kindIconClass = "size-3.5 shrink-0";

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
};

/**
 * Animated stacked document layers for aux upload drop targets; tilts toward pointer when active.
 */
export function StackedPageDropVisual({
  visualKind: visualKindProp,
  dropTypeLabel,
  isActive = false,
  isDragHighlight = false,
  className,
  pointerX = 50,
  pointerY = 50,
}: StackedPageDropVisualProps) {
  const visualKind =
    visualKindProp ??
    (dropTypeLabel
      ? inferAuxFileVisualKindFromDropLabel(dropTypeLabel)
      : "generic");
  const active = isActive || isDragHighlight;
  const pointerOffsetX = (pointerX - 50) * 0.08;
  const pointerOffsetY = (pointerY - 50) * 0.06;
  const pointerRotate = (pointerX - 50) * 0.14;

  const backLeftTransform = active
    ? "translate(-0.65rem, -0.125rem) rotate(-14deg) scale(1.02)"
    : `translate(calc(-0.25rem + ${pointerOffsetX}px), calc(${pointerOffsetY}px)) rotate(-9deg)`;
  const backRightTransform = active
    ? "translate(0.65rem, -0.25rem) rotate(12deg) scale(1.03)"
    : `translate(calc(0.25rem + ${pointerOffsetX}px), calc(${pointerOffsetY}px)) rotate(7deg)`;
  const frontTransform = active
    ? "translateY(-0.375rem) scale(1.05)"
    : `translate(${pointerOffsetX}px, ${pointerOffsetY}px) rotate(${pointerRotate}deg)`;

  return (
    <div
      className={cn(
        "pointer-events-none relative mx-auto flex h-12 w-[4.75rem] items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "border-border/80 bg-surface-2 absolute h-11 w-[2.35rem] rounded-md border shadow-sm",
          "motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-reduce:transition-none",
          active ? "opacity-90" : "opacity-70",
        )}
        style={{ transform: backLeftTransform }}
      />
      <span
        className={cn(
          "border-border/80 bg-surface-2 absolute h-11 w-[2.35rem] rounded-md border shadow-sm",
          "motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-reduce:transition-none",
          active ? "opacity-95" : "opacity-80",
        )}
        style={{ transform: backRightTransform }}
      />
      <span
        className={cn(
          "border-border bg-surface relative flex h-11 w-[2.35rem] items-center justify-center rounded-md border shadow-md",
          "motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-reduce:transition-none",
          active
            ? "text-accent motion-safe:shadow-lg"
            : "text-muted",
          isDragHighlight && "border-accent/60 ring-accent/20 ring-2",
        )}
        style={{ transform: frontTransform }}
      >
        <AuxFileVisualIcon
          kind={visualKind}
          className={cn(active ? "size-5" : "size-4", "text-current")}
        />
      </span>
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
