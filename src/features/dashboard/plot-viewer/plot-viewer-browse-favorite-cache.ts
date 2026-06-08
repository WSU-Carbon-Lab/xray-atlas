import type { QueryClient } from "@tanstack/react-query";

function trpcKeyMatchesExperimentsProcedure(
  queryKey: readonly unknown[],
  procedure: "browseList" | "browseSearch",
): boolean {
  const head = queryKey[0];
  if (!Array.isArray(head) || head.length < 2) {
    return false;
  }
  return head[0] === "experiments" && head[1] === procedure;
}

function patchExperimentFavoriteInBrowsePayload(
  old: unknown,
  targetExperimentId: string,
  nextFavoriteCount: number,
  nextUserHasFavorited: boolean,
): unknown {
  if (old === undefined || typeof old !== "object") {
    return old;
  }
  const record = old as { groups?: unknown };
  if (!Array.isArray(record.groups)) {
    return old;
  }
  const rawGroups = record.groups as unknown[];
  let changed = false;
  const groups = rawGroups.map((group: unknown) => {
    if (!group || typeof group !== "object") {
      return group;
    }
    const row = group as { experimentId?: string };
    if (row.experimentId !== targetExperimentId) {
      return group;
    }
    changed = true;
    return {
      ...row,
      favoriteCount: nextFavoriteCount,
      userHasFavorited: nextUserHasFavorited,
    };
  });
  return changed ? { ...record, groups } : old;
}

/**
 * Patches favorite flags on every cached NEXAFS browse list/search payload for one experiment.
 */
export function patchPlotViewerBrowseFavoriteCaches(
  queryClient: QueryClient,
  experimentId: string,
  nextFavoriteCount: number,
  nextUserHasFavorited: boolean,
): void {
  for (const procedure of ["browseList", "browseSearch"] as const) {
    queryClient.setQueriesData(
      {
        predicate: (query) =>
          trpcKeyMatchesExperimentsProcedure(query.queryKey, procedure),
      },
      (old) =>
        patchExperimentFavoriteInBrowsePayload(
          old,
          experimentId,
          nextFavoriteCount,
          nextUserHasFavorited,
        ),
    );
  }
}

/**
 * Optimistically adds or removes an experiment id from the cached favorites id list.
 */
export function patchPlotViewerFavoriteIdsCache(
  queryClient: QueryClient,
  experimentId: string,
  favorited: boolean,
): void {
  queryClient.setQueriesData(
    {
      predicate: (query) => {
        const head = query.queryKey[0];
        if (!Array.isArray(head) || head.length < 2) {
          return false;
        }
        return (
          head[0] === "experiments" && head[1] === "listFavoriteExperimentIds"
        );
      },
    },
    (old) => {
      if (!old || typeof old !== "object") {
        return old;
      }
      const record = old as { experimentIds?: string[] };
      const current = record.experimentIds ?? [];
      const has = current.includes(experimentId);
      if (favorited && !has) {
        return { experimentIds: [experimentId, ...current] };
      }
      if (!favorited && has) {
        return {
          experimentIds: current.filter((id) => id !== experimentId),
        };
      }
      return old;
    },
  );
}
