"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabaseClient } from "~/lib/supabase-client";

type UseRealtimeFavoriteEntityArgs = {
  channelPrefix: string;
  entityId: string | undefined;
  initialFavoriteCount: number;
  initialUserHasFavorited: boolean;
  userId: string | undefined;
  favoritesTable: string;
  favoritesEntityColumn: string;
  favoritesUserColumn: string;
  aggregateTable: string;
  aggregateEntityColumn: string;
  aggregateCountColumn: string;
  enabled?: boolean;
};

export function useRealtimeFavoriteEntity({
  channelPrefix,
  entityId,
  initialFavoriteCount,
  initialUserHasFavorited,
  userId,
  favoritesTable,
  favoritesEntityColumn,
  favoritesUserColumn,
  aggregateTable,
  aggregateEntityColumn,
  aggregateCountColumn,
  enabled = true,
}: UseRealtimeFavoriteEntityArgs) {
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [userHasFavorited, setUserHasFavorited] = useState(
    initialUserHasFavorited,
  );
  const [retryToken, setRetryToken] = useState(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!entityId) return;
    setFavoriteCount(initialFavoriteCount);
    setUserHasFavorited(initialUserHasFavorited);
  }, [entityId, initialFavoriteCount, initialUserHasFavorited]);

  useEffect(() => {
    if (!entityId || !enabled) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const channel = supabaseClient.channel(`${channelPrefix}:${entityId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: favoritesTable,
        filter: `${favoritesEntityColumn}=eq.${entityId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === "INSERT") {
          setFavoriteCount((prev) => prev + 1);
          const newData = payload.new as Record<string, unknown> | null;
          if (
            newData &&
            typeof newData[favoritesUserColumn] === "string" &&
            newData[favoritesUserColumn] === userId
          ) {
            setUserHasFavorited(true);
          }
        } else if (payload.eventType === "DELETE") {
          setFavoriteCount((prev) => Math.max(0, prev - 1));
          const oldData = payload.old as Record<string, unknown> | null;
          if (
            oldData &&
            typeof oldData[favoritesUserColumn] === "string" &&
            oldData[favoritesUserColumn] === userId
          ) {
            setUserHasFavorited(false);
          }
        }
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: aggregateTable,
        filter: `${aggregateEntityColumn}=eq.${entityId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const newData = payload.new as Record<string, unknown> | null;
        const value = newData?.[aggregateCountColumn];
        if (typeof value === "number") {
          setFavoriteCount(value);
        }
      },
    );

    const subscription = channel.subscribe((status) => {
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
      void supabaseClient.removeChannel(subscription);
    };
  }, [
    channelPrefix,
    entityId,
    enabled,
    retryToken,
    userId,
    favoritesTable,
    favoritesEntityColumn,
    favoritesUserColumn,
    aggregateTable,
    aggregateEntityColumn,
    aggregateCountColumn,
  ]);

  return { favoriteCount, userHasFavorited };
}
