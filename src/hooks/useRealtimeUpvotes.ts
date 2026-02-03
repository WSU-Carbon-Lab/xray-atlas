"use client";

import { useRealtimeFavorites } from "./useRealtimeFavorites";

export function useRealtimeUpvotes(opts: {
  moleculeId: string | undefined;
  initialUpvoteCount: number;
  initialUserHasUpvoted: boolean;
  userId: string | undefined;
  enabled?: boolean;
}) {
  const { favoriteCount, userHasFavorited } = useRealtimeFavorites({
    moleculeId: opts.moleculeId,
    initialFavoriteCount: opts.initialUpvoteCount,
    initialUserHasFavorited: opts.initialUserHasUpvoted,
    userId: opts.userId,
    enabled: opts.enabled,
  });
  return {
    upvoteCount: favoriteCount,
    userHasUpvoted: userHasFavorited,
  };
}
