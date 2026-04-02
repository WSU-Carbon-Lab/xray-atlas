"use client";

import { useRealtimeFavoriteEntity } from "~/hooks/useRealtimeFavoriteEntity";

interface FavoriteState {
  favoriteCount: number;
  userHasFavorited: boolean;
}

interface UseRealtimeFavoritesOptions {
  moleculeId: string | undefined;
  initialFavoriteCount: number;
  initialUserHasFavorited: boolean;
  userId: string | undefined;
  enabled?: boolean;
}

export function useRealtimeFavorites({
  moleculeId,
  initialFavoriteCount,
  initialUserHasFavorited,
  userId,
  enabled = true,
}: UseRealtimeFavoritesOptions): FavoriteState {
  return useRealtimeFavoriteEntity({
    channelPrefix: "molecule-favorites",
    entityId: moleculeId,
    initialFavoriteCount,
    initialUserHasFavorited,
    userId,
    favoritesTable: "molecule_favorites",
    favoritesEntityColumn: "molecule_id",
    favoritesUserColumn: "user_id",
    aggregateTable: "molecules",
    aggregateEntityColumn: "id",
    aggregateCountColumn: "favorite_count",
    enabled,
  });
}
