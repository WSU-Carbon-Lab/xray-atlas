"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";
import { trpc } from "~/trpc/client";
import { buildPlotViewerGroupByExperimentId } from "./plot-viewer-catalog-meta";
import { orderBrowseGroupsByExperimentIds } from "./plot-viewer-favorite-ids";

/**
 * Resolves NEXAFS browse metadata for every selected experiment, including favorites and URL-only picks outside the current catalog page.
 */
export function usePlotViewerSelectedGroupIndex(params: {
  urlSynced: boolean;
  selectedExperimentIds: readonly string[];
  catalogGroups: readonly NexafsBrowseGroup[];
}): Map<string, NexafsBrowseGroup> {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);

  const atlasFavoriteIdsQuery =
    trpc.experiments.listFavoriteExperimentIds.useQuery(undefined, {
      enabled: params.urlSynced && isSignedIn,
      staleTime: 30_000,
    });

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
      enabled: params.urlSynced && atlasFavoriteIds.length > 0,
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
    for (const group of params.catalogGroups) {
      resolved.add(group.experimentId);
    }
    for (const group of favoriteGroups) {
      resolved.add(group.experimentId);
    }
    return params.selectedExperimentIds.filter(
      (experimentId) => !resolved.has(experimentId),
    );
  }, [favoriteGroups, params.catalogGroups, params.selectedExperimentIds]);

  const selectedMetadataBrowseQuery = trpc.experiments.browseList.useQuery(
    {
      experimentIds: unresolvedSelectedExperimentIds,
      limit: Math.max(unresolvedSelectedExperimentIds.length, 1),
      offset: 0,
      sortBy: "favorites",
    },
    {
      enabled: params.urlSynced && unresolvedSelectedExperimentIds.length > 0,
      staleTime: 30_000,
    },
  );

  return useMemo(
    () =>
      buildPlotViewerGroupByExperimentId([
        ...params.catalogGroups,
        ...favoriteGroups,
        ...(selectedMetadataBrowseQuery.data?.groups ?? []),
      ]),
    [
      favoriteGroups,
      params.catalogGroups,
      selectedMetadataBrowseQuery.data?.groups,
    ],
  );
}
