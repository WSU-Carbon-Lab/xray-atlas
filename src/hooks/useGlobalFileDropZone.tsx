"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ContributionFileDropOverlayFileKind } from "~/components/contribute/contribution-file-drop-overlay";
import {
  dropTypeLabelFromFile,
  formatDropOverlayMessage,
} from "~/lib/aux-file-client";

export const GLOBAL_DROP_ZONE_IDS = {
  NEXAFS_NEW_DATASET: "nexafs-new-dataset",
  NEXAFS_EXPERIMENT_AUX: "nexafs-experiment-aux",
  NEXAFS_SAMPLE_AUX: "nexafs-sample-aux",
} as const;

export type GlobalDropZoneId =
  (typeof GLOBAL_DROP_ZONE_IDS)[keyof typeof GLOBAL_DROP_ZONE_IDS];

const ZONE_ATTR = "data-global-drop-zone";

export const GLOBAL_DROP_ZONE_UPLOAD_LABELS: Record<GlobalDropZoneId, string> =
  {
    [GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET]: "a new dataset",
    [GLOBAL_DROP_ZONE_IDS.NEXAFS_EXPERIMENT_AUX]: "experiment files",
    [GLOBAL_DROP_ZONE_IDS.NEXAFS_SAMPLE_AUX]: "sample files",
  };

export { formatDropOverlayMessage } from "~/lib/aux-file-client";

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

function classifyDraggedFileTypeLabel(
  items: DataTransferItemList | null,
  files: FileList | null,
): string {
  const labels: string[] = [];

  if (items) {
    for (const item of Array.from(items)) {
      if (item.kind !== "file") {
        continue;
      }
      const file = item.getAsFile();
      if (file) {
        labels.push(dropTypeLabelFromFile(file));
      }
    }
  }

  if (labels.length === 0 && files) {
    for (const file of Array.from(files)) {
      labels.push(dropTypeLabelFromFile(file));
    }
  }

  if (labels.length === 0) {
    return "files";
  }
  const unique = Array.from(new Set(labels));
  return unique.length === 1 ? unique[0]! : "files";
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
  /** When false, spectrum drops on the new-dataset zone are ignored. */
  spectrumDropEnabled: boolean;
  onSpectrumFiles: (files: File[]) => void;
  onExperimentAuxFiles?: (files: File[]) => void;
  onSampleAuxFiles?: (files: File[]) => void;
  /** Overrides the default "a new dataset" upload label for the spectrum zone. */
  newDatasetUploadLabel?: string;
};

export type GlobalFileDropZoneState = {
  isDraggingFiles: boolean;
  activeZone: GlobalDropZoneId | null;
  spectrumFileKind: ContributionFileDropOverlayFileKind | null;
  fileTypeLabel: string;
  fileName: string | null;
  uploadLabelForZone: (zoneId: GlobalDropZoneId) => string;
  messageForZone: (zoneId: GlobalDropZoneId) => string;
  showOverlayForZone: (zoneId: GlobalDropZoneId) => boolean;
};

const GlobalFileDropZoneContext = createContext<GlobalFileDropZoneState | null>(
  null,
);

export type GlobalFileDropZoneProviderProps = UseGlobalFileDropZoneOptions & {
  children: ReactNode;
};

/**
 * Registers window-level drag-and-drop and exposes zone-local overlay state to descendants.
 */
export function GlobalFileDropZoneProvider({
  children,
  spectrumDropEnabled,
  onSpectrumFiles,
  onExperimentAuxFiles,
  onSampleAuxFiles,
  newDatasetUploadLabel,
}: GlobalFileDropZoneProviderProps) {
  const state = useGlobalFileDropZone({
    spectrumDropEnabled,
    onSpectrumFiles,
    onExperimentAuxFiles,
    onSampleAuxFiles,
    newDatasetUploadLabel,
  });

  return (
    <GlobalFileDropZoneContext.Provider value={state}>
      {children}
    </GlobalFileDropZoneContext.Provider>
  );
}

/**
 * Reads coordinated drag-and-drop overlay state when inside {@link GlobalFileDropZoneProvider}.
 */
export function useOptionalGlobalFileDropZoneContext(): GlobalFileDropZoneState | null {
  return useContext(GlobalFileDropZoneContext);
}

/**
 * Reads coordinated drag-and-drop overlay state from {@link GlobalFileDropZoneProvider}.
 */
export function useGlobalFileDropZoneContext(): GlobalFileDropZoneState {
  const value = useOptionalGlobalFileDropZoneContext();
  if (!value) {
    throw new Error(
      "useGlobalFileDropZoneContext must be used within GlobalFileDropZoneProvider",
    );
  }
  return value;
}

/**
 * Coordinates window-level drag-and-drop: spectrum uploads vs localized aux zones.
 */
export function useGlobalFileDropZone(
  options: UseGlobalFileDropZoneOptions,
): GlobalFileDropZoneState {
  const {
    spectrumDropEnabled,
    onSpectrumFiles,
    onExperimentAuxFiles,
    onSampleAuxFiles,
    newDatasetUploadLabel,
  } = options;

  const dragCounterRef = useRef(0);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [activeZone, setActiveZone] = useState<GlobalDropZoneId | null>(null);
  const [spectrumFileKind, setSpectrumFileKind] =
    useState<ContributionFileDropOverlayFileKind | null>(null);
  const [fileTypeLabel, setFileTypeLabel] = useState("files");
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

  const syncDragMetadata = useCallback((event: DragEvent) => {
    if (!event.dataTransfer?.types.includes("Files")) {
      return;
    }
    setActiveZone(zoneUnderPointer(event));
    setSpectrumFileKind(classifyDraggedSpectrumKind(event.dataTransfer.items));
    setFileTypeLabel(
      classifyDraggedFileTypeLabel(
        event.dataTransfer.items,
        event.dataTransfer.files,
      ),
    );
    const firstFile = Array.from(event.dataTransfer.items)
      .find((item) => item.kind === "file")
      ?.getAsFile();
    setDraggedFileName(firstFile?.name ?? null);
  }, []);

  const handleDragEnter = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current += 1;
      if (!event.dataTransfer?.types.includes("Files")) {
        return;
      }
      setIsDraggingFiles(true);
      syncDragMetadata(event);
    },
    [syncDragMetadata],
  );

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!event.dataTransfer?.types.includes("Files")) {
        return;
      }
      syncDragMetadata(event);
    },
    [syncDragMetadata],
  );

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);
      setActiveZone(null);
      setSpectrumFileKind(null);
      setFileTypeLabel("files");
      setDraggedFileName(null);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);
      const zone = zoneUnderPointer(event) ?? activeZone;
      setActiveZone(null);
      setSpectrumFileKind(null);
      setFileTypeLabel("files");
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

  const uploadLabelForZone = useCallback(
    (zoneId: GlobalDropZoneId) => {
      if (zoneId === GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET) {
        return newDatasetUploadLabel ?? GLOBAL_DROP_ZONE_UPLOAD_LABELS[zoneId];
      }
      return GLOBAL_DROP_ZONE_UPLOAD_LABELS[zoneId];
    },
    [newDatasetUploadLabel],
  );

  const messageForZone = useCallback(
    (zoneId: GlobalDropZoneId) =>
      formatDropOverlayMessage(fileTypeLabel, uploadLabelForZone(zoneId)),
    [fileTypeLabel, uploadLabelForZone],
  );

  const showOverlayForZone = useCallback(
    (zoneId: GlobalDropZoneId) => {
      if (!isDraggingFiles || activeZone !== zoneId) {
        return false;
      }
      if (zoneId === GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET) {
        return (
          spectrumDropEnabled &&
          spectrumFileKind != null &&
          activeZone === GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET
        );
      }
      return true;
    },
    [activeZone, isDraggingFiles, spectrumDropEnabled, spectrumFileKind],
  );

  return useMemo(
    () => ({
      isDraggingFiles,
      activeZone,
      spectrumFileKind,
      fileTypeLabel,
      fileName: draggedFileName,
      uploadLabelForZone,
      messageForZone,
      showOverlayForZone,
    }),
    [
      activeZone,
      draggedFileName,
      fileTypeLabel,
      isDraggingFiles,
      messageForZone,
      showOverlayForZone,
      spectrumFileKind,
      uploadLabelForZone,
    ],
  );
}
