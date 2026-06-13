"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DashboardIngestionResult,
  DashboardPreviewRegionSpectrum,
  DashboardPreviewSpectrumEntry,
  DashboardPreviewStepMetadata,
} from "~/lib/dashboard-processing-session";
import { useDashboardPlotSpectra } from "~/features/dashboard/plot-viewer/use-dashboard-plot-spectra";
import { catalogMetaFromBrowseGroup } from "~/features/dashboard/plot-viewer/plot-viewer-catalog-meta";
import { geometryKeysForPoints } from "~/features/dashboard/plot-viewer/geometry-selection";
import { trpc } from "~/trpc/client";
import { StxmPreviewCompareView } from "./stxm-preview-compare-view";
import { StxmPreviewSelectionPanel } from "./stxm-preview-selection-panel";
import {
  defaultStxmPreviewTraceKeys,
  listAtlasPreviewTraceCandidates,
  listStxmPreviewTraceCandidates,
} from "./stxm-preview-styled-traces";
import { isAtlasPreviewCompareTraceKey } from "./preview-compare-trace-key";
import { buildPlotViewerTraceKey } from "~/features/dashboard/plot-viewer/plot-viewer-trace-key";

type PreviewSpectraTabProps = {
  previewMetadata: DashboardPreviewStepMetadata;
  activeScanId: string | null;
  onPersistPreview: (preview: DashboardPreviewStepMetadata) => Promise<void>;
  onSelectScan: (scanId: string) => void;
};

/**
 * Preview spectra workspace tab: auto-cached local scans, Atlas catalog overlays, and compare plot.
 */
export function PreviewSpectraTab({
  previewMetadata,
  activeScanId,
  onPersistPreview,
  onSelectScan,
}: PreviewSpectraTabProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  const entries = previewMetadata.spectra;
  const atlasEntries = previewMetadata.atlasExperiments ?? [];
  const atlasGeometryByExperimentId =
    previewMetadata.atlasGeometryByExperimentId ?? {};
  const ingestionByScanId = previewMetadata.ingestionCache ?? {};
  const regionSpectraByScanId = previewMetadata.regionSpectraCache ?? {};
  const compareTraceKeys = previewMetadata.compareTraceKeys ?? [];

  const atlasExperimentIds = useMemo(
    () => atlasEntries.map((entry) => entry.experimentId),
    [atlasEntries],
  );

  const browseListQuery = trpc.experiments.browseList.useQuery(
    {
      experimentIds: atlasExperimentIds,
      limit: Math.max(atlasExperimentIds.length, 1),
      offset: 0,
      sortBy: "favorites",
    },
    { enabled: atlasExperimentIds.length > 0, staleTime: 30_000 },
  );

  const groupByExperimentId = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof browseListQuery.data>["groups"][number]
    >();
    for (const group of browseListQuery.data?.groups ?? []) {
      map.set(group.experimentId, group);
    }
    return map;
  }, [browseListQuery.data?.groups]);

  const catalogSelections = useMemo(
    () =>
      atlasEntries.map((entry) => {
        const group = groupByExperimentId.get(entry.experimentId);
        return {
          experimentId: entry.experimentId,
          label: entry.label,
          chemicalFormula: group?.molecule.chemicalformula ?? null,
        };
      }),
    [atlasEntries, groupByExperimentId],
  );

  const { datasets, spectraByExperimentId, isLoading: atlasSpectraLoading } =
    useDashboardPlotSpectra(catalogSelections, {
      enabled: atlasExperimentIds.length > 0,
      geometryKeysByExperimentId: atlasGeometryByExperimentId,
    });

  const geometrySyncRef = useRef<string>("");
  useEffect(() => {
    if (atlasExperimentIds.length === 0) {
      return;
    }
    let changed = false;
    const nextGeometry: Record<string, string[]> = {
      ...Object.fromEntries(
        Object.entries(atlasGeometryByExperimentId).map(([key, value]) => [
          key,
          [...(value ?? [])],
        ]),
      ),
    };
    const addedTraceKeys: string[] = [];
    for (const experimentId of atlasExperimentIds) {
      const points = spectraByExperimentId.get(experimentId);
      if (!points || points.length === 0) {
        continue;
      }
      if ((nextGeometry[experimentId]?.length ?? 0) > 0) {
        continue;
      }
      const geometryKeys = geometryKeysForPoints(points);
      if (geometryKeys.length === 0) {
        continue;
      }
      nextGeometry[experimentId] = geometryKeys;
      changed = true;
      for (const geometryKey of geometryKeys) {
        addedTraceKeys.push(buildPlotViewerTraceKey(experimentId, geometryKey));
      }
    }
    const syncKey = JSON.stringify(nextGeometry);
    if (!changed || geometrySyncRef.current === syncKey) {
      return;
    }
    geometrySyncRef.current = syncKey;
    void onPersistPreview({
      ...previewMetadata,
      atlasGeometryByExperimentId: nextGeometry,
      compareTraceKeys: [...new Set([...compareTraceKeys, ...addedTraceKeys])],
    });
  }, [
    atlasExperimentIds,
    atlasGeometryByExperimentId,
    compareTraceKeys,
    onPersistPreview,
    previewMetadata,
    spectraByExperimentId,
  ]);

  const stxmCandidates = useMemo(
    () =>
      listStxmPreviewTraceCandidates({
        entries,
        ingestionByScanId,
        regionSpectraByScanId,
      }),
    [entries, ingestionByScanId, regionSpectraByScanId],
  );

  const atlasCandidates = useMemo(
    () =>
      listAtlasPreviewTraceCandidates({
        atlasEntries,
        datasets,
        geometryByExperimentId: atlasGeometryByExperimentId,
      }),
    [atlasEntries, atlasGeometryByExperimentId, datasets],
  );

  const candidates = useMemo(
    () => [...stxmCandidates, ...atlasCandidates],
    [atlasCandidates, stxmCandidates],
  );

  const candidateKeySet = useMemo(
    () => new Set(candidates.map((candidate) => candidate.traceKey)),
    [candidates],
  );

  const onPersistPreviewRef = useRef(onPersistPreview);
  onPersistPreviewRef.current = onPersistPreview;
  const previewMetadataRef = useRef(previewMetadata);
  previewMetadataRef.current = previewMetadata;

  useEffect(() => {
    const normalized = compareTraceKeys.filter((key) =>
      candidateKeySet.has(key),
    );
    if (normalized.length > 0) {
      if (normalized.length !== compareTraceKeys.length) {
        void onPersistPreviewRef.current({
          ...previewMetadataRef.current,
          compareTraceKeys: normalized,
        });
      }
      return;
    }
    if (candidates.length > 0) {
      void onPersistPreviewRef.current({
        ...previewMetadataRef.current,
        compareTraceKeys: [
          ...defaultStxmPreviewTraceKeys(stxmCandidates),
          ...atlasCandidates.map((candidate) => candidate.traceKey),
        ],
      });
    }
  }, [atlasCandidates, candidateKeySet, candidates, compareTraceKeys, stxmCandidates]);

  const catalogMetaByExperimentId = useMemo(() => {
    const map = new Map<
      string,
      {
        experimentId: string;
        moleculeName: string;
        edgeLabel: string;
        instrumentName: string;
        facilityName: string;
      }
    >();
    for (const entry of entries) {
      map.set(entry.scanId, {
        experimentId: entry.scanId,
        moleculeName: entry.moleculeName ?? entry.scanLabel,
        edgeLabel: entry.edgeLabel ?? "Edge unknown",
        instrumentName: entry.scanLabel,
        facilityName: "Local cache",
      });
    }
    for (const group of browseListQuery.data?.groups ?? []) {
      map.set(group.experimentId, catalogMetaFromBrowseGroup(group));
    }
    for (const entry of atlasEntries) {
      if (!map.has(entry.experimentId)) {
        map.set(entry.experimentId, {
          experimentId: entry.experimentId,
          moleculeName: entry.moleculeName ?? entry.label,
          edgeLabel: entry.edgeLabel ?? "",
          instrumentName: entry.instrumentName ?? "",
          facilityName: entry.facilityName ?? "Atlas",
        });
      }
    }
    return map;
  }, [atlasEntries, browseListQuery.data?.groups, entries]);

  if (entries.length === 0 && atlasEntries.length === 0) {
    return (
      <div className="border-border bg-default/30 rounded-lg border border-dashed px-5 py-8">
        <p className="text-foreground text-sm font-medium">Preview spectra</p>
        <p className="text-muted mt-2 text-sm">
          Reduced line scans appear here automatically after you process them in
          Ingestion. Add Atlas NEXAFS datasets from the picker to overlay and
          compare local STXM traces with published catalog spectra.
        </p>
      </div>
    );
  }

  const handleCompareTraceKeysChange = (traceKeys: string[]) => {
    void onPersistPreview({
      ...previewMetadata,
      compareTraceKeys: traceKeys,
      compareScanIds: [
        ...new Set(
          traceKeys
            .map((key) => key.split("::")[0]?.split(":")[0])
            .filter((scanId): scanId is string => Boolean(scanId)),
        ),
      ],
    });
  };

  const handleRemoveEntry = (scanId: string) => {
    const nextCache = { ...ingestionByScanId };
    delete nextCache[scanId];
    const nextRegionCache = { ...regionSpectraByScanId };
    delete nextRegionCache[scanId];
    void onPersistPreview({
      ...previewMetadata,
      spectra: entries.filter((row) => row.scanId !== scanId),
      ingestionCache: nextCache,
      regionSpectraCache: nextRegionCache,
      compareTraceKeys: compareTraceKeys.filter(
        (key) => !key.startsWith(`${scanId}::`),
      ),
      compareScanIds: (previewMetadata.compareScanIds ?? []).filter(
        (id) => id !== scanId,
      ),
    });
  };

  const handleAtlasEntriesChange = (
    nextAtlas: DashboardPreviewStepMetadata["atlasExperiments"],
  ) => {
    const allowed = new Set(nextAtlas.map((entry) => entry.experimentId));
    const nextGeometry = Object.fromEntries(
      Object.entries(atlasGeometryByExperimentId).filter(([experimentId]) =>
        allowed.has(experimentId),
      ),
    );
    void onPersistPreview({
      ...previewMetadata,
      atlasExperiments: nextAtlas,
      atlasGeometryByExperimentId: nextGeometry,
    });
  };

  const handleRemoveAtlasEntry = (experimentId: string) => {
    const nextAtlas = atlasEntries.filter(
      (entry) => entry.experimentId !== experimentId,
    );
    const nextGeometry: Record<string, string[]> = Object.fromEntries(
      Object.entries(atlasGeometryByExperimentId)
        .filter(([key]) => key !== experimentId)
        .map(([key, value]) => [key, [...(value ?? [])]]),
    );
    const nextTraceKeys = compareTraceKeys.filter((key) => {
      if (!isAtlasPreviewCompareTraceKey(key)) {
        return true;
      }
      return !key.startsWith(`${experimentId}:`);
    });
    void onPersistPreview({
      ...previewMetadata,
      atlasExperiments: nextAtlas,
      atlasGeometryByExperimentId: nextGeometry,
      compareTraceKeys: nextTraceKeys,
    });
  };

  const handleGeometryChange = (geometryByExperimentId: Record<string, string[]>) => {
    void onPersistPreview({
      ...previewMetadata,
      atlasGeometryByExperimentId: geometryByExperimentId,
    });
  };

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] w-full min-w-0 flex-1 gap-3">
      <StxmPreviewSelectionPanel
        entries={entries}
        atlasEntries={atlasEntries}
        ingestionByScanId={ingestionByScanId}
        regionSpectraByScanId={regionSpectraByScanId}
        atlasDatasets={datasets}
        atlasGeometryByExperimentId={atlasGeometryByExperimentId}
        spectraByExperimentId={spectraByExperimentId}
        selectedTraceKeys={compareTraceKeys}
        onSelectedTraceKeysChange={handleCompareTraceKeysChange}
        onAtlasEntriesChange={handleAtlasEntriesChange}
        onGeometryByExperimentIdChange={handleGeometryChange}
        activeScanId={activeScanId}
        onSelectScan={onSelectScan}
        onRemoveEntry={handleRemoveEntry}
        onRemoveAtlasEntry={handleRemoveAtlasEntry}
        panelOpen={panelOpen}
        atlasSpectraLoading={atlasSpectraLoading}
      />
      <StxmPreviewCompareView
        entries={entries}
        atlasEntries={atlasEntries}
        atlasDatasets={datasets}
        atlasGeometryByExperimentId={atlasGeometryByExperimentId}
        catalogMetaByExperimentId={catalogMetaByExperimentId}
        ingestionByScanId={ingestionByScanId}
        regionSpectraByScanId={regionSpectraByScanId}
        selectedTraceKeys={compareTraceKeys}
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
      />
    </div>
  );
}
