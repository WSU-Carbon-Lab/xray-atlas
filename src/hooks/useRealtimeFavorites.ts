"use client";

import { useEffect, useRef, useState } from "react";
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
  const [retryToken, setRetryToken] = useState(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (!moleculeId) return;
    setFavoriteCount(initialFavoriteCount);
    setUserHasFavorited(initialUserHasFavorited);
  }, [moleculeId, initialFavoriteCount, initialUserHasFavorited]);

  useEffect(() => {
    if (!moleculeId || !enabled) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const baseChannel = supabaseClient.channel(
      `molecule-favorites:${moleculeId}`,
    );
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
      if (String(status) === "SUBSCRIBED") {
        reconnectAttemptRef.current = 0;
      }
      if (
        String(status) === "CHANNEL_ERROR" ||
        String(status) === "TIMED_OUT" ||
        String(status) === "CLOSED"
      ) {
        reconnectAttemptRef.current += 1;
        const retryDelayMs = Math.min(
          1000 * 2 ** (reconnectAttemptRef.current - 1),
          15000,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          setRetryToken((value) => value + 1);
        }, retryDelayMs);
      }
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      void supabaseClient.removeChannel(channel);
    };
  }, [moleculeId, userId, enabled, retryToken]);

  return { favoriteCount, userHasFavorited };
}
