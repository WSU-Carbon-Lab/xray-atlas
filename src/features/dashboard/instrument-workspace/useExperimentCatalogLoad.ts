"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  enrichBeamtimeCatalogThumbnails,
  hydrateBeamtimeCatalogFromCheckpoint,
  mergeCatalogEntriesPreservingThumbnails,
  readCheckpointScanCountsForExperiments,
  streamBeamtimeCatalogFast,
  type StreamBeamtimeCatalogPhase,
} from "~/features/dashboard/lib/buildBeamtimeCatalog";
import type { StxmDirectoryLayout } from "~/features/dashboard/lib/resolveDirectoryLayout";
import type { StxmDirectoryHandle } from "~/features/dashboard/lib/localDirectoryBrowser";
import {
  queryDirectoryReadPermission,
} from "~/features/dashboard/lib/localFolderStorage";
import type { StxmCatalogEntry } from "~/lib/stxm";
import { catalogEntryEnrichmentStatus } from "~/lib/stxm";
import { showToast } from "~/components/ui/toast";

/** Catalog load lifecycle for one experiment selection. */
export type CatalogLoadState =
  | "idle"
  | "cache-hit"
  | "discovering"
  | "parsing"
  | "enriching"
  | "ready"
  | "error"
  | "cancelled";

export type ExperimentCatalogLoadSnapshot = {
  state: CatalogLoadState;
  entries: StxmCatalogEntry[];
  discoveredCount: number;
  parsedCount: number;
  phase: StreamBeamtimeCatalogPhase | null;
  fromCache: boolean;
  error: string | null;
  listingIncomplete: boolean;
  isLoading: boolean;
  isEnriching: boolean;
};

export type UseExperimentCatalogLoadOptions = {
  rootHandle: StxmDirectoryHandle | null;
  directoryLayout: StxmDirectoryLayout | null;
  folderHandleKey: string | null;
  folderRootName: string | null;
  onScanCountUpdate?: (
    experimentName: string,
    scanCount: number,
    nexafsLineScanCount: number,
  ) => void;
  onPendingFolderAccess?: (handleKey: string, displayName: string) => void;
};

const INITIAL_SNAPSHOT: ExperimentCatalogLoadSnapshot = {
  state: "idle",
  entries: [],
  discoveredCount: 0,
  parsedCount: 0,
  phase: null,
  fromCache: false,
  error: null,
  listingIncomplete: false,
  isLoading: false,
  isEnriching: false,
};

function countParsedEntries(entries: StxmCatalogEntry[]): number {
  return entries.filter(
    (entry) => catalogEntryEnrichmentStatus(entry) !== "placeholder",
  ).length;
}

function mapPhaseToState(
  phase: StreamBeamtimeCatalogPhase,
  fromCache: boolean,
): CatalogLoadState {
  if (phase === "cache") {
    return "cache-hit";
  }
  if (phase === "listing") {
    return "discovering";
  }
  if (phase === "parsing") {
    return "parsing";
  }
  if (fromCache) {
    return "cache-hit";
  }
  return "ready";
}

/**
 * Manages checkpoint-first catalog loading for one STXM experiment with generation
 * guards, abort on switch, and non-blocking thumbnail enrichment.
 */
export function useExperimentCatalogLoad(
  options: UseExperimentCatalogLoadOptions,
) {
  const {
    rootHandle,
    directoryLayout,
    folderHandleKey,
    folderRootName,
    onScanCountUpdate,
    onPendingFolderAccess,
  } = options;

  const [snapshot, setSnapshot] =
    useState<ExperimentCatalogLoadSnapshot>(INITIAL_SNAPSHOT);
  const sessionGenerationRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const activeExperimentRef = useRef<string | null>(null);
  const thumbnailEnrichmentRunRef = useRef(0);

  useEffect(() => {
    return () => {
      loadAbortRef.current?.abort();
    };
  }, []);

  const isActiveSession = useCallback(
    (generation: number, experimentName: string) =>
      generation === sessionGenerationRef.current &&
      activeExperimentRef.current === experimentName &&
      !loadAbortRef.current?.signal.aborted,
    [],
  );

  const patchSnapshot = useCallback(
    (
      generation: number,
      experimentName: string,
      patch: Partial<ExperimentCatalogLoadSnapshot>,
    ) => {
      if (!isActiveSession(generation, experimentName)) {
        return false;
      }
      setSnapshot((previous) => ({ ...previous, ...patch }));
      return true;
    },
    [isActiveSession],
  );

  const finalizeSession = useCallback(
    (
      generation: number,
      experimentName: string,
      patch: Partial<ExperimentCatalogLoadSnapshot>,
    ) => {
      if (generation !== sessionGenerationRef.current) {
        return false;
      }
      if (activeExperimentRef.current !== experimentName) {
        return false;
      }
      setSnapshot((previous) => ({ ...previous, ...patch }));
      return true;
    },
    [],
  );

  const resetForExperimentSwitch = useCallback(
    (generation: number, experimentName: string) => {
      loadAbortRef.current?.abort();
      const loadAbort = new AbortController();
      loadAbortRef.current = loadAbort;
      sessionGenerationRef.current = generation;
      activeExperimentRef.current = experimentName;
      setSnapshot({
        ...INITIAL_SNAPSHOT,
        state: "discovering",
        isLoading: true,
      });
      return loadAbort;
    },
    [],
  );

  const loadCatalog = useCallback(
    async (
      experimentName: string,
      loadOptions?: { forceRefresh?: boolean },
    ) => {
      if (!rootHandle || !directoryLayout) {
        return;
      }

      const generation = sessionGenerationRef.current + 1;
      const loadAbort = resetForExperimentSwitch(generation, experimentName);

      const applyScanCounts = (entries: StxmCatalogEntry[]) => {
        if (entries.length === 0) {
          return;
        }
        const nexafs = entries.filter((entry) => entry.isNexafsLineScan).length;
        onScanCountUpdate?.(experimentName, entries.length, nexafs);
      };

      const permission = await queryDirectoryReadPermission(rootHandle);
      if (!isActiveSession(generation, experimentName)) {
        finalizeSession(generation, experimentName, {
          state: "cancelled",
          isLoading: false,
        });
        return;
      }
      if (permission === "denied" || permission === "prompt") {
        const message = "Folder read permission is required to list scan files.";
        finalizeSession(generation, experimentName, {
          state: "error",
          error: message,
          isLoading: false,
        });
        if (folderHandleKey && folderRootName) {
          onPendingFolderAccess?.(folderHandleKey, folderRootName);
        }
        showToast(message, "error");
        return;
      }

      let entries: StxmCatalogEntry[] = [];
      let checkpointPainted = false;
      let activeThumbnailEnrichment: Promise<StxmCatalogEntry[]> | null = null;

      const scheduleThumbnailEnrichment = (
        seed: StxmCatalogEntry[],
        finalizeWhenDone: boolean,
      ) => {
        if (!isActiveSession(generation, experimentName) || seed.length === 0) {
          return null;
        }
        const runId = thumbnailEnrichmentRunRef.current + 1;
        thumbnailEnrichmentRunRef.current = runId;
        patchSnapshot(generation, experimentName, {
          state: "enriching",
          isEnriching: true,
        });
        const promise = enrichBeamtimeCatalogThumbnails(
          rootHandle,
          directoryLayout,
          experimentName,
          seed,
          {
            signal: loadAbort.signal,
            onProgress: (progressEntries) => {
              if (
                runId !== thumbnailEnrichmentRunRef.current ||
                !isActiveSession(generation, experimentName)
              ) {
                return;
              }
              patchSnapshot(generation, experimentName, {
                entries: progressEntries,
              });
            },
          },
        );
        activeThumbnailEnrichment = promise;
        void promise
          .then((enriched) => {
            if (
              runId !== thumbnailEnrichmentRunRef.current ||
              !isActiveSession(generation, experimentName)
            ) {
              return;
            }
            if (finalizeWhenDone) {
              finalizeSession(generation, experimentName, {
                entries: enriched,
                state: "ready",
                phase: "complete",
                isEnriching: false,
              });
              return;
            }
            patchSnapshot(generation, experimentName, {
              entries: enriched,
              isEnriching: false,
            });
          })
          .catch(() => {
            if (
              runId !== thumbnailEnrichmentRunRef.current ||
              !isActiveSession(generation, experimentName)
            ) {
              return;
            }
            if (finalizeWhenDone) {
              finalizeSession(generation, experimentName, {
                isEnriching: false,
                state: "ready",
              });
              return;
            }
            patchSnapshot(generation, experimentName, {
              isEnriching: false,
            });
          });
        return promise;
      };

      const forceRefresh = loadOptions?.forceRefresh === true;

      if (!forceRefresh) {
        const hydrated = await hydrateBeamtimeCatalogFromCheckpoint(
          rootHandle,
          directoryLayout,
          experimentName,
        );
        if (!isActiveSession(generation, experimentName)) {
          finalizeSession(generation, experimentName, {
            state: "cancelled",
            isLoading: false,
          });
          return;
        }
        if (hydrated.length > 0) {
          entries = hydrated;
          checkpointPainted = true;
          const parsedCount = countParsedEntries(entries);
          patchSnapshot(generation, experimentName, {
            state: "cache-hit",
            entries,
            discoveredCount: entries.length,
            parsedCount,
            phase: "cache",
            fromCache: true,
            isLoading: false,
            error: null,
            listingIncomplete: false,
          });
          applyScanCounts(entries);
          scheduleThumbnailEnrichment(entries, false);
        }
      }

      try {
        const result = await streamBeamtimeCatalogFast(
          rootHandle,
          directoryLayout,
          experimentName,
          {
            signal: loadAbort.signal,
            skipInitialCheckpoint: forceRefresh || checkpointPainted,
            onProgress: (progress) => {
              if (!isActiveSession(generation, experimentName)) {
                return;
              }
              const parsedCount = countParsedEntries(progress.entries);
              const nextState = mapPhaseToState(
                progress.phase,
                progress.fromCache,
              );
              const backgroundRefresh =
                checkpointPainted && !forceRefresh;
              setSnapshot((previous) => ({
                ...previous,
                entries: mergeCatalogEntriesPreservingThumbnails(
                  previous.entries,
                  progress.entries,
                ),
                discoveredCount: Math.max(
                  previous.discoveredCount,
                  progress.discoveredCount,
                ),
                parsedCount,
                phase: progress.phase,
                fromCache: progress.fromCache,
                state:
                  backgroundRefresh && progress.phase === "listing"
                    ? "cache-hit"
                    : nextState,
                isLoading: forceRefresh
                  ? progress.phase !== "complete"
                  : backgroundRefresh
                    ? progress.phase === "parsing"
                    : progress.phase !== "complete",
                listingIncomplete: false,
              }));
              if (progress.discoveredCount > 0) {
                applyScanCounts(progress.entries);
              }
            },
          },
        );

        if (!isActiveSession(generation, experimentName)) {
          finalizeSession(generation, experimentName, {
            state: "cancelled",
            isLoading: false,
            isEnriching: false,
          });
          return;
        }

        if (activeThumbnailEnrichment) {
          try {
            const enrichedSoFar = await activeThumbnailEnrichment;
            entries = mergeCatalogEntriesPreservingThumbnails(
              enrichedSoFar,
              result.entries,
            );
          } catch {
            entries = result.entries;
          }
        } else {
          entries = result.entries;
        }
        const parsedCount = countParsedEntries(entries);
        finalizeSession(generation, experimentName, {
          entries,
          discoveredCount: entries.length,
          parsedCount,
          phase: result.complete ? "complete" : "parsing",
          fromCache: checkpointPainted && entries.length > 0,
          state: result.complete ? "ready" : "discovering",
          isLoading: false,
          listingIncomplete: result.stalled && entries.length > 0,
          error: null,
        });
        applyScanCounts(entries);
      } catch (error) {
        if (!isActiveSession(generation, experimentName)) {
          finalizeSession(generation, experimentName, {
            state: "cancelled",
            isLoading: false,
            isEnriching: false,
          });
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to load scans";
        finalizeSession(generation, experimentName, {
          state: "error",
          error: message,
          entries: entries.length > 0 ? entries : [],
          isLoading: false,
          isEnriching: false,
        });
        showToast(message, "error");
        return;
      }

      if (!isActiveSession(generation, experimentName) || entries.length === 0) {
        return;
      }

      scheduleThumbnailEnrichment(entries, true);
    },
    [
      directoryLayout,
      finalizeSession,
      folderHandleKey,
      folderRootName,
      isActiveSession,
      onPendingFolderAccess,
      onScanCountUpdate,
      patchSnapshot,
      resetForExperimentSwitch,
      rootHandle,
    ],
  );

  const clearCatalog = useCallback(() => {
    loadAbortRef.current?.abort();
    sessionGenerationRef.current += 1;
    activeExperimentRef.current = null;
    setSnapshot(INITIAL_SNAPSHOT);
  }, []);

  return {
    snapshot,
    loadCatalog,
    clearCatalog,
    readCheckpointScanCounts: useCallback(
      async (experimentNames: string[]) => {
        if (!rootHandle || !directoryLayout) {
          return new Map<string, { total: number; nexafs: number }>();
        }
        return readCheckpointScanCountsForExperiments(
          rootHandle,
          directoryLayout,
          experimentNames,
        );
      },
      [directoryLayout, rootHandle],
    ),
  };
}
