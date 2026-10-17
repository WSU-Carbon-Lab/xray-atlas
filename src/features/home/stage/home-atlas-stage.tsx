"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import type { HomePillarId } from "../snapshot/types";
import { PillarTile } from "./pillar-tile";
import { useHomePillar } from "./use-home-pillar";

const META: Record<
  HomePillarId,
  { kicker: string; title: string; summary: string }
> = {
  molecules: {
    kicker: "01 · Identity",
    title: "Molecules",
    summary:
      "One record per compound. Every spectrum, sample, and paper hangs from it.",
  },
  spectra: {
    kicker: "02 · Measurement",
    title: "NEXAFS spectra",
    summary:
      "Calibrated, normalized, and carried with their geometry and analysis channels.",
  },
  facilities: {
    kicker: "03 · Source",
    title: "Facilities",
    summary:
      "Direct beamline integration, starting at the Advanced Light Source.",
  },
};
const ORDER: readonly HomePillarId[] = ["molecules", "spectra", "facilities"];
/** Stable id of the expanded-view region every tile controls. */
const VIEW_ID = "home-stage-view";
const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/** Arrow / Home / End navigation between pillar tiles inside one toolbar. */
function moveTileFocus(e: KeyboardEvent<HTMLDivElement>): HomePillarId | null {
  const tiles = [
    ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
      "[data-home-pillar]",
    ),
  ];
  if (tiles.length === 0) return null;
  const current = tiles.findIndex((t) => t === document.activeElement);
  let next: number;
  if (NEXT_KEYS.has(e.key)) next = (current + 1) % tiles.length;
  else if (PREV_KEYS.has(e.key))
    next = (current - 1 + tiles.length) % tiles.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = tiles.length - 1;
  else return null;
  e.preventDefault();
  const target = tiles[next]!;
  target.focus();
  return (target.dataset.homePillar as HomePillarId | undefined) ?? null;
}

export interface HomeAtlasStageProps {
  search: ReactNode;
  previews: Record<HomePillarId, ReactNode>;
  views: Record<HomePillarId, ReactNode>;
}

/**
 * Search band plus the three pillars. With no active pillar the pillars are an
 * even three-tile overview; selecting one expands it and collapses the others
 * into a rail. Tiles form an arrow-key toolbar (roving tabindex) and control
 * one stable view region. Focus moves to the view heading only after an
 * in-page selection, never on hash hydration or Back/Forward.
 */
export function HomeAtlasStage({
  search,
  previews,
  views,
}: HomeAtlasStageProps): ReactElement {
  const [active, setPillar] = useHomePillar();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prev = useRef<HomePillarId | null>(null);
  const userInitiated = useRef(false);
  const [rovingId, setRovingId] = useState<HomePillarId | null>(null);
  const setActive = useCallback(
    (next: HomePillarId | null) => {
      userInitiated.current = true;
      setPillar(next);
    },
    [setPillar],
  );
  useEffect(() => {
    if (userInitiated.current) {
      if (active && prev.current !== active)
        headingRef.current?.focus({ preventScroll: true });
      else if (!active && prev.current)
        document
          .querySelector<HTMLElement>(`[data-home-pillar="${prev.current}"]`)
          ?.focus({ preventScroll: true });
    }
    userInitiated.current = false;
    prev.current = active;
  }, [active]);
  const onToolbarKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const id = moveTileFocus(e);
    if (id) setRovingId(id);
  }, []);
  const tileIds = active ? ORDER.filter((id) => id !== active) : ORDER;
  const tabStop =
    rovingId && tileIds.includes(rovingId) ? rovingId : tileIds[0]!;
  const tile = (id: HomePillarId, compact: boolean): ReactElement => (
    <PillarTile
      key={id}
      id={id}
      {...META[id]}
      preview={previews[id]}
      compact={compact}
      expanded={active === id}
      controlsId={VIEW_ID}
      tabIndex={id === tabStop ? 0 : -1}
      onFocus={setRovingId}
      onSelect={setActive}
    />
  );

  return (
    <section aria-label="Explore the Atlas" className="home-stage">
      <div className="home-stage__search">{search}</div>
      <div
        className={
          active
            ? "home-stage__grid home-stage__grid--open"
            : "home-stage__grid"
        }
        role={active ? undefined : "toolbar"}
        aria-label={active ? undefined : "Atlas pillars"}
        onKeyDown={active ? undefined : onToolbarKeyDown}
      >
        <div
          id={VIEW_ID}
          role="region"
          aria-label={active ? META[active].title : "Atlas pillar view"}
          className="home-view"
          hidden={!active}
          style={
            active
              ? {
                  viewTransitionName: `home-tile-${active}`,
                  viewTransitionClass: "home",
                }
              : undefined
          }
        >
          {active && (
            <>
              <div className="flex items-center justify-between gap-4">
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-foreground text-2xl font-semibold tracking-tight outline-none"
                >
                  {META[active].title}
                </h2>
                <button
                  type="button"
                  className="home-chip"
                  onClick={() => setActive(null)}
                >
                  Overview
                </button>
              </div>
              {views[active]}
            </>
          )}
        </div>
        {active ? (
          <nav aria-label="Other parts of the Atlas" className="home-rail">
            <div
              role="toolbar"
              aria-label="Atlas pillars"
              aria-orientation="vertical"
              className="contents"
              onKeyDown={onToolbarKeyDown}
            >
              {tileIds.map((id) => tile(id, true))}
            </div>
          </nav>
        ) : (
          tileIds.map((id) => tile(id, false))
        )}
      </div>
    </section>
  );
}
