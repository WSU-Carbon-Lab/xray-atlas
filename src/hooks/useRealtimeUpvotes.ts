"use client";

import { useRealtimeFavorites } from "./useRealtimeFavorites";

export function useRealtimeUpvotes(opts: {
  moleculeId: string | undefined;
  initialUpvoteCount: number;
  initialUserHasUpvoted: boolean;
  userId: string | undefined;
}) {
  const { favoriteCount, userHasFavorited } = useRealtimeFavorites({
    moleculeId: opts.moleculeId,
    initialFavoriteCount: opts.initialUpvoteCount,
    initialUserHasFavorited: opts.initialUserHasUpvoted,
    userId: opts.userId,
  });
  return {
    upvoteCount: favoriteCount,
    userHasUpvoted: userHasFavorited,
  };
}
