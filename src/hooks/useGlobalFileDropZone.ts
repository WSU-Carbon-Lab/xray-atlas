"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContributionFileDropOverlayFileKind } from "~/components/contribute/contribution-file-drop-overlay";

export const GLOBAL_DROP_ZONE_IDS = {
  NEXAFS_NEW_DATASET: "nexafs-new-dataset",
  NEXAFS_EXPERIMENT_AUX: "nexafs-experiment-aux",
  NEXAFS_SAMPLE_AUX: "nexafs-sample-aux",
} as const;

export type GlobalDropZoneId =
  (typeof GLOBAL_DROP_ZONE_IDS)[keyof typeof GLOBAL_DROP_ZONE_IDS];

const ZONE_ATTR = "data-global-drop-zone";

function spectrumFileKind(file: File): "csv" | "json" | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) {
    return "json";
  }
  if (name.endsWith(".csv")) {
    return "csv";
  }
  return null;
}

function classifyDraggedSpectrumKind(
  items: DataTransferItemList | null,
): ContributionFileDropOverlayFileKind | null {
  if (!items || items.length === 0) {
    return null;
  }
  const kinds = Array.from(items)
    .filter((item) => item.kind === "file")
    .map((item) => {
      const mime = item.type.toLowerCase();
      if (mime === "application/json" || mime === "text/json") {
        return "json" as const;
      }
      if (mime === "text/csv" || mime === "application/csv") {
        return "csv" as const;
      }
      const file = item.getAsFile();
      if (file) {
        return spectrumFileKind(file);
      }
      return null;
    })
    .filter((k): k is "csv" | "json" => k !== null);

  if (kinds.length === 0) {
    return null;
  }
  const unique = Array.from(new Set(kinds));
  return unique.length === 1 ? unique[0]! : "mixed";
}

function zoneUnderPointer(event: DragEvent): GlobalDropZoneId | null {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);
  for (const element of elements) {
    if (!(element instanceof Element)) {
      continue;
    }
    const host = element.closest(`[${ZONE_ATTR}]`);
    const id = host?.getAttribute(ZONE_ATTR);
    if (
      id === GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET ||
      id === GLOBAL_DROP_ZONE_IDS.NEXAFS_EXPERIMENT_AUX ||
      id === GLOBAL_DROP_ZONE_IDS.NEXAFS_SAMPLE_AUX
    ) {
      return id;
    }
  }
  return null;
}

function filterSpectrumFiles(files: File[]): File[] {
  return files.filter((file) => spectrumFileKind(file) !== null);
}

/**
 * Returns DOM props that register an element as a global file-drop target.
 */
export function globalDropZoneProps(
  id: GlobalDropZoneId,
): Record<string, GlobalDropZoneId> {
  return { [ZONE_ATTR]: id };
}

export type UseGlobalFileDropZoneOptions = {
  /** When false, spectrum overlay and drops are disabled (no datasets yet). */
  spectrumDropEnabled: boolean;
  onSpectrumFiles: (files: File[]) => void;
  onExperimentAuxFiles?: (files: File[]) => void;
  onSampleAuxFiles?: (files: File[]) => void;
};

export type GlobalFileDropSpectrumOverlay = {
  isDragging: boolean;
  fileKind: ContributionFileDropOverlayFileKind;
  fileName: string | null;
};

/**
 * Coordinates window-level drag-and-drop: spectrum uploads vs localized aux zones.
 */
export function useGlobalFileDropZone(
  options: UseGlobalFileDropZoneOptions,
): GlobalFileDropSpectrumOverlay {
  const {
    spectrumDropEnabled,
    onSpectrumFiles,
    onExperimentAuxFiles,
    onSampleAuxFiles,
  } = options;

  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeZone, setActiveZone] = useState<GlobalDropZoneId | null>(null);
  const [draggedFileType, setDraggedFileType] =
    useState<ContributionFileDropOverlayFileKind | null>(null);
  const [draggedFileName, setDraggedFileName] = useState<string | null>(null);

  const onSpectrumFilesRef = useRef(onSpectrumFiles);
  const onExperimentAuxFilesRef = useRef(onExperimentAuxFiles);
  const onSampleAuxFilesRef = useRef(onSampleAuxFiles);

  useEffect(() => {
    onSpectrumFilesRef.current = onSpectrumFiles;
  }, [onSpectrumFiles]);
  useEffect(() => {
    onExperimentAuxFilesRef.current = onExperimentAuxFiles;
  }, [onExperimentAuxFiles]);
  useEffect(() => {
    onSampleAuxFilesRef.current = onSampleAuxFiles;
  }, [onSampleAuxFiles]);

  const handleDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (!event.dataTransfer?.types.includes("Files")) {
      return;
    }
    setIsDragging(true);
    const zone = zoneUnderPointer(event);
    setActiveZone(zone);
    const spectrumKind = classifyDraggedSpectrumKind(event.dataTransfer.items);
    setDraggedFileType(spectrumKind);
    const firstFile = Array.from(event.dataTransfer.items)
      .find((item) => item.kind === "file")
      ?.getAsFile();
    if (firstFile?.name) {
      setDraggedFileName(firstFile.name);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer?.types.includes("Files")) {
      return;
    }
    const zone = zoneUnderPointer(event);
    setActiveZone(zone);
    const spectrumKind = classifyDraggedSpectrumKind(event.dataTransfer.items);
    setDraggedFileType(spectrumKind);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
      setActiveZone(null);
      setDraggedFileType(null);
      setDraggedFileName(null);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const zone = zoneUnderPointer(event) ?? activeZone;
      setActiveZone(null);
      setDraggedFileType(null);
      setDraggedFileName(null);

      const allFiles = Array.from(event.dataTransfer?.files ?? []);
      if (allFiles.length === 0) {
        return;
      }

      if (zone === GLOBAL_DROP_ZONE_IDS.NEXAFS_EXPERIMENT_AUX) {
        onExperimentAuxFilesRef.current?.(allFiles);
        return;
      }
      if (zone === GLOBAL_DROP_ZONE_IDS.NEXAFS_SAMPLE_AUX) {
        onSampleAuxFilesRef.current?.(allFiles);
        return;
      }

      const spectrumFiles = filterSpectrumFiles(allFiles);
      if (spectrumFiles.length === 0) {
        return;
      }

      if (
        zone === GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET ||
        (zone == null && spectrumDropEnabled)
      ) {
        onSpectrumFilesRef.current(spectrumFiles);
      }
    },
    [activeZone, spectrumDropEnabled],
  );

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  const showSpectrumOverlay =
    isDragging &&
    spectrumDropEnabled &&
    draggedFileType != null &&
    (activeZone == null ||
      activeZone === GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET);

  return {
    isDragging: showSpectrumOverlay,
    fileKind: draggedFileType ?? "mixed",
    fileName: draggedFileName,
  };
}
