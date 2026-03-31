"use client";

import { useRealtimeFavoriteEntity } from "~/hooks/useRealtimeFavoriteEntity";

type UseRealtimeExperimentFavoritesArgs = {
  experimentId: string | undefined;
  initialFavoriteCount: number;
  initialUserHasFavorited: boolean;
  userId: string | undefined;
  enabled?: boolean;
};

export function useRealtimeExperimentFavorites({
  experimentId,
  initialFavoriteCount,
  initialUserHasFavorited,
  userId,
  enabled = true,
}: UseRealtimeExperimentFavoritesArgs) {
  return useRealtimeFavoriteEntity({
    channelPrefix: "experiment-favorites",
    entityId: experimentId,
    initialFavoriteCount,
    initialUserHasFavorited,
    userId,
    favoritesTable: "experiment_favorites",
    favoritesEntityColumn: "experiment_id",
    favoritesUserColumn: "user_id",
    aggregateTable: "experimentquality",
    aggregateEntityColumn: "experimentid",
    aggregateCountColumn: "favorites",
    enabled,
  });
}
