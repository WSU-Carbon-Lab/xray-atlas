import type { ReactElement } from "react";
import type { HomeSnapshotSpectrum } from "../snapshot/types";

/** Tile sparkline: first trace of the first tab, no axes. */
export function HomeSpectraPreview({
  spectrum,
}: {
  spectrum: HomeSnapshotSpectrum;
}): ReactElement {
  const t = spectrum.tabs[0]!.traces[0]!;
  return (
    <svg
      viewBox={`0 0 ${spectrum.width} ${spectrum.height}`}
      className="h-20 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={t.d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
