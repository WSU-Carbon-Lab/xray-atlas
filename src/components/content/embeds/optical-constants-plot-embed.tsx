"use client";

import { NexafsExperimentDatasetPanel } from "~/components/nexafs/nexafs-experiment-dataset-panel";
import { WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID } from "~/lib/wiki-optical-constants-showcase-id";

/**
 * Wiki optical-constants example plot: same browse dataset panel as NEXAFS catalog cards
 * (data-view rail, difference spectra, analysis rails) for the fixed showcase experiment.
 */
export function OpticalConstantsPlotEmbed() {
  return (
    <div
      className="pointer-events-auto mt-3 min-h-[480px] w-full min-w-0"
      data-testid="wiki-optical-constants-plot-embed"
    >
      <NexafsExperimentDatasetPanel
        experimentId={WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID}
        enabled
      />
    </div>
  );
}
