"use client";

import { Button } from "@heroui/react";
import { cn } from "@heroui/styles";
import { FileIcon, X } from "lucide-react";
import {
  AUX_FILE_KIND_LABELS,
  formatAuxFileSize,
  type AuxFileKind,
} from "~/lib/aux-file-client";

export type StackedFileEntry = {
  clientKey: string;
  name: string;
  size: number;
  kind: AuxFileKind;
  onRemove?: () => void;
  removeDisabled?: boolean;
};

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
          <FileIcon className="text-muted size-3.5 shrink-0" aria-hidden />
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
