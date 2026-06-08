"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Button,
  ScrollShadow,
  SearchField,
  Separator,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { Heart, XIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";
import {
  geometryKeysForPoints,
  mergeGeometryKeysOnDatasetAdd,
  pruneGeometryKeysOnDatasetRemove,
  unionGeometryKeysForDatasets,
} from "./geometry-selection";
import {
  PlotViewerCheckbox,
  PlotViewerCheckboxLabel,
} from "./plot-viewer-checkbox";
import { PlotViewerFacetChip } from "./plot-viewer-facet-chip";
import { hasActivePlotViewerCatalogFilter } from "./plot-viewer-catalog-filter";
import {
  normalizePlotViewerFacilityKey,
  plotViewerGroupMatchesFacilityFacet,
} from "./plot-viewer-facility-key";
import {
  patchPlotViewerBrowseFavoriteCaches,
  patchPlotViewerFavoriteIdsCache,
} from "./plot-viewer-browse-favorite-cache";
import { orderBrowseGroupsByExperimentIds } from "./plot-viewer-favorite-ids";
import type { PlotViewerUrlState } from "./plot-viewer-url-state";
import type { SpectrumPoint } from "~/components/plots/types";

export type PlotViewerSelectionPanelProps = {
  state: PlotViewerUrlState;
  query: string;
  debouncedQuery: string;
  urlSynced: boolean;
  spectraByExperimentId: Map<string, SpectrumPoint[]>;
  onQueryChange: (query: string) => void;
  onQueryFocus: () => void;
  onQueryBlur: () => void;
  onToggleDataset: (experimentId: string, nextGeometryKeys?: string[]) => void;
  onToggleFacet: (
    field: keyof PlotViewerUrlState["facets"],
    id: string,
  ) => void;
  onClearFacets: () => void;
};

function groupLabel(group: NexafsBrowseGroup): string {
  const edge = `${group.edge.targetatom} ${group.edge.corestate}`;
  return `${group.molecule.displayName} (${edge})`;
}

type PlotViewerCatalogDatasetRowProps = {
  group: NexafsBrowseGroup;
  isSelected: boolean;
  showFavoriteToggle: boolean;
  isFavorited: boolean;
  favoritePending: boolean;
  onToggleSelect: () => void;
  onToggleFavorite?: () => void;
  onGuestFavoritePress?: () => void;
};

function PlotViewerCatalogDatasetRow({
  group,
  isSelected,
  showFavoriteToggle,
  isFavorited,
  favoritePending,
  onToggleSelect,
  onToggleFavorite,
  onGuestFavoritePress,
}: PlotViewerCatalogDatasetRowProps) {
  const experimentId = group.experimentId;
  const favoriteButton = showFavoriteToggle ? (
    <Button
      size="sm"
      variant="ghost"
      isIconOnly
      isDisabled={favoritePending}
      aria-label={
        isFavorited
          ? "Remove dataset from Atlas favorites"
          : "Add dataset to Atlas favorites"
      }
      onPress={onToggleFavorite}
    >
      <Heart
        className={`h-3.5 w-3.5 ${isFavorited ? "fill-accent text-accent" : "text-muted"}`}
        aria-hidden
      />
    </Button>
  ) : onGuestFavoritePress ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger>
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Sign in to favorite datasets"
          onPress={onGuestFavoritePress}
        >
          <Heart className="text-muted h-3.5 w-3.5" aria-hidden />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content placement="left">
        Sign in to favorite datasets
      </Tooltip.Content>
    </Tooltip>
  ) : null;

  return (
    <li
      key={experimentId}
      className="border-border hover:bg-default/30 flex items-start gap-2 rounded-md border px-2 py-2"
    >
      <PlotViewerCheckbox
        isSelected={isSelected}
        onChange={onToggleSelect}
        className="mt-0.5"
      >
        <PlotViewerCheckboxLabel>
          {groupLabel(group)}
          <span className="text-muted block text-xs font-normal">
            {group.instrument.name}
            {group.instrument.facilityName
              ? ` · ${group.instrument.facilityName}`
              : ""}
            {" · "}
            {group.polarizationCount} geometr
            {group.polarizationCount === 1 ? "y" : "ies"}
          </span>
        </PlotViewerCheckboxLabel>
      </PlotViewerCheckbox>
      {favoriteButton}
    </li>
  );
}

/**
 * Left-hand catalog picker: search, facets, dataset checkboxes, and selected-dataset summary.
 */
export function PlotViewerSelectionPanel({
  state,
  query,
  debouncedQuery,
  urlSynced,
  spectraByExperimentId,
  onQueryChange,
  onQueryFocus,
  onQueryBlur,
  onToggleDataset,
  onToggleFacet,
  onClearFacets,
}: PlotViewerSelectionPanelProps) {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [optimisticFavorites, setOptimisticFavorites] = useState<
    Record<string, boolean>
  >({});

  const facetCountsQuery = trpc.experiments.facetCounts.useQuery(undefined, {
    staleTime: 120_000,
  });
  const atlasFavoriteIdsQuery =
    trpc.experiments.listFavoriteExperimentIds.useQuery(undefined, {
      enabled: urlSynced && isSignedIn,
      staleTime: 30_000,
    });

  const commonFilters = {
    moleculeIds:
      state.facets.mol.length > 0 ? state.facets.mol : undefined,
    edgeIds: state.facets.edge.length > 0 ? state.facets.edge : undefined,
    instrumentIds:
      state.facets.instrument.length > 0 ? state.facets.instrument : undefined,
  };

  const hasSearchQuery = debouncedQuery.length > 0;
  const hasActiveCatalogFilter = hasActivePlotViewerCatalogFilter(
    debouncedQuery,
    state.facets,
  );
  const browseSearchQuery = trpc.experiments.browseSearch.useQuery(
    {
      query: debouncedQuery,
      limit: 50,
      offset: 0,
      sortBy: "favorites",
      ...commonFilters,
    },
    {
      enabled: urlSynced && hasActiveCatalogFilter && hasSearchQuery,
      staleTime: 30_000,
    },
  );
  const browseListQuery = trpc.experiments.browseList.useQuery(
    {
      limit: 50,
      offset: 0,
      sortBy: "favorites",
      ...commonFilters,
    },
    {
      enabled: urlSynced && hasActiveCatalogFilter && !hasSearchQuery,
      staleTime: 30_000,
    },
  );

  const catalogGroups = useMemo(() => {
    const groups = hasSearchQuery
      ? (browseSearchQuery.data?.groups ?? [])
      : (browseListQuery.data?.groups ?? []);
    return groups.filter((group) =>
      plotViewerGroupMatchesFacilityFacet(
        group.instrument.facilityName,
        state.facets.facility,
      ),
    );
  }, [
    browseListQuery.data?.groups,
    browseSearchQuery.data?.groups,
    hasSearchQuery,
    state.facets.facility,
  ]);

  const atlasFavoriteIds = useMemo(
    () => atlasFavoriteIdsQuery.data?.experimentIds ?? [],
    [atlasFavoriteIdsQuery.data?.experimentIds],
  );

  const favoritesBrowseQuery = trpc.experiments.browseList.useQuery(
    {
      experimentIds: atlasFavoriteIds,
      limit: Math.max(atlasFavoriteIds.length, 1),
      offset: 0,
      sortBy: "favorites",
    },
    {
      enabled: urlSynced && atlasFavoriteIds.length > 0,
      staleTime: 30_000,
    },
  );

  const favoriteGroups = useMemo(
    () =>
      orderBrowseGroupsByExperimentIds(
        favoritesBrowseQuery.data?.groups ?? [],
        atlasFavoriteIds,
      ),
    [favoritesBrowseQuery.data?.groups, atlasFavoriteIds],
  );

  const unresolvedSelectedExperimentIds = useMemo(() => {
    const resolved = new Set<string>();
    for (const group of catalogGroups) {
      resolved.add(group.experimentId);
    }
    for (const group of favoriteGroups) {
      resolved.add(group.experimentId);
    }
    return state.datasets.filter((experimentId) => !resolved.has(experimentId));
  }, [catalogGroups, favoriteGroups, state.datasets]);

  const selectedMetadataBrowseQuery = trpc.experiments.browseList.useQuery(
    {
      experimentIds: unresolvedSelectedExperimentIds,
      limit: Math.max(unresolvedSelectedExperimentIds.length, 1),
      offset: 0,
      sortBy: "favorites",
    },
    {
      enabled: urlSynced && unresolvedSelectedExperimentIds.length > 0,
      staleTime: 30_000,
    },
  );

  const groupByExperimentId = useMemo(() => {
    const map = new Map<string, NexafsBrowseGroup>();
    for (const group of [
      ...catalogGroups,
      ...favoriteGroups,
      ...(selectedMetadataBrowseQuery.data?.groups ?? []),
    ]) {
      map.set(group.experimentId, group);
    }
    return map;
  }, [
    catalogGroups,
    favoriteGroups,
    selectedMetadataBrowseQuery.data?.groups,
  ]);

  const favoriteMutation = trpc.experiments.toggleFavorite.useMutation({
    onMutate: ({ experimentId }) => {
      const group = groupByExperimentId.get(experimentId);
      const currentFavorited =
        optimisticFavorites[experimentId] ??
        group?.userHasFavorited ??
        atlasFavoriteIds.includes(experimentId);
      const nextFavorited = !currentFavorited;
      setOptimisticFavorites((current) => ({
        ...current,
        [experimentId]: nextFavorited,
      }));
      patchPlotViewerFavoriteIdsCache(queryClient, experimentId, nextFavorited);
      patchPlotViewerBrowseFavoriteCaches(
        queryClient,
        experimentId,
        Math.max(0, (group?.favoriteCount ?? 0) + (nextFavorited ? 1 : -1)),
        nextFavorited,
      );
      return {
        experimentId,
        previousFavorited: currentFavorited,
        previousFavoriteCount: group?.favoriteCount ?? 0,
      };
    },
    onSuccess: (data, { experimentId }) => {
      patchPlotViewerBrowseFavoriteCaches(
        queryClient,
        experimentId,
        data.favoriteCount,
        data.favorited,
      );
      patchPlotViewerFavoriteIdsCache(
        queryClient,
        experimentId,
        data.favorited,
      );
      setOptimisticFavorites((current) => {
        const next = { ...current };
        delete next[experimentId];
        return next;
      });
      void utils.experiments.listFavoriteExperimentIds.invalidate();
      void utils.experiments.browseList.invalidate();
      void utils.experiments.browseSearch.invalidate();
    },
    onError: (_error, { experimentId }, context) => {
      if (context) {
        patchPlotViewerFavoriteIdsCache(
          queryClient,
          experimentId,
          context.previousFavorited,
        );
        patchPlotViewerBrowseFavoriteCaches(
          queryClient,
          experimentId,
          context.previousFavoriteCount,
          context.previousFavorited,
        );
      }
      setOptimisticFavorites((current) => {
        const next = { ...current };
        delete next[experimentId];
        return next;
      });
      showToast("Could not update favorite. Try again.", "error");
    },
  });

  const resolveIsFavorited = useCallback(
    (group: NexafsBrowseGroup) => {
      const optimistic = optimisticFavorites[group.experimentId];
      if (optimistic !== undefined) {
        return optimistic;
      }
      return group.userHasFavorited || atlasFavoriteIds.includes(group.experimentId);
    },
    [atlasFavoriteIds, optimisticFavorites],
  );

  const facilityOptions = useMemo(() => {
    if (!hasActiveCatalogFilter) {
      return [];
    }
    const source = hasSearchQuery
      ? (browseSearchQuery.data?.groups ?? [])
      : (browseListQuery.data?.groups ?? []);
    const counts = new Map<string, { id: string; label: string; count: number }>();
    for (const group of source) {
      const label = group.instrument.facilityName?.trim() ?? "Unknown facility";
      const id = normalizePlotViewerFacilityKey(label);
      const existing = counts.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(id, { id, label, count: 1 });
      }
    }
    return [...counts.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [
    browseListQuery.data?.groups,
    browseSearchQuery.data?.groups,
    hasActiveCatalogFilter,
    hasSearchQuery,
  ]);

  const isCatalogLoading =
    hasActiveCatalogFilter &&
    (!urlSynced ||
      (hasSearchQuery ? browseSearchQuery.isLoading : browseListQuery.isLoading));

  const isFavoritesLoading =
    !urlSynced ||
    (isSignedIn && atlasFavoriteIdsQuery.isLoading) ||
    (atlasFavoriteIds.length > 0 && favoritesBrowseQuery.isLoading);

  const selectedDatasets = new Set(state.datasets);

  const handleToggleDataset = useCallback(
    (experimentId: string) => {
      const isSelected = state.datasets.includes(experimentId);
      const datasetKeys = geometryKeysForPoints(
        spectraByExperimentId.get(experimentId) ?? [],
      );

      if (isSelected) {
        const remaining = state.datasets.filter((id) => id !== experimentId);
        const remainingUnion = unionGeometryKeysForDatasets(
          remaining,
          spectraByExperimentId,
        );
        const nextGeometry = pruneGeometryKeysOnDatasetRemove(
          state.geometryKeys,
          datasetKeys,
          remainingUnion,
        );
        onToggleDataset(experimentId, nextGeometry);
        return;
      }

      const nextGeometry = mergeGeometryKeysOnDatasetAdd(
        state.geometryKeys,
        datasetKeys,
      );
      onToggleDataset(experimentId, nextGeometry);
    },
    [
      onToggleDataset,
      spectraByExperimentId,
      state.datasets,
      state.geometryKeys,
    ],
  );

  const handleToggleFavorite = useCallback(
    (experimentId: string) => {
      if (!isSignedIn || favoriteMutation.isPending) {
        return;
      }
      favoriteMutation.mutate({ experimentId });
    },
    [favoriteMutation, isSignedIn],
  );

  const handleGuestFavoritePress = useCallback(() => {
    showToast("Sign in to favorite datasets.", "info");
  }, []);

  const selectedDatasetRows = useMemo(
    () =>
      state.datasets.map((experimentId) => {
        const group = groupByExperimentId.get(experimentId);
        return {
          experimentId,
          label: group ? groupLabel(group) : experimentId,
        };
      }),
    [groupByExperimentId, state.datasets],
  );

  return (
    <aside className="border-border bg-surface flex h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden rounded-lg border sm:w-[280px]">
      <div className="border-border bg-surface shrink-0 border-b px-3 py-3">
        <h2 className="text-foreground text-sm font-semibold">Dataset picker</h2>
        <p className="text-muted mt-1 text-xs leading-snug">
          Search Atlas catalog datasets and overlay spectra on one plot.
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <SearchField
            name="plot-viewer-search"
            value={query}
            onChange={onQueryChange}
            variant="secondary"
            className="w-full"
          >
            <SearchField.Group className="border-border bg-default/20 flex min-h-10 w-full flex-row items-center gap-2 rounded-lg border px-3">
              <SearchField.SearchIcon className="text-muted h-4 w-4 shrink-0" />
              <SearchField.Input
                placeholder="Search molecules, edges, instruments..."
                className="text-foreground placeholder:text-muted min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none outline-none"
                aria-label="Search catalog datasets"
                onFocus={onQueryFocus}
                onBlur={onQueryBlur}
              />
              {query ? (
                <SearchField.ClearButton className="text-muted h-5 w-5 shrink-0 rounded p-0.5" />
              ) : null}
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted text-xs font-medium uppercase tracking-wide">
              Facets
            </p>
            <Button size="sm" variant="ghost" onPress={onClearFacets}>
              Clear
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <PlotViewerFacetChip
              title="Molecule"
              items={facetCountsQuery.data?.molecules ?? []}
              selectedIds={state.facets.mol}
              onToggle={(id) => onToggleFacet("mol", id)}
            />
            <PlotViewerFacetChip
              title="Edge"
              items={facetCountsQuery.data?.edges ?? []}
              selectedIds={state.facets.edge}
              onToggle={(id) => onToggleFacet("edge", id)}
            />
            <PlotViewerFacetChip
              title="Instrument"
              items={facetCountsQuery.data?.instruments ?? []}
              selectedIds={state.facets.instrument}
              onToggle={(id) => onToggleFacet("instrument", id)}
            />
            <PlotViewerFacetChip
              title="Facility"
              items={facilityOptions}
              selectedIds={state.facets.facility}
              onToggle={(id) => onToggleFacet("facility", id)}
            />
          </div>
        </div>
      </div>

      <ScrollShadow className="min-h-0 flex-1 px-3 py-3" hideScrollBar={false}>
        <div className="flex flex-col gap-4 pr-1">
          {hasActiveCatalogFilter ? (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted text-xs font-medium uppercase tracking-wide">
                  Results
                </p>
                {isCatalogLoading ? <Spinner size="sm" /> : null}
              </div>
              {catalogGroups.length === 0 && !isCatalogLoading ? (
                <p className="text-muted text-xs">
                  No datasets match the current filters.
                </p>
              ) : (
                <ul className="space-y-1">
                  {catalogGroups.map((group) => {
                    const experimentId = group.experimentId;
                    return (
                      <PlotViewerCatalogDatasetRow
                        key={experimentId}
                        group={group}
                        isSelected={selectedDatasets.has(experimentId)}
                        showFavoriteToggle={isSignedIn}
                        isFavorited={resolveIsFavorited(group)}
                        favoritePending={
                          favoriteMutation.isPending &&
                          favoriteMutation.variables?.experimentId ===
                            experimentId
                        }
                        onToggleSelect={() => handleToggleDataset(experimentId)}
                        onToggleFavorite={() =>
                          handleToggleFavorite(experimentId)
                        }
                        onGuestFavoritePress={handleGuestFavoritePress}
                      />
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted text-xs font-medium uppercase tracking-wide">
                Favorites
              </p>
              {isFavoritesLoading ? <Spinner size="sm" /> : null}
            </div>
            {favoriteGroups.length === 0 && !isFavoritesLoading ? (
              <p className="text-muted text-xs">
                No favorites yet. Use the heart on a dataset here or favorite on
                browse.
              </p>
            ) : (
              <ul className="space-y-1">
                {favoriteGroups.map((group) => {
                  const experimentId = group.experimentId;
                  return (
                    <PlotViewerCatalogDatasetRow
                      key={experimentId}
                      group={group}
                      isSelected={selectedDatasets.has(experimentId)}
                      showFavoriteToggle={isSignedIn}
                      isFavorited={resolveIsFavorited(group)}
                      favoritePending={
                        favoriteMutation.isPending &&
                        favoriteMutation.variables?.experimentId === experimentId
                      }
                      onToggleSelect={() => handleToggleDataset(experimentId)}
                      onToggleFavorite={() => handleToggleFavorite(experimentId)}
                      onGuestFavoritePress={handleGuestFavoritePress}
                    />
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </ScrollShadow>

      <Separator className="bg-border" />

      <div className="shrink-0 px-3 py-3">
        <p className="text-muted mb-2 text-xs font-medium uppercase tracking-wide">
          Selected datasets ({state.datasets.length})
        </p>
        {selectedDatasetRows.length === 0 ? (
          <p className="text-muted text-xs">No datasets selected yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {selectedDatasetRows.map((row) => (
              <li
                key={row.experimentId}
                className="border-border bg-default/20 flex items-center gap-1.5 rounded-md border px-2 py-1.5"
              >
                <span className="text-foreground min-w-0 flex-1 truncate text-xs">
                  {row.label}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label={`Remove ${row.label}`}
                  onPress={() => handleToggleDataset(row.experimentId)}
                >
                  <XIcon className="text-muted h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </aside>
  );
}
