"use client";

import { useMemo, useState, type ReactElement } from "react";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import { buildCollaborationTab } from "../collaboration/collaboration-chart";
import { HomePresenceLayer } from "../collaboration/home-presence-layer";
import { HomeSpectrumFigure } from "../spectra/home-spectrum-figure";
import type {
  HomeCollaboration,
  HomeSnapshotSpectrum,
} from "../snapshot/types";
import { HomeDisplayTabs } from "./home-display-tabs";
import { HomeStagePreview } from "./home-stage-preview";

const TABS = [
  { id: "collaborate", label: "Collaborate" },
  { id: "peaks", label: "Peaks", group: "Analysis" },
  { id: "vacuum", label: "Vacuum contrast", group: "Analysis" },
  { id: "contrast", label: "Binary contrast", group: "Analysis" },
] as const;

type CollaborationTab = (typeof TABS)[number]["id"];

const RAMPS = [0.22, 0.58, 1] as const;

const CAPTIONS: Record<CollaborationTab, string> = {
  collaborate:
    "Collaborate internationally on the same data and on standardized analyses.",
  peaks: "Compare peaks between similar molecules and across facilities.",
  vacuum:
    "Use open data to compute scattering contrast against vacuum ahead of beamtime.",
  contrast:
    "Compute the scattering contrast between two molecules ahead of beamtime.",
};

function chartMode(
  tab: CollaborationTab,
): "overlay" | "peaks" | "vacuum" | "materials" {
  if (tab === "peaks") return "peaks";
  if (tab === "vacuum") return "vacuum";
  if (tab === "contrast") return "materials";
  return "overlay";
}

function cardClass(marked: boolean): string {
  return marked
    ? "border-accent bg-zinc-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:bg-zinc-900 flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 text-left"
    : "border-border bg-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:bg-zinc-900 flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 text-left";
}

/**
 * Opening view for the home Collaboration feature.
 *
 * `collaboration` holds three carbon K-edge spectra on a shared 283–289 eV
 * grid. Peaks, Vacuum contrast, and Binary contrast are one Analysis group.
 * Vacuum contrast and Binary contrast plot `c(E) = |Δn|² / E⁴` on a
 * logarithmic axis. Vacuum uses
 * 271–330 eV and draws no peak labels. Contrast draws one curve for two films
 * and every pair when all three are included. Collaborate draws the same
 * spectra with presence cursors; the You avatar and cursor appear on hover.
 */
export function HomeCollaborationView({
  collaboration,
}: {
  collaboration: HomeCollaboration;
}): ReactElement {
  const [tab, setTab] = useState<CollaborationTab>("collaborate");
  const [visible, setVisible] = useState<ReadonlySet<string>>(
    () => new Set(collaboration.datasets.map((dataset) => dataset.slug)),
  );
  const [contrastOn, setContrastOn] = useState<ReadonlySet<string>>(() => {
    const slugs = collaboration.datasets.map((dataset) => dataset.slug);
    return new Set(slugs.slice(0, 2));
  });
  const chart = useMemo(() => {
    const vacuum = tab === "vacuum";
    const series = collaboration.datasets.flatMap((dataset, index) => {
      const included =
        tab === "contrast"
          ? contrastOn.has(dataset.slug)
          : visible.has(dataset.slug);
      if (!included) return [];
      return [
        {
          key: dataset.slug,
          label: dataset.name,
          ramp: RAMPS[index] ?? 1,
          od: dataset.od,
          beta: vacuum ? dataset.vacuumBeta : dataset.beta,
          delta: vacuum ? dataset.vacuumDelta : dataset.delta,
        },
      ];
    });
    return buildCollaborationTab({
      width: collaboration.spectrum.width,
      height: collaboration.spectrum.height,
      energyMinEv: vacuum
        ? collaboration.vacuumEnergyMinEv
        : collaboration.energyMinEv,
      energyMaxEv: vacuum
        ? collaboration.vacuumEnergyMaxEv
        : collaboration.energyMaxEv,
      series,
      mode: chartMode(tab),
    });
  }, [collaboration, contrastOn, tab, visible]);
  const spectrum = useMemo((): HomeSnapshotSpectrum | null => {
    if (!chart) return null;
    return {
      ...collaboration.spectrum,
      xTicks: chart.xTicks,
      tabs: [chart.tab],
    };
  }, [chart, collaboration.spectrum]);

  function onMolecule(slug: string): void {
    if (tab === "contrast") {
      setContrastOn((current) => {
        const next = new Set(current);
        if (next.has(slug)) {
          if (next.size <= 2) return current;
          next.delete(slug);
          return next;
        }
        next.add(slug);
        return next;
      });
      return;
    }
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(slug) && next.size > 1) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <HomeStagePreview caption={CAPTIONS[tab]}>
      <div className="flex min-h-0 flex-col gap-3 lg:h-full">
        <HomeDisplayTabs
          label="Collaboration"
          tabs={TABS}
          value={tab}
          onChange={setTab}
          idPrefix="home-collaboration"
          controls="home-spectrum-figure"
        />
        <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row">
          <ul className="flex h-28 shrink-0 gap-2 overflow-x-auto sm:h-auto sm:w-40 sm:flex-col sm:overflow-y-auto">
            {collaboration.datasets.map((dataset) => {
              const shown = visible.has(dataset.slug);
              const inContrast = contrastOn.has(dataset.slug);
              const plotted = tab === "contrast" ? inContrast : shown;
              return (
                <li
                  key={dataset.experimentId}
                  className="h-full w-28 shrink-0 sm:h-auto sm:min-h-0 sm:w-auto sm:flex-1"
                >
                  <button
                    type="button"
                    aria-pressed={tab === "contrast" ? inContrast : shown}
                    aria-label={
                      tab === "contrast"
                        ? inContrast
                          ? `${dataset.name}, included in the contrast`
                          : `${dataset.name}, excluded from the contrast`
                        : shown
                          ? `${dataset.name}, included in the plot`
                          : `${dataset.name}, excluded from the plot`
                    }
                    onClick={() => onMolecule(dataset.slug)}
                    className={
                      plotted
                        ? cardClass(true)
                        : `${cardClass(false)} opacity-45`
                    }
                  >
                    <span className="relative min-h-0 flex-1 bg-white dark:bg-black">
                      <span className="absolute inset-0 flex items-center justify-center p-3">
                        {dataset.imageUrl ? (
                          <MoleculeImageSVG
                            imageUrl={dataset.imageUrl}
                            name={dataset.name}
                            className="h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
                            fallback={
                              <span className="text-muted flex size-full items-center justify-center text-xs">
                                {dataset.name.slice(0, 2)}
                              </span>
                            }
                          />
                        ) : (
                          <span className="text-muted text-xs">
                            {dataset.name.slice(0, 2)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="border-border flex shrink-0 flex-col border-t px-2.5 py-1.5">
                      <span className="text-foreground truncate text-sm leading-5 font-semibold">
                        {dataset.name}
                      </span>
                      <span
                        title={dataset.formula}
                        className="text-muted truncate font-mono text-[10px] leading-4 tabular-nums"
                      >
                        {dataset.formula}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {spectrum && chart ? (
            <div className="relative h-56 min-w-0 overflow-hidden sm:h-auto sm:min-h-0 sm:flex-1">
              <HomeSpectrumFigure
                spectrum={spectrum}
                tab={chart.tab}
                yGutter="wide"
              />
              {tab === "collaborate" ? <HomePresenceLayer /> : null}
            </div>
          ) : (
            <p className="text-muted flex flex-1 items-center text-sm">
              Select two molecules. The plot is the contrast between that pair.
            </p>
          )}
        </div>
      </div>
    </HomeStagePreview>
  );
}
