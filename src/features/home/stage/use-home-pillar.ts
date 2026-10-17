"use client";

import { useCallback, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import type { HomePillarId } from "../snapshot/types";

const PILLARS: readonly HomePillarId[] = ["molecules", "spectra", "facilities"];
const EVENT = "home-pillar-change";

function read(): HomePillarId | null {
  const h = window.location.hash.slice(1);
  return (PILLARS as readonly string[]).includes(h)
    ? (h as HomePillarId)
    : null;
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

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Active home pillar from `location.hash`. The server snapshot is `null`
 * (overview) so hydration always matches; the client value applies right
 * after hydration. The setter pushes history (Back returns to the prior view)
 * and animates with the View Transitions API when available and motion is allowed.
 */
export function useHomePillar(): readonly [
  HomePillarId | null,
  (next: HomePillarId | null) => void,
] {
  const pillar = useSyncExternalStore(subscribe, read, () => null);
  const setPillar = useCallback((next: HomePillarId | null) => {
    if (next === read()) return;
    const url = next
      ? `#${next}`
      : `${window.location.pathname}${window.location.search}`;
    const apply = (): void => {
      window.history.pushState(null, "", url);
      flushSync(() => window.dispatchEvent(new Event(EVENT)));
    };
    if (
      typeof document.startViewTransition === "function" &&
      !prefersReducedMotion()
    ) {
      const transition = document.startViewTransition(apply);
      // Skipped or interrupted transitions reject `.ready`; the DOM update still applies.
      transition.ready.catch(() => undefined);
    } else {
      apply();
    }
  }, []);
  return [pillar, setPillar] as const;
}
