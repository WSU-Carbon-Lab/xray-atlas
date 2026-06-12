"use client";

import { useCallback, useEffect, useState } from "react";

/** localStorage key recording the ISO date of the newest What's New post the user opened. */
export const WHATS_NEW_SEEN_KEY = "whats-new-seen";

/** Dispatched on `window` after {@link WHATS_NEW_SEEN_KEY} is updated in this tab. */
export const WHATS_NEW_SEEN_EVENT = "whats-new-seen-updated";

function readIsUnread(latestDate: string): boolean {
  try {
    const seen = localStorage.getItem(WHATS_NEW_SEEN_KEY);
    return seen === null || latestDate > seen;
  } catch {
    return false;
  }
}

/**
 * Tracks unread What's New release posts against `localStorage` seen-state.
 *
 * @param latestDate - ISO date of the current highlight post; when omitted, unread is always false.
 */
export function useWhatsNewSeen(latestDate: string | undefined): {
  mounted: boolean;
  isUnread: boolean;
  markSeen: () => void;
} {
  const [mounted, setMounted] = useState(false);
  const [isUnread, setIsUnread] = useState(false);

  const syncUnread = useCallback((): void => {
    if (!latestDate) {
      setIsUnread(false);
      return;
    }
    setIsUnread(readIsUnread(latestDate));
  }, [latestDate]);

  useEffect(() => {
    setMounted(true);
    syncUnread();
  }, [syncUnread]);

  useEffect(() => {
    const handleUpdate = (): void => {
      syncUnread();
    };
    window.addEventListener(WHATS_NEW_SEEN_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(WHATS_NEW_SEEN_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [syncUnread]);

  const markSeen = useCallback((): void => {
    if (!latestDate) {
      return;
    }
    try {
      localStorage.setItem(WHATS_NEW_SEEN_KEY, latestDate);
    } catch {
      return;
    }
    setIsUnread(false);
    window.dispatchEvent(new Event(WHATS_NEW_SEEN_EVENT));
  }, [latestDate]);

  return { mounted, isUnread, markSeen };
}
