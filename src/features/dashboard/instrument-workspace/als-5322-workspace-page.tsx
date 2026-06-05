"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import { ArrowLeft, FlaskConical } from "lucide-react";
import {
  ALS_5322_INSTRUMENT_LABEL,
  ALS_5322_INSTRUMENT_SLUG,
  defaultDashboardStepMetadata,
  type DashboardReduceStepMetadata,
  type DashboardRegionsStepMetadata,
  type DashboardStepMetadata,
  type DashboardWorkspaceContext,
  type DashboardWorkspaceTab,
} from "~/lib/dashboard-processing-session";
import {
  isExperimentFolderName,
  sortExperimentFolderNames,
  summarizeBeamtimeFolders,
  type StxmCatalogEntry,
} from "~/lib/stxm";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import {
  buildBeamtimeCatalog,
  countScansInBeamtimes,
  loadScanFilesFromCatalogEntry,
} from "~/features/dashboard/lib/buildBeamtimeCatalog";
import {
  listChildDirectoryNames,
  pickStxmRootDirectory,
} from "~/features/dashboard/lib/localDirectoryBrowser";
import {
  ensureDirectoryReadPermission,
  loadDirectoryHandle,
  loadRecentFolders,
  storeDirectoryHandle,
  touchRecentFolder,
  type RecentStxmFolder,
} from "~/features/dashboard/lib/localFolderStorage";
import type { StxmDirectoryHandle } from "~/features/dashboard/lib/fileSystemAccessTypes";
import { BeamtimeScroller } from "./beamtime-scroller";
import { ExperimentFileBrowser } from "./experiment-file-browser";
import {
  FolderPickerPrompt,
  RecentFolderPills,
} from "./folder-picker-prompt";
import {
  IngestionTab,
  LcfPlaceholder,
  PreviewSpectraPlaceholder,
} from "./ingestion-tab";
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
  const [catalog, setCatalog] = useState<StxmCatalogEntry[]>([]);
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
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const stepMetadata =
    sessionQuery.data?.stepMetadata ?? defaultDashboardStepMetadata();

  useEffect(() => {
    setRecentFolders(loadRecentFolders());
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

  const refreshBeamtimes = useCallback(
    async (handle: StxmDirectoryHandle) => {
      setIsLoadingBeamtimes(true);
      try {
        const childNames = await listChildDirectoryNames(handle);
        const beamtimeNames = sortExperimentFolderNames(
          childNames.filter(isExperimentFolderName),
        );
        const counts = await countScansInBeamtimes(handle, beamtimeNames);
        setBeamtimes(summarizeBeamtimeFolders(beamtimeNames, counts));
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Failed to list beamtimes",
          "error",
        );
      } finally {
        setIsLoadingBeamtimes(false);
      }
    },
    [],
  );

  const loadCatalog = useCallback(
    async (handle: StxmDirectoryHandle, beamtimeName: string) => {
      setIsLoadingCatalog(true);
      try {
        const entries = await buildBeamtimeCatalog(handle, beamtimeName, true);
        setCatalog(entries);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Failed to load scans",
          "error",
        );
        setCatalog([]);
      } finally {
        setIsLoadingCatalog(false);
      }
    },
    [],
  );

  const bindRootHandle = useCallback(
    async (handle: StxmDirectoryHandle, key: string) => {
      const allowed = await ensureDirectoryReadPermission(handle);
      if (!allowed) {
        showToast("Read permission denied for this folder.", "error");
        return;
      }
      setRootHandle(handle);
      setFolderHandleKey(key);
      setFolderRootName(handle.name);
      setSelectedBeamtime(null);
      setCatalog([]);
      setSelectedEntry(null);
      setSelectedFiles(null);
      setActiveTab("experiment");
      setRecentFolders(touchRecentFolder(key, handle.name));
      await storeDirectoryHandle(key, handle);
      await ensureSession(handle.name);
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
    [ensureSession, persistWorkspace, refreshBeamtimes],
  );

  const handlePickFolder = useCallback(async () => {
    setIsPicking(true);
    try {
      const handle = await pickStxmRootDirectory();
      const key = crypto.randomUUID();
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
    async (name: string) => {
      if (!rootHandle) {
        return;
      }
      setSelectedBeamtime(name);
      setSelectedEntry(null);
      setSelectedFiles(null);
      await loadCatalog(rootHandle, name);
      void persistWorkspace({ beamtimeName: name, activeTab: "experiment" });
    },
    [loadCatalog, persistWorkspace, rootHandle],
  );

  const handleSelectScan = useCallback(
    async (entry: StxmCatalogEntry) => {
      if (!rootHandle || !selectedBeamtime) {
        return;
      }
      setSelectedEntry(entry);
      if (entry.isNexafsLineScan) {
        const files = await loadScanFilesFromCatalogEntry(
          rootHandle,
          selectedBeamtime,
          entry,
        );
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
    },
    [persistWorkspace, rootHandle, selectedBeamtime],
  );

  const handleReload = useCallback(async () => {
    if (!rootHandle) {
      return;
    }
    setIsReloading(true);
    try {
      await refreshBeamtimes(rootHandle);
      if (selectedBeamtime) {
        await loadCatalog(rootHandle, selectedBeamtime);
      }
      showToast("Reloaded folder contents", "success");
    } finally {
      setIsReloading(false);
    }
  }, [loadCatalog, refreshBeamtimes, rootHandle, selectedBeamtime]);

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
        if (!rootHandle) {
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
              />
            </section>
            {selectedBeamtime ? (
              <section>
                <h2 className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
                  Experiment files
                </h2>
                <ExperimentFileBrowser
                  entries={catalog}
                  selectedRelativePath={selectedEntry?.relativePath ?? null}
                  loading={isLoadingCatalog}
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
            hdrFile={selectedFiles.hdrFile}
            ximFile={selectedFiles.ximFile}
            scanLabel={selectedEntry?.relativePath ?? selectedFiles.hdrFile.name}
            regionsMetadata={stepMetadata.regions}
            reduceMetadata={stepMetadata.reduce}
            onPersistRegions={persistRegions}
            onPersistReduce={persistReduce}
            isSaving={updateSession.isPending}
          />
        );
      case "preview_spectra":
        return <PreviewSpectraPlaceholder />;
      case "lcf":
        return <LcfPlaceholder />;
      default:
        return null;
    }
  }, [
    activeTab,
    beamtimes,
    catalog,
    handlePickFolder,
    handleSelectBeamtime,
    handleSelectScan,
    isLoadingBeamtimes,
    isLoadingCatalog,
    isPicking,
    persistReduce,
    persistRegions,
    rootHandle,
    selectedBeamtime,
    selectedEntry,
    selectedFiles,
    stepMetadata.reduce,
    stepMetadata.regions,
    updateSession.isPending,
  ]);

  return (
    <div className="flex flex-col gap-6">
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

      <RecentFolderPills
        folders={recentFolders}
        onOpen={(key) => void handleOpenRecent(key)}
      />

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
        {sessionQuery.isLoading && sessionId ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          tabPanel
        )}
      </section>
    </div>
  );
}
