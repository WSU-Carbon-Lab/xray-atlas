"use client";

import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";

const MAX_FILE_NAME_LENGTH = 40;

function truncateFileName(name: string): string {
  if (name.length <= MAX_FILE_NAME_LENGTH) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  const keep = MAX_FILE_NAME_LENGTH - ext.length - 3;
  return `${base.slice(0, Math.max(0, keep))}...${ext}`;
}

function getDefaultMessage(fileKind: "csv" | "json" | "mixed"): string {
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
};

export function ContributionFileDropOverlay({
  isDragging,
  fileKind,
  fileName = null,
  messageOverride,
}: ContributionFileDropOverlayProps) {
  if (!isDragging) return null;

  const message = messageOverride ?? getDefaultMessage(fileKind);
  const displayFileName = fileName ? truncateFileName(fileName) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="border-accent bg-surface flex flex-col items-center gap-4 rounded-2xl border-4 border-dashed p-12 shadow-2xl">
        <DocumentArrowUpIcon className="text-accent h-24 w-24 animate-bounce" />
        <p className="text-foreground text-xl font-semibold">
          {message}
        </p>
        {displayFileName && (
          <p className="text-muted max-w-md truncate text-sm">
            {displayFileName}
          </p>
        )}
      </div>
    </div>
  );
}
