"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Spinner } from "@heroui/react";
import { Search, X } from "lucide-react";
import type { DashboardPreviewAtlasEntry } from "~/lib/dashboard-processing-session";
import {
  PlotViewerCheckbox,
  PlotViewerCheckboxLabel,
} from "~/features/dashboard/plot-viewer/plot-viewer-checkbox";
import {
  catalogMetaFromBrowseGroup,
  plotViewerExperimentGroupLabel,
} from "~/features/dashboard/plot-viewer/plot-viewer-catalog-meta";
import { geometryKeysForPoints } from "~/features/dashboard/plot-viewer/geometry-selection";
import { trpc } from "~/trpc/client";
import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  defaultAtlasPreviewTraceKeys,
  listAtlasPreviewTraceCandidates,
} from "./stxm-preview-styled-traces";
import { isAtlasPreviewCompareTraceKey } from "./preview-compare-trace-key";

/**
 * Builds a persisted Atlas preview entry from one NEXAFS browse catalog group row.
 */
export function atlasEntryFromBrowseGroup(
  group: NexafsBrowseGroup,
): DashboardPreviewAtlasEntry {
  const meta = catalogMetaFromBrowseGroup(group);
  return {
    experimentId: group.experimentId,
    label: plotViewerExperimentGroupLabel(group),
    addedAt: new Date().toISOString(),
    moleculeName: meta.moleculeName,
    edgeLabel: meta.edgeLabel,
    instrumentName: meta.instrumentName,
    facilityName: meta.facilityName,
  };
}

export type AtlasCatalogSearchProps = {
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  onAddExperiment: (group: NexafsBrowseGroup) => void;
  /** When true, omits helper copy and uses tighter vertical spacing for nested pickers. */
  compact?: boolean;
  maxCatalogHeightClassName?: string;
};

/**
 * Debounced Atlas NEXAFS catalog search with add buttons for experiments not yet in session.
 */
export function AtlasCatalogSearch({
  atlasEntries,
  onAddExperiment,
  compact = false,
  maxCatalogHeightClassName = "max-h-40",
}: AtlasCatalogSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const hasSearch = debouncedQuery.length > 0;
  const browseSearchQuery = trpc.experiments.browseSearch.useQuery(
    {
      query: debouncedQuery,
      limit: 20,
      offset: 0,
      sortBy: "favorites",
    },
    { enabled: hasSearch, staleTime: 30_000 },
  );
  const browseListQuery = trpc.experiments.browseList.useQuery(
    {
      limit: 20,
      offset: 0,
      sortBy: "favorites",
    },
    { enabled: !hasSearch, staleTime: 30_000 },
  );

  const catalogGroups = hasSearch
    ? (browseSearchQuery.data?.groups ?? [])
    : (browseListQuery.data?.groups ?? []);
  const catalogLoading =
    browseSearchQuery.isLoading || browseListQuery.isLoading;

  const atlasExperimentIds = useMemo(
    () => new Set(atlasEntries.map((entry) => entry.experimentId)),
    [atlasEntries],
  );

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-2"}>
      {!compact ? (
        <p className="text-muted text-xs">
          Search published NEXAFS experiments to add standards from Atlas.
        </p>
      ) : null}
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search molecules, edges, instruments..."
        aria-label="Search Atlas NEXAFS catalog"
        className="w-full"
      />
      <div className={`${maxCatalogHeightClassName} space-y-1 overflow-y-auto`}>
        {catalogLoading ? (
          <div className="text-muted flex items-center gap-2 py-2 text-xs">
            <Spinner size="sm" />
            Loading catalog...
          </div>
        ) : catalogGroups.length === 0 ? (
          <p className="text-muted py-2 text-xs">No catalog matches.</p>
        ) : (
          catalogGroups.map((group) => {
            const added = atlasExperimentIds.has(group.experimentId);
            return (
              <div
                key={group.experimentId}
                className="border-border flex items-start justify-between gap-2 rounded-md border px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-foreground truncate text-xs font-medium">
                    {plotViewerExperimentGroupLabel(group)}
                  </p>
                  <p className="text-muted text-[11px]">
                    {group.polarizationCount} polarization
                    {group.polarizationCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={added ? "secondary" : "primary"}
                  isDisabled={added}
                  onPress={() => onAddExperiment(group)}
                >
                  {added ? "Added" : "Add"}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export type AtlasExperimentPickerProps = {
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  selectedTraceKeys: readonly string[];
  spectraByExperimentId: ReadonlyMap<string, SpectrumPoint[]>;
  onAtlasEntriesChange: (entries: DashboardPreviewAtlasEntry[]) => void;
  onSelectedTraceKeysChange: (traceKeys: string[]) => void;
  onGeometryByExperimentIdChange: (
    geometryByExperimentId: Record<string, string[]>,
  ) => void;
  geometryByExperimentId: Readonly<Record<string, readonly string[] | undefined>>;
  /**
   * When set, Atlas experiment removal persists in one atomic update instead of three
   * separate callbacks that can race and restore removed rows.
   */
  onRemoveAtlasEntry?: (experimentId: string) => void;
  /** When true, hides the outer section title and border used on Preview compare sidebar. */
  embedded?: boolean;
};

/**
 * Atlas catalog search plus added-experiment trace toggles for preview compare workflows.
 */
export function AtlasExperimentPicker({
  atlasEntries,
  selectedTraceKeys,
  spectraByExperimentId,
  onAtlasEntriesChange,
  onSelectedTraceKeysChange,
  onGeometryByExperimentIdChange,
  geometryByExperimentId,
  onRemoveAtlasEntry,
  embedded = false,
}: AtlasExperimentPickerProps) {
  const atlasDatasets = useMemo(
    () =>
      atlasEntries.map((entry) => ({
        experimentId: entry.experimentId,
        label: entry.label,
        chemicalFormula: null,
        spectrumPoints: spectraByExperimentId.get(entry.experimentId) ?? [],
      })),
    [atlasEntries, spectraByExperimentId],
  );

  const atlasCandidates = useMemo(
    () =>
      listAtlasPreviewTraceCandidates({
        atlasEntries,
        datasets: atlasDatasets,
        geometryByExperimentId,
      }),
    [atlasDatasets, atlasEntries, geometryByExperimentId],
  );

  const selectedSet = useMemo(
    () => new Set(selectedTraceKeys),
    [selectedTraceKeys],
  );

  const addExperiment = (group: NexafsBrowseGroup) => {
    if (atlasEntries.some((entry) => entry.experimentId === group.experimentId)) {
      return;
    }
    const entry = atlasEntryFromBrowseGroup(group);
    const nextEntries = [...atlasEntries, entry];
    onAtlasEntriesChange(nextEntries);

    const points = spectraByExperimentId.get(group.experimentId) ?? [];
    const geometryKeys = geometryKeysForPoints(points);
    if (geometryKeys.length > 0) {
      onGeometryByExperimentIdChange({
        ...Object.fromEntries(
          Object.entries(geometryByExperimentId).map(([key, value]) => [
            key,
            [...(value ?? [])],
          ]),
        ),
        [group.experimentId]: geometryKeys,
      });
      const candidates = listAtlasPreviewTraceCandidates({
        atlasEntries: nextEntries,
        datasets: [
          {
            experimentId: group.experimentId,
            label: entry.label,
            chemicalFormula: null,
            spectrumPoints: points,
          },
        ],
        geometryByExperimentId: {
          ...geometryByExperimentId,
          [group.experimentId]: geometryKeys,
        },
      });
      const newKeys = defaultAtlasPreviewTraceKeys(
        candidates,
        group.experimentId,
      );
      onSelectedTraceKeysChange([
        ...new Set([...selectedTraceKeys, ...newKeys]),
      ]);
    }
  };

  const removeExperiment = (experimentId: string) => {
    if (onRemoveAtlasEntry) {
      onRemoveAtlasEntry(experimentId);
      return;
    }
    onAtlasEntriesChange(
      atlasEntries.filter((entry) => entry.experimentId !== experimentId),
    );
    const nextGeometry: Record<string, string[]> = Object.fromEntries(
      Object.entries(geometryByExperimentId).map(([key, value]) => [
        key,
        [...(value ?? [])],
      ]),
    );
    delete nextGeometry[experimentId];
    onGeometryByExperimentIdChange(nextGeometry);
    onSelectedTraceKeysChange(
      selectedTraceKeys.filter((key) => {
        if (!isAtlasPreviewCompareTraceKey(key)) {
          return true;
        }
        return !key.startsWith(`${experimentId}:`);
      }),
    );
  };

  const toggleTrace = (traceKey: string) => {
    if (selectedSet.has(traceKey)) {
      onSelectedTraceKeysChange(
        selectedTraceKeys.filter((key) => key !== traceKey),
      );
      return;
    }
    onSelectedTraceKeysChange([...selectedTraceKeys, traceKey]);
  };

  const candidatesByExperiment = useMemo(() => {
    const map = new Map<string, typeof atlasCandidates>();
    for (const candidate of atlasCandidates) {
      const list = map.get(candidate.experimentId) ?? [];
      list.push(candidate);
      map.set(candidate.experimentId, list);
    }
    return map;
  }, [atlasCandidates]);

  const rootClassName = embedded
    ? "flex flex-col gap-2"
    : "border-border flex flex-col gap-2 border-t pt-2";

  return (
    <div className={rootClassName}>
      {!embedded ? (
        <div>
          <p className="text-foreground text-sm font-medium">Atlas datasets</p>
          <p className="text-muted text-xs">
            Add published NEXAFS experiments to overlay with cached line scans.
          </p>
        </div>
      ) : null}
      <AtlasCatalogSearch
        atlasEntries={atlasEntries}
        onAddExperiment={addExperiment}
        compact={embedded}
      />
      {atlasEntries.length > 0 ? (
        <ul className="space-y-2">
          {atlasEntries.map((entry) => {
            const experimentCandidates =
              candidatesByExperiment.get(entry.experimentId) ?? [];
            const loadingSpectra =
              !spectraByExperimentId.has(entry.experimentId) &&
              experimentCandidates.length === 0;
            return (
              <li
                key={entry.experimentId}
                className="border-border rounded-md border px-2 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground text-xs font-medium">
                      {entry.label}
                    </p>
                    <p className="text-muted text-[11px]">
                      {entry.edgeLabel ?? "Edge unknown"}
                      {entry.instrumentName
                        ? ` · ${entry.instrumentName}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="pointer-events-auto relative z-10 shrink-0"
                    aria-label={`Remove ${entry.label}`}
                    onPress={() => removeExperiment(entry.experimentId)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                {loadingSpectra ? (
                  <p className="text-muted mt-2 text-[11px]">Loading spectra...</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {experimentCandidates.map((candidate) => (
                      <li key={candidate.traceKey}>
                        <PlotViewerCheckbox
                          isSelected={selectedSet.has(candidate.traceKey)}
                          onChange={() => toggleTrace(candidate.traceKey)}
                        >
                          <PlotViewerCheckboxLabel className="text-xs">
                            {candidate.geometryKey === "fixed"
                              ? "Fixed geometry"
                              : candidate.geometryKey}
                          </PlotViewerCheckboxLabel>
                        </PlotViewerCheckbox>
                      </li>
                    ))}
                    {experimentCandidates.length === 0 ? (
                      <li className="text-muted text-[11px]">
                        No plottable geometries yet.
                      </li>
                    ) : null}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted flex items-center gap-1 text-xs">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Search and add Atlas experiments to compare.
        </p>
      )}
    </div>
  );
}
