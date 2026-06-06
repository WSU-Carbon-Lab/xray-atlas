"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Spinner } from "@heroui/react";
import { ArrowLeft, FlaskConical } from "lucide-react";
import type { StxmExportStepMetadata } from "~/features/dashboard/lib/stxm-export-metadata";
import {
  ALS_5322_INSTRUMENT_LABEL,
  ALS_5322_INSTRUMENT_SLUG,
  defaultDashboardStepMetadata,
  type DashboardIngestionResult,
  type DashboardPreviewStepMetadata,
  type DashboardReduceStepMetadata,
  type DashboardRegionsStepMetadata,
  type DashboardStepMetadata,
  type DashboardWorkspaceContext,
  type DashboardWorkspaceTab,
} from "~/lib/dashboard-processing-session";
import {
  summarizeBeamtimeFolders,
  type StxmCatalogEntry,
} from "~/lib/stxm";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import {
  countHdrFilesInExperiments,
  loadScanFilesFromCatalogEntry,
} from "~/features/dashboard/lib/buildBeamtimeCatalog";
import {
  pickStxmRootDirectory,
} from "~/features/dashboard/lib/localDirectoryBrowser";
import {
  resolveStxmDirectoryLayout,
  type StxmDirectoryLayout,
} from "~/features/dashboard/lib/resolveDirectoryLayout";
import {
  loadDirectoryHandle,
  loadRecentFolders,
  queryDirectoryReadPermission,
  requestDirectoryReadPermission,
  resolveFolderHandleKey,
  storeDirectoryHandle,
  touchRecentFolder,
  type RecentStxmFolder,
} from "~/features/dashboard/lib/localFolderStorage";
import type { StxmDirectoryHandle } from "~/features/dashboard/lib/fileSystemAccessTypes";
import { BeamtimeScroller } from "./beamtime-scroller";
import { ExperimentFileBrowser } from "./experiment-file-browser";
import { useExperimentCatalogLoad } from "./useExperimentCatalogLoad";
import {
  FolderPickerPrompt,
  RecentFolderPills,
} from "./folder-picker-prompt";
import {
  grantStxmComputeConsent,
  readStxmComputeConsentGranted,
} from "~/lib/stxm/compute-consent";
import { IngestionTab, LcfPlaceholder } from "./ingestion-tab";
import { PreviewSpectraTab } from "./preview-spectra-tab";
import { StxmWorkspaceOnboarding } from "./stxm-workspace-onboarding";
import { WorkspaceChrome } from "./workspace-chrome";

const BL5322_BREADCRUMB = "BL5322";

/**
 * ALS 5.3.2.2 STXM workspace with local folder browser and ingestion tabs.
 */
export function Als5322WorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("session");

  const utils = trpc.useUtils();
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
  const createSession = trpc.dashboardSessions.create.useMutation();
  const updateSession = trpc.dashboardSessions.update.useMutation();

  const sessionQuery = trpc.dashboardSessions.getById.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: Boolean(sessionId) },
  );

  const [rootHandle, setRootHandle] = useState<StxmDirectoryHandle | null>(
    null,
  );
  const [folderHandleKey, setFolderHandleKey] = useState<string | null>(null);
  const [folderRootName, setFolderRootName] = useState<string | null>(null);
  const [recentFolders, setRecentFolders] = useState<RecentStxmFolder[]>([]);
  const [beamtimes, setBeamtimes] = useState<
    ReturnType<typeof summarizeBeamtimeFolders>
  >([]);
  const [selectedBeamtime, setSelectedBeamtime] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<StxmCatalogEntry | null>(
    null,
  );
  const [selectedFiles, setSelectedFiles] = useState<{
    hdrFile: File;
    ximFile: File;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardWorkspaceTab>("experiment");
  const [isPicking, setIsPicking] = useState(false);
  const [isLoadingBeamtimes, setIsLoadingBeamtimes] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [directoryLayout, setDirectoryLayout] =
    useState<StxmDirectoryLayout | null>(null);
  const [beamtimeLoadError, setBeamtimeLoadError] = useState<string | null>(
    null,
  );
  const [pendingFolderAccess, setPendingFolderAccess] = useState<{
    handleKey: string;
    displayName: string;
  } | null>(null);
  const [computeConsentGranted, setComputeConsentGranted] = useState(false);
  const [folderRestoreAttempted, setFolderRestoreAttempted] = useState(false);
  const [isRestoringFolder, setIsRestoringFolder] = useState(false);
  const [isSelectingScan, setIsSelectingScan] = useState(false);
  const [selectingScanRelativePath, setSelectingScanRelativePath] = useState<
    string | null
  >(null);
  const scanSelectGenerationRef = useRef(0);

  const applyBeamtimeScanCounts = useCallback(
    (experimentName: string, scanCount: number, nexafsLineScanCount: number) => {
      setBeamtimes((previous) =>
        previous.map((row) =>
          row.name === experimentName
            ? {
                ...row,
                scanCount: Math.max(row.scanCount, scanCount),
                nexafsLineScanCount: Math.max(
                  row.nexafsLineScanCount,
                  nexafsLineScanCount,
                ),
              }
            : row,
        ),
      );
    },
    [],
  );

  const { snapshot: catalogSnapshot, loadCatalog, clearCatalog, readCheckpointScanCounts } =
    useExperimentCatalogLoad({
      rootHandle,
      directoryLayout,
      folderHandleKey,
      folderRootName,
      onScanCountUpdate: applyBeamtimeScanCounts,
      onPendingFolderAccess: (handleKey, displayName) => {
        setPendingFolderAccess({ handleKey, displayName });
      },
    });

  const catalog = catalogSnapshot.entries;
  const isLoadingCatalog = catalogSnapshot.isLoading;
  const isEnrichingCatalog = catalogSnapshot.isEnriching;
  const catalogLoadError = catalogSnapshot.error;
  const catalogListingIncomplete = catalogSnapshot.listingIncomplete;
  const catalogScanPhase = catalogSnapshot.phase;
  const catalogFromCache = catalogSnapshot.fromCache;

  const stepMetadata =
    sessionQuery.data?.stepMetadata ?? defaultDashboardStepMetadata();

  const folderAccessReady = Boolean(rootHandle) || Boolean(pendingFolderAccess);
  const workspaceUnlocked = computeConsentGranted && folderAccessReady;
  const showOnboarding = folderRestoreAttempted && !workspaceUnlocked;

  useEffect(() => {
    setRecentFolders(loadRecentFolders());
    setComputeConsentGranted(readStxmComputeConsentGranted());
  }, []);

  useEffect(() => {
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl]);

  const persistWorkspace = useCallback(
    async (patch: Partial<DashboardWorkspaceContext>) => {
      if (!sessionId) {
        return;
      }
      const base = stepMetadata;
      const next: DashboardStepMetadata = {
        ...base,
        workspace: {
          ...base.workspace,
          folderRootName: folderRootName ?? base.workspace?.folderRootName,
          folderHandleKey: folderHandleKey ?? base.workspace?.folderHandleKey,
          beamtimeName: selectedBeamtime ?? base.workspace?.beamtimeName ?? null,
          selectedScanRelativePath:
            selectedEntry?.relativePath ??
            base.workspace?.selectedScanRelativePath ??
            null,
          selectedScanBasename:
            selectedEntry?.basename ?? base.workspace?.selectedScanBasename ?? null,
          activeTab: activeTab ?? base.workspace?.activeTab ?? "experiment",
          ...patch,
        },
      };
      await updateSession.mutateAsync({ sessionId, stepMetadata: next });
    },
    [
      activeTab,
      folderHandleKey,
      folderRootName,
      selectedBeamtime,
      selectedEntry,
      sessionId,
      stepMetadata,
      updateSession,
    ],
  );

  const ensureSession = useCallback(
    async (title: string) => {
      if (sessionId) {
        return sessionId;
      }
      const created = await createSession.mutateAsync({
        instrumentSlug: ALS_5322_INSTRUMENT_SLUG,
        title,
      });
      setSessionId(created.id);
      router.replace(
        `/dashboard/instruments/als-5322?session=${created.id}`,
        { scroll: false },
      );
      return created.id;
    },
    [createSession, router, sessionId],
  );

  const enrichScanCounts = useCallback(
    async (handle: StxmDirectoryHandle, layout: StxmDirectoryLayout) => {
      const names =
        layout.mode === "single-experiment"
          ? [layout.displayName]
          : layout.experimentNames;
      try {
        const checkpointCounts = await readCheckpointScanCounts(names);
        setBeamtimes((previous) =>
          previous.map((row) => {
            const cached = checkpointCounts.get(row.name);
            if (!cached || cached.total === 0) {
              return row;
            }
            return {
              ...row,
              scanCount: Math.max(row.scanCount, cached.total),
              nexafsLineScanCount: Math.max(
                row.nexafsLineScanCount,
                cached.nexafs,
              ),
            };
          }),
        );
        const hdrCounts = await countHdrFilesInExperiments(
          handle,
          layout,
          names,
        );
        setBeamtimes((previous) =>
          previous.map((row) => ({
            ...row,
            scanCount: hdrCounts.get(row.name) ?? row.scanCount,
          })),
        );
      } catch {
        // counts are optional; listing already rendered
      }
    },
    [readCheckpointScanCounts],
  );

  const refreshBeamtimes = useCallback(
    async (handle: StxmDirectoryHandle, autoSelectFirst = true) => {
      setIsLoadingBeamtimes(true);
      setBeamtimeLoadError(null);
      try {
        const layout = await resolveStxmDirectoryLayout(handle);
        setDirectoryLayout(layout);

        if (layout.mode === "single-experiment") {
          const rows = [
            {
              name: layout.displayName,
              scanCount: 0,
              nexafsLineScanCount: 0,
            },
          ];
          setBeamtimes(rows);
          setIsLoadingBeamtimes(false);
          void enrichScanCounts(handle, layout);
          if (autoSelectFirst) {
            setSelectedBeamtime(layout.displayName);
            setSelectedEntry(null);
            setSelectedFiles(null);
            void loadCatalog(layout.displayName);
          }
          return layout;
        }

        const rows = summarizeBeamtimeFolders(layout.experimentNames, new Map());
        setBeamtimes(rows);
        setIsLoadingBeamtimes(false);
        void enrichScanCounts(handle, layout);

        if (autoSelectFirst && rows.length > 0) {
          const first = rows[0]?.name;
          if (first) {
            setSelectedBeamtime(first);
            setSelectedEntry(null);
            setSelectedFiles(null);
            void loadCatalog(first);
          }
        }
        return layout;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to list experiments";
        setBeamtimeLoadError(message);
        setBeamtimes([]);
        setDirectoryLayout(null);
        showToast(message, "error");
        return null;
      } finally {
        setIsLoadingBeamtimes(false);
      }
    },
    [enrichScanCounts, loadCatalog],
  );

  useEffect(() => {
    const workspace = sessionQuery.data?.stepMetadata?.workspace;
    const handleKey = workspace?.folderHandleKey;
    if (!handleKey) {
      setFolderRestoreAttempted(true);
      return;
    }
    if (rootHandle || isLoadingBeamtimes) {
      setFolderRestoreAttempted(true);
      return;
    }
    let cancelled = false;
    setIsRestoringFolder(true);
    void (async () => {
      try {
        const handle = await loadDirectoryHandle(handleKey);
        if (cancelled || !handle) {
          return;
        }
        const permission = await queryDirectoryReadPermission(handle);
        if (cancelled) {
          return;
        }
        if (permission !== "granted" && permission !== "unsupported") {
          setPendingFolderAccess({
            handleKey,
            displayName: workspace?.folderRootName ?? handle.name,
          });
          return;
        }
        setRootHandle(handle);
        setFolderHandleKey(handleKey);
        setFolderRootName(workspace?.folderRootName ?? handle.name);
        const layout = await refreshBeamtimes(handle, false);
        if (cancelled || !layout) {
          return;
        }
        const savedBeamtime = workspace?.beamtimeName;
        if (savedBeamtime) {
          setSelectedBeamtime(savedBeamtime);
          await loadCatalog(savedBeamtime);
        }
        if (workspace?.activeTab) {
          setActiveTab(workspace.activeTab);
        }
      } finally {
        if (!cancelled) {
          setIsRestoringFolder(false);
          setFolderRestoreAttempted(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isLoadingBeamtimes,
    loadCatalog,
    refreshBeamtimes,
    rootHandle,
    sessionQuery.data?.stepMetadata?.workspace,
  ]);

  const bindRootHandle = useCallback(
    async (handle: StxmDirectoryHandle, key: string) => {
      const allowed = await requestDirectoryReadPermission(handle);
      if (!allowed) {
        showToast("Read permission denied for this folder.", "error");
        return;
      }
      setPendingFolderAccess(null);
      setRootHandle(handle);
      setFolderHandleKey(key);
      setFolderRootName(handle.name);
      setSelectedBeamtime(null);
      clearCatalog();
      setSelectedEntry(null);
      setSelectedFiles(null);
      setActiveTab("experiment");
      setDirectoryLayout(null);
      setBeamtimeLoadError(null);
      setRecentFolders(touchRecentFolder(key, handle.name));
      void storeDirectoryHandle(key, handle);
      void ensureSession(handle.name);
      await refreshBeamtimes(handle);
      void persistWorkspace({
        folderRootName: handle.name,
        folderHandleKey: key,
        beamtimeName: null,
        selectedScanRelativePath: null,
        selectedScanBasename: null,
        activeTab: "experiment",
      });
    },
    [clearCatalog, ensureSession, persistWorkspace, refreshBeamtimes],
  );

  const grantStoredFolderAccess = useCallback(async () => {
    if (!pendingFolderAccess) {
      return;
    }
    const handle = await loadDirectoryHandle(pendingFolderAccess.handleKey);
    if (!handle) {
      showToast("Recent folder unavailable. Select it again.", "error");
      setPendingFolderAccess(null);
      return;
    }
    await bindRootHandle(handle, pendingFolderAccess.handleKey);
  }, [bindRootHandle, pendingFolderAccess]);

  const handleGrantCompute = useCallback(() => {
    grantStxmComputeConsent();
    setComputeConsentGranted(true);
  }, []);

  const handlePickFolder = useCallback(async () => {
    setIsPicking(true);
    try {
      const handle = await pickStxmRootDirectory();
      const key = resolveFolderHandleKey(handle.name);
      await bindRootHandle(handle, key);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        showToast(error.message, "error");
      }
    } finally {
      setIsPicking(false);
    }
  }, [bindRootHandle]);

  const handleOpenRecent = useCallback(
    async (key: string) => {
      const handle = await loadDirectoryHandle(key);
      if (!handle) {
        showToast("Recent folder unavailable. Select it again.", "error");
        return;
      }
      await bindRootHandle(handle, key);
    },
    [bindRootHandle],
  );

  const handleSelectBeamtime = useCallback(
    (name: string) => {
      if (!rootHandle || !directoryLayout) {
        return;
      }
      setSelectedBeamtime(name);
      setSelectedEntry(null);
      setSelectedFiles(null);
      void loadCatalog(name);
      void persistWorkspace({ beamtimeName: name, activeTab: "experiment" });
    },
    [directoryLayout, loadCatalog, persistWorkspace, rootHandle],
  );

  const handleSelectScan = useCallback(
    async (entry: StxmCatalogEntry) => {
      if (!rootHandle || !selectedBeamtime || !directoryLayout) {
        return;
      }
      if (entry.relativePath === selectedEntry?.relativePath) {
        return;
      }
      const generation = scanSelectGenerationRef.current + 1;
      scanSelectGenerationRef.current = generation;
      setSelectingScanRelativePath(entry.relativePath);
      setIsSelectingScan(true);
      setSelectedEntry(entry);
      try {
        if (entry.isNexafsLineScan) {
          const files = await loadScanFilesFromCatalogEntry(
            rootHandle,
            directoryLayout,
            selectedBeamtime,
            entry,
          );
          if (generation !== scanSelectGenerationRef.current) {
            return;
          }
          if (!files) {
            showToast("Missing paired .xim file for this line scan.", "error");
            return;
          }
          setSelectedFiles(files);
          setActiveTab("ingestion");
          void persistWorkspace({
            selectedScanRelativePath: entry.relativePath,
            selectedScanBasename: entry.basename,
            activeTab: "ingestion",
          });
        } else {
          showToast(
            `${entry.scanType} preview only; select a NEXAFS line scan for ingestion.`,
            "success",
          );
        }
      } finally {
        if (generation === scanSelectGenerationRef.current) {
          setIsSelectingScan(false);
          setSelectingScanRelativePath(null);
        }
      }
    },
    [
      directoryLayout,
      persistWorkspace,
      rootHandle,
      selectedBeamtime,
      selectedEntry?.relativePath,
    ],
  );

  const handleReload = useCallback(async () => {
    if (!rootHandle) {
      return;
    }
    const allowed = await requestDirectoryReadPermission(rootHandle);
    if (!allowed) {
      if (folderHandleKey && folderRootName) {
        setPendingFolderAccess({
          handleKey: folderHandleKey,
          displayName: folderRootName,
        });
      }
      showToast("Re-grant folder access to reload.", "error");
      return;
    }
    setIsReloading(true);
    try {
      const layout = await refreshBeamtimes(rootHandle, false);
      if (layout && selectedBeamtime) {
        await loadCatalog(selectedBeamtime, { forceRefresh: true });
      }
      showToast("Reloaded folder contents", "success");
    } finally {
      setIsReloading(false);
    }
  }, [folderHandleKey, folderRootName, loadCatalog, refreshBeamtimes, rootHandle, selectedBeamtime]);

  const persistRegions = useCallback(
    async (regions: DashboardRegionsStepMetadata) => {
      if (!sessionId) {
        return;
      }
      const next: DashboardStepMetadata = {
        ...stepMetadata,
        regions,
      };
      await updateSession.mutateAsync({ sessionId, stepMetadata: next });
      void utils.dashboardSessions.getById.invalidate({ sessionId });
    },
    [sessionId, stepMetadata, updateSession, utils.dashboardSessions.getById],
  );

  const persistReduce = useCallback(
    async (reduce: DashboardReduceStepMetadata) => {
      if (!sessionId) {
        return;
      }
      const next: DashboardStepMetadata = {
        ...stepMetadata,
        reduce,
      };
      await updateSession.mutateAsync({
        sessionId,
        status: "ready",
        stepMetadata: next,
      });
      void utils.dashboardSessions.getById.invalidate({ sessionId });
    },
    [sessionId, stepMetadata, updateSession, utils.dashboardSessions.getById],
  );

  const persistIngestion = useCallback(
    async (ingestion: DashboardIngestionResult) => {
      if (!sessionId) {
        return;
      }
      const next: DashboardStepMetadata = {
        ...stepMetadata,
        ingestion,
      };
      await updateSession.mutateAsync({
        sessionId,
        status: "ready",
        stepMetadata: next,
      });
      void utils.dashboardSessions.getById.invalidate({ sessionId });
    },
    [sessionId, stepMetadata, updateSession, utils.dashboardSessions.getById],
  );

  const persistPreview = useCallback(
    async (preview: DashboardPreviewStepMetadata) => {
      if (!sessionId) {
        return;
      }
      const next: DashboardStepMetadata = {
        ...stepMetadata,
        preview,
      };
      await updateSession.mutateAsync({
        sessionId,
        status: "ready",
        stepMetadata: next,
      });
      void utils.dashboardSessions.getById.invalidate({ sessionId });
    },
    [sessionId, stepMetadata, updateSession, utils.dashboardSessions.getById],
  );

  const persistExport = useCallback(
    async (exportMeta: StxmExportStepMetadata) => {
      if (!sessionId) {
        return;
      }
      const next: DashboardStepMetadata = {
        ...stepMetadata,
        export: exportMeta,
      };
      await updateSession.mutateAsync({ sessionId, stepMetadata: next });
      void utils.dashboardSessions.getById.invalidate({ sessionId });
    },
    [sessionId, stepMetadata, updateSession, utils.dashboardSessions.getById],
  );

  const refreshSession = useCallback(() => {
    if (sessionId) {
      void utils.dashboardSessions.getById.invalidate({ sessionId });
    }
  }, [sessionId, utils.dashboardSessions.getById]);

  const breadcrumb = useMemo(() => {
    const parts = [BL5322_BREADCRUMB];
    if (folderRootName) {
      parts.push(folderRootName);
    }
    if (selectedBeamtime) {
      parts.push(selectedBeamtime);
    }
    if (selectedEntry) {
      parts.push(selectedEntry.basename);
    }
    return parts;
  }, [folderRootName, selectedBeamtime, selectedEntry]);

  const tabPanel = useMemo(() => {
    switch (activeTab) {
      case "experiment":
        if (pendingFolderAccess && !rootHandle) {
          return (
            <p className="text-muted text-sm">
              Use the button above to re-grant folder access, or select a new data
              folder.
            </p>
          );
        }
        if (!rootHandle) {
          if (pendingFolderAccess) {
            return (
              <p className="text-muted text-sm">
                Confirm folder read access using the banner above, then browse
                experiments here.
              </p>
            );
          }
          return (
            <FolderPickerPrompt
              onPickFolder={() => void handlePickFolder()}
              isPicking={isPicking}
            />
          );
        }
        return (
          <div className="flex flex-col gap-6">
            <section>
              <h2 className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
                Experiments
              </h2>
              <BeamtimeScroller
                beamtimes={beamtimes}
                selectedName={selectedBeamtime}
                onSelect={(name) => void handleSelectBeamtime(name)}
                loading={isLoadingBeamtimes}
                error={beamtimeLoadError}
                onRetry={
                  rootHandle
                    ? () => void refreshBeamtimes(rootHandle)
                    : undefined
                }
              />
            </section>
            {selectedBeamtime ? (
              <section>
                <h2 className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
                  Experiment files
                </h2>
                {catalogLoadError ? (
                  <div className="border-border bg-default/30 mb-3 flex flex-col items-start gap-2 rounded-lg border px-4 py-3">
                    <p className="text-foreground text-sm">{catalogLoadError}</p>
                    <button
                      type="button"
                      className="text-accent text-sm font-medium hover:underline"
                      onClick={() =>
                        void handleSelectBeamtime(selectedBeamtime)
                      }
                    >
                      Retry loading scans
                    </button>
                  </div>
                ) : null}
                {catalogListingIncomplete && !catalogLoadError ? (
                  <div className="border-border bg-default/30 mb-3 flex flex-col items-start gap-2 rounded-lg border px-4 py-3">
                    <p className="text-muted text-sm">
                      Found {catalog.length} scan
                      {catalog.length === 1 ? "" : "s"} so far. Still scanning
                      deeper folders, or listing paused before completion.
                    </p>
                    <button
                      type="button"
                      className="text-accent text-sm font-medium hover:underline"
                      onClick={() =>
                        void handleSelectBeamtime(selectedBeamtime)
                      }
                    >
                      Continue scan listing
                    </button>
                  </div>
                ) : null}
                <ExperimentFileBrowser
                  entries={catalog}
                  selectedRelativePath={selectedEntry?.relativePath ?? null}
                  loading={isLoadingCatalog}
                  enriching={isEnrichingCatalog}
                  scanPhase={catalogScanPhase}
                  fromCache={catalogFromCache}
                  onSelect={(entry) => void handleSelectScan(entry)}
                />
              </section>
            ) : null}
          </div>
        );
      case "ingestion":
        if (!selectedFiles) {
          return (
            <p className="text-muted text-sm">
              Select a NEXAFS line scan on the Experiment tab to configure regions
              and recompute spectra.
            </p>
          );
        }
        return (
          <IngestionTab
            sessionId={sessionId}
            exportMetadata={stepMetadata.export}
            hdrFile={selectedFiles.hdrFile}
            ximFile={selectedFiles.ximFile}
            scanLabel={selectedEntry?.relativePath ?? selectedFiles.hdrFile.name}
            scanId={selectedEntry?.relativePath ?? selectedFiles.hdrFile.name}
            energyMinEv={selectedEntry?.energyMinEv ?? null}
            energyMaxEv={selectedEntry?.energyMaxEv ?? null}
            catalogEntries={catalog}
            selectedScanRelativePath={selectedEntry?.relativePath ?? null}
            catalogLoading={isLoadingCatalog}
            catalogEnriching={isEnrichingCatalog}
            catalogScanPhase={catalogScanPhase}
            isSelectingScan={isSelectingScan}
            selectingScanRelativePath={selectingScanRelativePath}
            onSelectCatalogScan={(entry) => void handleSelectScan(entry)}
            regionsMetadata={stepMetadata.regions}
            reduceMetadata={stepMetadata.reduce}
            ingestionMetadata={stepMetadata.ingestion}
            previewMetadata={stepMetadata.preview}
            onPersistRegions={persistRegions}
            onPersistReduce={persistReduce}
            onPersistIngestion={persistIngestion}
            onPersistPreview={persistPreview}
            onPersistExport={persistExport}
            isSaving={updateSession.isPending}
          />
        );
      case "preview_spectra":
        return (
          <PreviewSpectraTab
            entries={stepMetadata.preview?.spectra ?? []}
            activeScanId={selectedEntry?.relativePath ?? null}
            ingestionByScanId={stepMetadata.preview?.ingestionCache ?? {}}
            compareScanIds={stepMetadata.preview?.compareScanIds ?? []}
            onCompareScanIdsChange={(scanIds) => {
              const preview = stepMetadata.preview;
              if (!preview) {
                return;
              }
              void persistPreview({
                ...preview,
                compareScanIds: scanIds,
              });
            }}
            onSelectScan={(scanId) => {
              const entry = catalog.find((row) => row.relativePath === scanId);
              if (entry) {
                void handleSelectScan(entry);
              } else {
                setActiveTab("ingestion");
                void persistWorkspace({ activeTab: "ingestion" });
              }
            }}
            onRemoveEntry={(scanId) => {
              const preview = stepMetadata.preview;
              if (!preview) {
                return;
              }
              const nextCache = { ...(preview.ingestionCache ?? {}) };
              delete nextCache[scanId];
              void persistPreview({
                ...preview,
                spectra: preview.spectra.filter((row) => row.scanId !== scanId),
                ingestionCache: nextCache,
              });
            }}
          />
        );
      case "lcf":
        return <LcfPlaceholder />;
      default:
        return null;
    }
  }, [
    activeTab,
    beamtimes,
    catalog,
    beamtimeLoadError,
    catalogLoadError,
    catalogListingIncomplete,
    catalogScanPhase,
    catalogFromCache,
    grantStoredFolderAccess,
    handlePickFolder,
    handleSelectBeamtime,
    handleSelectScan,
    isLoadingBeamtimes,
    isEnrichingCatalog,
    isLoadingCatalog,
    isPicking,
    persistReduce,
    persistIngestion,
    persistPreview,
    persistRegions,
    persistWorkspace,
    pendingFolderAccess,
    refreshBeamtimes,
    rootHandle,
    selectedBeamtime,
    selectedEntry,
    selectedFiles,
    stepMetadata.ingestion,
    stepMetadata.preview,
    stepMetadata.reduce,
    stepMetadata.regions,
    stepMetadata.export,
    sessionId,
    persistExport,
    refreshSession,
    updateSession.isPending,
    isSelectingScan,
    selectingScanRelativePath,
  ]);

  const workspaceHeader = (
    <header className="flex flex-col gap-3">
      <Link
        href="/dashboard"
        className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Dashboard
      </Link>
      <div className="flex items-start gap-3">
        <span
          className="text-accent bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
          aria-hidden
        >
          <FlaskConical className="h-5 w-5" />
        </span>
        <div>
          <p className="text-muted text-sm">{ALS_5322_INSTRUMENT_LABEL}</p>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {ALS_5322_INSTRUMENT_LABEL}
          </h1>
        </div>
      </div>
    </header>
  );

  if (!folderRestoreAttempted) {
    return (
      <div className="flex flex-col gap-6">
        {workspaceHeader}
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="flex flex-col gap-6">
        {workspaceHeader}
        <StxmWorkspaceOnboarding
          folderSelected={folderAccessReady}
          folderDisplayName={
            folderRootName ?? pendingFolderAccess?.displayName ?? null
          }
          computeConsentGranted={computeConsentGranted}
          isPicking={isPicking}
          isRestoringFolder={isRestoringFolder}
          onPickFolder={() => void handlePickFolder()}
          onGrantCompute={handleGrantCompute}
          recentFolders={recentFolders}
          onOpenRecentFolder={(key) => void handleOpenRecent(key)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {workspaceHeader}

      <RecentFolderPills
        folders={recentFolders}
        onOpen={(key) => void handleOpenRecent(key)}
      />

      {pendingFolderAccess ? (
        <div className="border-border bg-default/30 flex flex-col items-start gap-3 rounded-lg border px-4 py-4">
          <p className="text-foreground text-sm">
            Read access to{" "}
            <span className="font-medium">{pendingFolderAccess.displayName}</span>{" "}
            requires your confirmation after reload.
          </p>
          <Button size="sm" onPress={() => void grantStoredFolderAccess()}>
            Re-grant folder access
          </Button>
        </div>
      ) : null}

      {rootHandle ? (
        <WorkspaceChrome
          breadcrumb={breadcrumb}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            void persistWorkspace({ activeTab: tab });
          }}
          onChangeLocation={() => void handlePickFolder()}
          onReload={() => void handleReload()}
          isReloading={isReloading}
          ingestionEnabled={Boolean(selectedFiles)}
        />
      ) : null}

      <section className="border-border bg-surface rounded-lg border px-5 py-5">
        {tabPanel}
      </section>
    </div>
  );
}
