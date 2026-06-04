"use client";

import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";

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
      return "Drop JSON file here to upload";
    case "csv":
      return "Drop CSV file here to upload";
    default:
      return "Drop CSV or JSON files here to upload";
  }
}

export type ContributionFileDropOverlayFileKind = "csv" | "json" | "mixed";

type ContributionFileDropOverlayProps = {
  isDragging: boolean;
  fileKind: ContributionFileDropOverlayFileKind;
  fileName?: string | null;
  messageOverride?: string;
  variant?: "fullscreen" | "inset";
};

export function ContributionFileDropOverlay({
  isDragging,
  fileKind,
  fileName = null,
  messageOverride,
  variant = "fullscreen",
}: ContributionFileDropOverlayProps) {
  if (!isDragging) return null;

  const message = messageOverride ?? getDefaultSpectrumMessage(fileKind);
  const displayFileName = fileName ? truncateFileName(fileName) : null;
  const isInset = variant === "inset";

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
        <DocumentArrowUpIcon
          className={cn(
            "text-accent animate-bounce",
            isInset ? "h-10 w-10 sm:h-12 sm:w-12" : "h-24 w-24",
          )}
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
