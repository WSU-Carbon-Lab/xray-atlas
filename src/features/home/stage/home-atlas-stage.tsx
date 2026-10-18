"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { site } from "~/app/brand";
import { HomeMoleculesView } from "../molecules/home-molecules-view";
import { HomeProvenancePanel } from "../provenance/home-provenance-panel";
import { HomeSpectraView } from "../spectra/home-spectra-view";
import { HomeCollaborationView } from "./home-collaboration-view";
import { HomeStagePreview } from "./home-stage-preview";
import { HOME_SNAPSHOT } from "../snapshot/home-snapshot.generated";
import type { HomePillarId, HomeStageId } from "../snapshot/types";
import { PillarTile } from "./pillar-tile";
import { useHomePillar } from "./use-home-pillar";

interface HomeTheme {
  title: string;
  /** Sentence under the feature name. */
  body: string;
  /** Sentence under the X-ray Atlas kicker. Data, Catalog, and Collaboration replace this with the active view caption. */
  caption: string;
}

const THEMES: Record<HomeStageId, HomeTheme> = {
  nexafs: {
    title: "Data",
    body: "Absorption, polarization, and optical constants on one energy axis.",
    caption:
      "Absorption, polarization, normalization, and optical constants for one measurement.",
  },
  hierarchies: {
    title: "Catalog",
    body: "Group the same measurements by molecule, edge, instrument, facility, or collection mode.",
    caption: "Hierarchical groupings to view the interconnected data.",
  },
  provenance: {
    title: "Provenance",
    body: "Sample, collection, analysis, raw and calculated traces, and the papers they came from.",
    caption:
      "The sample, the beamline, the processing, the traces, and the papers stay on the measurement.",
  },
  collaboration: {
    title: "Collaboration",
    body: "Open data and open science. Compare published spectra, then open one and work with it.",
    caption:
      "P3HT, Y11, and Y6 at the carbon K-edge, 283–289 eV. Spectra, three π* peaks, and the refractive-index contrast between the films.",
  },
};

const ORDER: readonly HomeStageId[] = [
  "collaboration",
  "nexafs",
  "hierarchies",
  "provenance",
];
const HERO_ID = "home-hero";
const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

function hashFor(id: HomeStageId): HomePillarId | null {
  return id === "collaboration" ? null : id;
}

/**
 * Home feature stage. Names, arrows, and descriptions stay on the left. The
 * selected feature's preview fills the right at one height, under the X-ray
 * Atlas kicker.
 */
export function HomeAtlasStage(): ReactElement {
  const [hashPillar, setPillar] = useHomePillar();
  const stageId: HomeStageId = hashPillar ?? "collaboration";
  const provenanceMolecule = HOME_SNAPSHOT.showcaseMolecule;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prev = useRef<HomeStageId>("collaboration");
  const userInitiated = useRef(false);
  const theme = THEMES[stageId];

  const commit = useCallback(
    (next: HomeStageId) => {
      userInitiated.current = true;
      setPillar(hashFor(next));
    },
    [setPillar],
  );

  useEffect(() => {
    if (userInitiated.current && prev.current !== stageId) {
      headingRef.current?.focus({ preventScroll: true });
    }
    userInitiated.current = false;
    prev.current = stageId;
  }, [stageId]);

  const onTabListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const index = ORDER.indexOf(stageId);
      let nextIndex: number;
      if (NEXT_KEYS.has(e.key)) nextIndex = (index + 1) % ORDER.length;
      else if (PREV_KEYS.has(e.key))
        nextIndex = (index - 1 + ORDER.length) % ORDER.length;
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = ORDER.length - 1;
      else return;
      e.preventDefault();
      commit(ORDER[nextIndex]!);
    },
    [commit, stageId],
  );

  return (
    <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[minmax(22rem,32rem)_minmax(0,1fr)] lg:gap-x-16">
      <div className="flex min-w-0 flex-col">
        <p className="home-kicker mb-3">Features</p>
        <div
          role="tablist"
          aria-label="Features"
          aria-orientation="vertical"
          className="divide-border divide-y"
          onKeyDown={onTabListKeyDown}
        >
          {ORDER.map((id) => (
            <PillarTile
              key={id}
              id={id}
              title={THEMES[id].title}
              description={THEMES[id].body}
              selected={stageId === id}
              controlsId={HERO_ID}
              tabIndex={stageId === id ? 0 : -1}
              onSelect={(next) => {
                if (next === stageId) {
                  headingRef.current?.focus({ preventScroll: true });
                  return;
                }
                commit(next);
              }}
            />
          ))}
        </div>
      </div>
      <div
        id={HERO_ID}
        role="tabpanel"
        aria-labelledby="home-heading"
        className="flex min-h-[28rem] min-w-0 flex-col gap-4 lg:h-full"
      >
        <h2
          ref={headingRef}
          id="home-heading"
          tabIndex={-1}
          className="home-kicker flex shrink-0 items-center gap-2 outline-none"
        >
          <span>{site.applicationName}</span>
          <span
            aria-hidden
            className="bg-accent inline-block size-1 shrink-0 rounded-full"
          />
          <span>{theme.title}</span>
        </h2>
        <div className="min-h-0 flex-1">
          {stageId === "nexafs" ? (
            <HomeSpectraView spectrum={HOME_SNAPSHOT.spectrum} />
          ) : null}
          {stageId === "hierarchies" ? (
            <HomeMoleculesView molecules={HOME_SNAPSHOT.molecules} />
          ) : null}
          {stageId === "collaboration" ? (
            <HomeCollaborationView
              collaboration={HOME_SNAPSHOT.collaboration}
            />
          ) : null}
          {stageId === "provenance" && provenanceMolecule ? (
            <HomeStagePreview caption={theme.caption}>
              <HomeProvenancePanel
                spectrum={HOME_SNAPSHOT.spectrum}
                molecule={provenanceMolecule}
              />
            </HomeStagePreview>
          ) : null}
        </div>
      </div>
    </div>
  );
}
