"use client";

import { cn } from "@heroui/styles";
import { StackedPageDropVisual } from "~/components/forms/StackedFileIcons";
import {
  inferAuxFileVisualKindFromDropLabel,
  type AuxFileVisualKind,
} from "~/lib/aux-file-client";

const MAX_FILE_NAME_LENGTH = 40;

function truncateFileName(name: string): string {
  if (name.length <= MAX_FILE_NAME_LENGTH) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  const keep = MAX_FILE_NAME_LENGTH - ext.length - 3;
  return `${base.slice(0, Math.max(0, keep))}...${ext}`;
}

function getDefaultSpectrumMessage(fileKind: "csv" | "json" | "mixed"): string {
  switch (fileKind) {
    case "json":
      return "Drop JSON here to upload";
    case "csv":
      return "Drop CSV here to upload";
    default:
      return "Drop CSV or JSON here to upload";
  }
}

function spectrumVisualKind(
  fileKind: ContributionFileDropOverlayFileKind,
): AuxFileVisualKind {
  switch (fileKind) {
    case "json":
      return "data";
    case "csv":
      return "spreadsheet";
    default:
      return "generic";
  }
}

export type ContributionFileDropOverlayFileKind = "csv" | "json" | "mixed";

type ContributionFileDropOverlayProps = {
  isDragging: boolean;
  fileKind: ContributionFileDropOverlayFileKind;
  fileName?: string | null;
  messageOverride?: string;
  variant?: "fullscreen" | "inset";
  dropTypeLabel?: string | null;
  visualKind?: AuxFileVisualKind;
};

export function ContributionFileDropOverlay({
  isDragging,
  fileKind,
  fileName = null,
  messageOverride,
  variant = "fullscreen",
  dropTypeLabel = null,
  visualKind: visualKindProp,
}: ContributionFileDropOverlayProps) {
  if (!isDragging) return null;

  const message = messageOverride ?? getDefaultSpectrumMessage(fileKind);
  const displayFileName = fileName ? truncateFileName(fileName) : null;
  const isInset = variant === "inset";
  const visualKind =
    visualKindProp ??
    (dropTypeLabel
      ? inferAuxFileVisualKindFromDropLabel(dropTypeLabel)
      : spectrumVisualKind(fileKind));

  return (
    <div
      className={cn(
        "z-20 flex items-center justify-center",
        isInset
          ? "absolute inset-0 rounded-lg bg-black/10 backdrop-blur-[2px]"
          : "fixed inset-0 bg-black/20 backdrop-blur-sm",
      )}
      aria-live="polite"
    >
      <div
        className={cn(
          "border-accent bg-surface flex flex-col items-center border-4 border-dashed shadow-2xl",
          isInset
            ? "max-w-full gap-2 rounded-lg p-4 sm:p-6"
            : "gap-4 rounded-2xl p-12",
        )}
      >
        <StackedPageDropVisual
          visualKind={visualKind}
          dropTypeLabel={dropTypeLabel}
          isActive
          isDragHighlight
          className={isInset ? "h-14" : "h-20 w-24"}
        />
        <p
          className={cn(
            "text-foreground text-center font-semibold",
            isInset ? "text-sm sm:text-base" : "text-xl",
          )}
        >
          {message}
        </p>
        {displayFileName && (
          <p
            className={cn(
              "text-muted max-w-full truncate text-center",
              isInset ? "text-[11px]" : "max-w-md text-sm",
            )}
          >
            {displayFileName}
          </p>
        )}
      </div>
    </div>
  );
}
