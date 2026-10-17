"use client";

import { useEffect, useRef, type ReactElement, type ReactNode } from "react";
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

export interface HomeAtlasStageProps {
  search: ReactNode;
  previews: Record<HomePillarId, ReactNode>;
  views: Record<HomePillarId, ReactNode>;
}

/**
 * Search band plus the three pillars. With no active pillar the pillars are an
 * even three-tile overview; selecting one expands it and collapses the others
 * into a rail. Focus moves to the expanded view heading.
 */
export function HomeAtlasStage({
  search,
  previews,
  views,
}: HomeAtlasStageProps): ReactElement {
  const [active, setActive] = useHomePillar();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prev = useRef<HomePillarId | null>(null);
  useEffect(() => {
    if (active && prev.current !== active)
      headingRef.current?.focus({ preventScroll: true });
    else if (!active && prev.current)
      document
        .querySelector<HTMLElement>(`[data-home-pillar="${prev.current}"]`)
        ?.focus({ preventScroll: true });
    prev.current = active;
  }, [active]);

  return (
    <section aria-label="Explore the Atlas" className="home-stage">
      <div className="home-stage__search">{search}</div>
      <div
        className={
          active
            ? "home-stage__grid home-stage__grid--open"
            : "home-stage__grid"
        }
      >
        {active ? (
          <>
            <div
              id={`home-view-${active}`}
              className="home-view"
              style={{ viewTransitionName: `home-tile-${active}` }}
            >
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
            </div>
            <nav aria-label="Other parts of the Atlas" className="home-rail">
              {ORDER.filter((id) => id !== active).map((id) => (
                <PillarTile
                  key={id}
                  id={id}
                  {...META[id]}
                  preview={previews[id]}
                  compact
                  onSelect={setActive}
                />
              ))}
            </nav>
          </>
        ) : (
          ORDER.map((id) => (
            <PillarTile
              key={id}
              id={id}
              {...META[id]}
              preview={previews[id]}
              compact={false}
              onSelect={setActive}
            />
          ))
        )}
      </div>
    </section>
  );
}
