"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

function OpticalConstantsPlotEmbedLoading(): ReactElement {
  return (
    <div
      className="mt-3 min-h-[480px] w-full"
      aria-busy="true"
      aria-label="Loading optical constants plot"
    />
  );
}

const OpticalConstantsPlotEmbed = dynamic(
  () =>
    import("./optical-constants-plot-embed").then(
      (mod) => mod.OpticalConstantsPlotEmbed,
    ),
  {
    loading: OpticalConstantsPlotEmbedLoading,
  },
);

/**
 * Loads the wiki optical-constants plot embed in a separate client chunk.
 *
 * Visx and the Henke f2 table stay out of the page bundle until this component
 * renders. The embed shows the showcase experiment dataset panel.
 *
 * @returns The showcase plot, or a loading region while that chunk loads.
 */
export function OpticalConstantsPlotEmbedDynamic(): ReactElement {
  return <OpticalConstantsPlotEmbed />;
}
