"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { HomePillarId } from "../snapshot/types";

const EVENT = "home-pillar-change";

const HASH_TO_PILLAR: Record<string, HomePillarId> = {
  hierarchies: "hierarchies",
  molecules: "hierarchies",
  nexafs: "nexafs",
  spectra: "nexafs",
  provenance: "provenance",
  collaboration: "collaboration",
  fair: "collaboration",
};

function read(): HomePillarId | null {
  return HASH_TO_PILLAR[window.location.hash.slice(1)] ?? null;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/**
 * Active home theme from `location.hash`. The server snapshot is `null`
 * (Collaboration) so hydration always matches; the client value applies right
 * after hydration. `history: "push"` records a Back step. `history: "replace"`
 * updates the current entry, which is what hover selection uses so moving
 * across the feature list does not stack one history entry per row. Neither
 * mode starts a document view transition. `#molecules` still selects the
 * catalog. `#spectra` and `#nexafs` select Data. `#fair` selects collaboration.
 */
export function useHomePillar(): readonly [
  HomePillarId | null,
  (next: HomePillarId | null, history?: "push" | "replace") => void,
] {
  const pillar = useSyncExternalStore(subscribe, read, () => null);
  const setPillar = useCallback(
    (next: HomePillarId | null, history: "push" | "replace" = "push") => {
      if (next === read()) return;
      const url = next
        ? `#${next}`
        : `${window.location.pathname}${window.location.search}`;
      if (history === "replace") {
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState(null, "", url);
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [],
  );
  return [pillar, setPillar] as const;
}
