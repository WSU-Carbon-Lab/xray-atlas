"use client";

import { Button, ScrollShadow } from "@heroui/react";
import { cn } from "@heroui/styles";
import { FolderSearch } from "lucide-react";
import { isDirectoryPickerSupported } from "~/features/dashboard/lib/localDirectoryBrowser";

type FolderPickerPromptProps = {
  onPickFolder: () => void;
  isPicking: boolean;
};

/**
 * Empty state prompting the user to select a local STXM data folder.
 */
export function FolderPickerPrompt({
  onPickFolder,
  isPicking,
}: FolderPickerPromptProps) {
  const supported = isDirectoryPickerSupported();

  return (
    <div className="border-border bg-surface flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-14 text-center">
      <FolderSearch className="text-muted h-10 w-10" aria-hidden />
      <div className="max-w-md">
        <p className="text-foreground text-sm font-medium">
          Select your STXM data folder
        </p>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Choose the beamline root directory on your computer. Beamtime subfolders
          (for example <span className="font-mono">2026-03(March)</span>) and scan
          files stay local; nothing uploads until you export to Atlas later.
        </p>
        {!supported ? (
          <p className="text-warning mt-3 text-xs">
            Folder selection requires Chrome or Edge with File System Access API
            support. Safari and Firefox cannot browse local directories in-browser
            yet; use Chromium to process data here.
          </p>
        ) : null}
      </div>
      <Button
        variant="primary"
        size="md"
        isDisabled={!supported || isPicking}
        onPress={onPickFolder}
      >
        {isPicking ? "Opening picker..." : "Select folder"}
      </Button>
    </div>
  );
}

export type RecentFolderPillsProps = {
  folders: Array<{ handleKey: string; displayName: string }>;
  onOpen: (handleKey: string) => void;
  className?: string;
};

/**
 * Recent local folder shortcuts stored in sessionStorage.
 */
export function RecentFolderPills({
  folders,
  onOpen,
  className,
}: RecentFolderPillsProps) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <ScrollShadow orientation="horizontal" className={cn("w-full", className)}>
      <div className="flex gap-2 pb-1">
        {folders.map((folder) => (
          <Button
            key={folder.handleKey}
            variant="secondary"
            size="sm"
            className="shrink-0"
            onPress={() => onOpen(folder.handleKey)}
          >
            {folder.displayName}
          </Button>
        ))}
      </div>
    </ScrollShadow>
  );
}
