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
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "INSERT") {
            setUpvoteCount((prev) => prev + 1);
            if (payload.new.userid === userId) {
              setUserHasUpvoted(true);
            }
          } else if (payload.eventType === "DELETE") {
            setUpvoteCount((prev) => Math.max(0, prev - 1));
            if (payload.old.userid === userId) {
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
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.new.upvotes !== undefined) {
            setUpvoteCount(payload.new.upvotes);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to real-time updates for molecule ${moleculeId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Error subscribing to molecule ${moleculeId} updates`);
        }
      });

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [moleculeId, userId]);

  return { upvoteCount, userHasUpvoted };
}
