"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DashboardIngestionResult,
  DashboardPreviewStepMetadata,
  DashboardReduceStepMetadata,
  DashboardRegionsStepMetadata,
  DashboardStepMetadata,
} from "~/lib/dashboard-processing-session";
import type { StxmExportStepMetadata } from "~/features/dashboard/lib/stxm-export-metadata";
import type { StxmDirectoryHandle } from "~/features/dashboard/lib/fileSystemAccessTypes";
import {
  applyPreviewCacheToSessionScans,
  createEmptyStxmSessionFile,
  importLegacyDashboardMetadataIntoSessionFile,
  mergeStxmSessionScanEntry,
  readStxmSessionFile,
  resolveStxmSessionExport,
  resolveStxmSessionIngestion,
  resolveStxmSessionPreview,
  resolveStxmSessionReduce,
  resolveStxmSessionRegionSpectra,
  resolveStxmSessionRegions,
  writeStxmSessionFile,
  type StxmSessionFile,
} from "~/features/dashboard/lib/stxm-session-file";

const SESSION_WRITE_DEBOUNCE_MS = 400;

export type UseStxmSessionFileOptions = {
  experimentDirectory: StxmDirectoryHandle | null;
  experimentName: string | null;
  legacyStepMetadata?: DashboardStepMetadata;
};

export type UseStxmSessionFileResult = {
  sessionFile: StxmSessionFile | null;
  isLoading: boolean;
  isReady: boolean;
  resolveRegions: (scanId: string) => DashboardRegionsStepMetadata | undefined;
  resolveIngestion: (scanId: string) => DashboardIngestionResult | undefined;
  resolveReduce: (scanId: string) => DashboardReduceStepMetadata | undefined;
  resolveExport: (scanId: string) => StxmExportStepMetadata | undefined;
  resolveRegionSpectra: (
    scanId: string,
  ) => ReturnType<typeof resolveStxmSessionRegionSpectra>;
  previewMetadata: DashboardPreviewStepMetadata;
  persistRegions: (regions: DashboardRegionsStepMetadata) => Promise<void>;
  persistReduce: (reduce: DashboardReduceStepMetadata) => Promise<void>;
  persistIngestion: (ingestion: DashboardIngestionResult) => Promise<void>;
  persistPreview: (preview: DashboardPreviewStepMetadata) => Promise<void>;
  persistExport: (
    scanId: string,
    exportMeta: StxmExportStepMetadata,
  ) => Promise<void>;
  flushSession: () => Promise<void>;
};

/**
 * Loads and persists STXM ingestion state in `.xray-atlas-stxm-session.json` beside scans.
 *
 * Keeps one in-memory copy per experiment folder, debounces writes, and flushes immediately on
 * scan switch via {@link UseStxmSessionFileResult.flushSession}. Assumes a single browser tab per
 * experiment folder (no cross-tab sync).
 */
export function useStxmSessionFile(
  options: UseStxmSessionFileOptions,
): UseStxmSessionFileResult {
  const { experimentDirectory, experimentName, legacyStepMetadata } = options;
  const [sessionFile, setSessionFile] = useState<StxmSessionFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const sessionRef = useRef<StxmSessionFile | null>(null);
  const directoryRef = useRef<StxmDirectoryHandle | null>(null);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const legacyImportedRef = useRef(false);
  const legacyStepMetadataRef = useRef(legacyStepMetadata);
  legacyStepMetadataRef.current = legacyStepMetadata;

  const applySession = useCallback((next: StxmSessionFile) => {
    sessionRef.current = next;
    setSessionFile(next);
  }, []);

  const writeNow = useCallback(async () => {
    const directory = directoryRef.current;
    const session = sessionRef.current;
    if (!directory || !session) {
      return;
    }
    await writeStxmSessionFile(directory, session);
  }, []);

  const scheduleWrite = useCallback(() => {
    if (writeTimerRef.current) {
      clearTimeout(writeTimerRef.current);
    }
    writeTimerRef.current = setTimeout(() => {
      writeTimerRef.current = null;
      void writeNow();
    }, SESSION_WRITE_DEBOUNCE_MS);
  }, [writeNow]);

  const flushSession = useCallback(async () => {
    if (writeTimerRef.current) {
      clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
    await writeNow();
  }, [writeNow]);

  useEffect(() => {
    directoryRef.current = experimentDirectory;
    if (!experimentDirectory || !experimentName) {
      sessionRef.current = null;
      setSessionFile(null);
      setIsReady(false);
      setIsLoading(false);
      legacyImportedRef.current = false;
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsReady(false);
    legacyImportedRef.current = false;

    void (async () => {
      const parsed = await readStxmSessionFile(experimentDirectory);
      if (cancelled) {
        return;
      }
      let next =
        parsed ??
        createEmptyStxmSessionFile(experimentName);
      const legacy = legacyStepMetadataRef.current;
      const legacyBeamtime = legacy?.workspace?.beamtimeName?.trim();
      const shouldImportLegacy =
        Boolean(legacy) &&
        legacyBeamtime === experimentName.trim();
      if (!parsed && shouldImportLegacy && !legacyImportedRef.current) {
        next = importLegacyDashboardMetadataIntoSessionFile(
          next,
          legacy,
        );
        legacyImportedRef.current = true;
        void writeStxmSessionFile(experimentDirectory, next);
      }
      applySession(next);
      setIsLoading(false);
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
      if (writeTimerRef.current) {
        clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
      void writeNow();
    };
  }, [applySession, experimentDirectory, experimentName, writeNow]);

  const mutateSession = useCallback(
    (updater: (current: StxmSessionFile) => StxmSessionFile) => {
      const current =
        sessionRef.current ??
        (experimentName
          ? createEmptyStxmSessionFile(experimentName)
          : null);
      if (!current) {
        return null;
      }
      const next = updater(current);
      applySession(next);
      scheduleWrite();
      return next;
    },
    [applySession, experimentName, scheduleWrite],
  );

  const persistRegions = useCallback(
    async (regions: DashboardRegionsStepMetadata) => {
      const scanKey = regions.scanId?.trim();
      if (!scanKey) {
        return;
      }
      mutateSession((current) =>
        mergeStxmSessionScanEntry(current, scanKey, { regions }),
      );
    },
    [mutateSession],
  );

  const persistReduce = useCallback(
    async (reduce: DashboardReduceStepMetadata) => {
      const scanKey = reduce.scanId.trim();
      if (!scanKey) {
        return;
      }
      mutateSession((current) =>
        mergeStxmSessionScanEntry(current, scanKey, { reduce }),
      );
    },
    [mutateSession],
  );

  const persistIngestion = useCallback(
    async (ingestion: DashboardIngestionResult) => {
      const scanKey = ingestion.scanId.trim();
      if (!scanKey) {
        return;
      }
      mutateSession((current) =>
        mergeStxmSessionScanEntry(current, scanKey, { ingestion }),
      );
    },
    [mutateSession],
  );

  const persistPreview = useCallback(
    async (preview: DashboardPreviewStepMetadata) => {
      mutateSession((current) => applyPreviewCacheToSessionScans(current, preview));
    },
    [mutateSession],
  );

  const persistExport = useCallback(
    async (scanId: string, exportMeta: StxmExportStepMetadata) => {
      const scanKey = scanId.trim();
      if (!scanKey) {
        return;
      }
      mutateSession((current) =>
        mergeStxmSessionScanEntry(current, scanKey, { export: exportMeta }),
      );
    },
    [mutateSession],
  );

  const resolveRegions = useCallback(
    (scanId: string) => resolveStxmSessionRegions(sessionRef.current, scanId),
    [],
  );

  const resolveIngestion = useCallback(
    (scanId: string) => resolveStxmSessionIngestion(sessionRef.current, scanId),
    [],
  );

  const resolveReduce = useCallback(
    (scanId: string) => resolveStxmSessionReduce(sessionRef.current, scanId),
    [],
  );

  const resolveExport = useCallback(
    (scanId: string) => resolveStxmSessionExport(sessionRef.current, scanId),
    [],
  );

  const resolveRegionSpectra = useCallback(
    (scanId: string) => resolveStxmSessionRegionSpectra(sessionRef.current, scanId),
    [],
  );

  const previewMetadata = resolveStxmSessionPreview(sessionFile);

  return {
    sessionFile,
    isLoading,
    isReady,
    resolveRegions,
    resolveIngestion,
    resolveReduce,
    resolveExport,
    resolveRegionSpectra,
    previewMetadata,
    persistRegions,
    persistReduce,
    persistIngestion,
    persistPreview,
    persistExport,
    flushSession,
  };
}
