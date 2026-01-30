"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "~/lib/supabase-client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface FavoriteState {
  favoriteCount: number;
  userHasFavorited: boolean;
}

interface UseRealtimeFavoritesOptions {
  moleculeId: string | undefined;
  initialFavoriteCount: number;
  initialUserHasFavorited: boolean;
  userId: string | undefined;
}

export function useRealtimeFavorites({
  moleculeId,
  initialFavoriteCount,
  initialUserHasFavorited,
  userId,
}: UseRealtimeFavoritesOptions): FavoriteState {
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [userHasFavorited, setUserHasFavorited] = useState(
    initialUserHasFavorited,
  );

  useEffect(() => {
    if (!moleculeId) return;
    setFavoriteCount(initialFavoriteCount);
    setUserHasFavorited(initialUserHasFavorited);
  }, [moleculeId, initialFavoriteCount, initialUserHasFavorited]);

  useEffect(() => {
    if (!moleculeId) return;

    const channel = supabaseClient
      .channel(`molecule-favorites:${moleculeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "molecule_favorites",
          filter: `molecule_id=eq.${moleculeId}`,
        },
        (
          payload: RealtimePostgresChangesPayload<{
            user_id: string;
            molecule_id: string;
          }>,
        ) => {
          if (payload.eventType === "INSERT") {
            setFavoriteCount((prev) => prev + 1);
            const newData = payload.new as { user_id?: string } | null;
            if (newData?.user_id === userId) {
              setUserHasFavorited(true);
            }
          } else if (payload.eventType === "DELETE") {
            setFavoriteCount((prev) => Math.max(0, prev - 1));
            const oldData = payload.old as { user_id?: string } | null;
            if (oldData?.user_id === userId) {
              setUserHasFavorited(false);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "molecules",
          filter: `id=eq.${moleculeId}`,
        },
        (
          payload: RealtimePostgresChangesPayload<{
            favorite_count?: number;
          }>,
        ) => {
          const newData = payload.new as { favorite_count?: number } | null;
          if (
            newData?.favorite_count !== undefined &&
            typeof newData.favorite_count === "number"
          ) {
            setFavoriteCount(newData.favorite_count);
          }
        },
      )
      .subscribe((status) => {
        if (String(status) === "SUBSCRIBED") {
          console.log(
            `Subscribed to real-time favorites for molecule ${moleculeId}`,
          );
        } else if (String(status) === "CHANNEL_ERROR") {
          console.error(
            `Error subscribing to molecule ${moleculeId} favorites updates`,
          );
        }
      });

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [moleculeId, userId]);

  return { favoriteCount, userHasFavorited };
}
