"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "~/lib/supabase-client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface UpvoteState {
  upvoteCount: number;
  userHasUpvoted: boolean;
}

interface UseRealtimeUpvotesOptions {
  moleculeId: string | undefined;
  initialUpvoteCount: number;
  initialUserHasUpvoted: boolean;
  userId: string | undefined;
}

export function useRealtimeUpvotes({
  moleculeId,
  initialUpvoteCount,
  initialUserHasUpvoted,
  userId,
}: UseRealtimeUpvotesOptions): UpvoteState {
  const [upvoteCount, setUpvoteCount] = useState(initialUpvoteCount);
  const [userHasUpvoted, setUserHasUpvoted] = useState(initialUserHasUpvoted);

  useEffect(() => {
    if (!moleculeId) return;

    setUpvoteCount(initialUpvoteCount);
    setUserHasUpvoted(initialUserHasUpvoted);
  }, [moleculeId, initialUpvoteCount, initialUserHasUpvoted]);

  useEffect(() => {
    if (!moleculeId) return;

    const channel = supabaseClient
      .channel(`molecule-upvotes:${moleculeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "moleculeupvotes",
          filter: `moleculeid=eq.${moleculeId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ userid: string; moleculeid: string }>) => {
          if (payload.eventType === "INSERT") {
            setUpvoteCount((prev) => prev + 1);
            const newData = payload.new as { userid?: string } | null;
            if (newData?.userid === userId) {
              setUserHasUpvoted(true);
            }
          } else if (payload.eventType === "DELETE") {
            setUpvoteCount((prev) => Math.max(0, prev - 1));
            const oldData = payload.old as { userid?: string } | null;
            if (oldData?.userid === userId) {
              setUserHasUpvoted(false);
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
        (payload: RealtimePostgresChangesPayload<{ upvotes?: number }>) => {
          const newData = payload.new as { upvotes?: number } | null;
          if (newData?.upvotes !== undefined && typeof newData.upvotes === "number") {
            setUpvoteCount(newData.upvotes);
          }
        },
      )
      .subscribe((status) => {
        if (String(status) === "SUBSCRIBED") {
          console.log(`Subscribed to real-time updates for molecule ${moleculeId}`);
        } else if (String(status) === "CHANNEL_ERROR") {
          console.error(`Error subscribing to molecule ${moleculeId} updates`);
        }
      });

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [moleculeId, userId]);

  return { upvoteCount, userHasUpvoted };
}
