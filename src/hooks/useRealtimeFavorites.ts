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
  enabled?: boolean;
}

export function useRealtimeFavorites({
  moleculeId,
  initialFavoriteCount,
  initialUserHasFavorited,
  userId,
  enabled = true,
}: UseRealtimeFavoritesOptions): FavoriteState {
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [userHasFavorited, setUserHasFavorited] = useState(
    initialUserHasFavorited,
  );
  const [fallbackActive, setFallbackActive] = useState(false);

  useEffect(() => {
    if (!moleculeId) return;
    setFavoriteCount(initialFavoriteCount);
    setUserHasFavorited(initialUserHasFavorited);
  }, [moleculeId, initialFavoriteCount, initialUserHasFavorited]);

  useEffect(() => {
    if (!moleculeId || !enabled) return;

    const baseChannel = supabaseClient.channel(`molecule-favorites:${moleculeId}`);

    if (!fallbackActive) {
      baseChannel.on(
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
            if (newData?.user_id === userId) setUserHasFavorited(true);
          } else if (payload.eventType === "DELETE") {
            setFavoriteCount((prev) => Math.max(0, prev - 1));
            const oldData = payload.old as { user_id?: string } | null;
            if (oldData?.user_id === userId) setUserHasFavorited(false);
          }
        },
      );
    }

    baseChannel.on(
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
        if (typeof newData?.favorite_count === "number") {
          setFavoriteCount(newData.favorite_count);
        }
      },
    );

    const channel = baseChannel.subscribe((status) => {
      if (String(status) === "CHANNEL_ERROR") {
        if (!fallbackActive) {
          setFallbackActive(true);
          void supabaseClient.removeChannel(baseChannel);
        } else {
          console.error(
            `Error subscribing to molecule ${moleculeId} favorites updates`,
          );
        }
      }
    });

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [moleculeId, userId, enabled, fallbackActive]);

  return { favoriteCount, userHasFavorited };
}
