"use client";

import type { RefObject } from "react";
import { useTheme } from "next-themes";
import type { ScaleLinear } from "d3-scale";
import { NORMALIZATION_COLORS } from "../constants";
import type {
  NormalizationRegionEdgeId,
  NormalizationRegions,
  PlotDimensions,
} from "../types";
import { PinnedAxisMarker } from "../spectrum/PinnedAxisMarker";

type NormalizationRegionHandlesProps = {
  normalizationRegions: NormalizationRegions;
  xScale: ScaleLinear<number, number>;
  dimensions: PlotDimensions;
  plotSvgRef: RefObject<SVGSVGElement | null>;
  energyDomain: [number, number];
  onEdgeEnergyChange: (
    edge: NormalizationRegionEdgeId,
    energy: number,
  ) => void;
};

function clampEnergy(
  e: number,
  domain: [number, number],
): number {
  const lo = Math.min(domain[0], domain[1]);
  const hi = Math.max(domain[0], domain[1]);
  return Math.min(hi, Math.max(lo, e));
}

/**
 * Renders four draggable peak-style grips at pre/post normalization window edges when both energies exist for a region.
 */
export function NormalizationRegionHandles({
  normalizationRegions,
  xScale,
  dimensions,
  plotSvgRef,
  energyDomain,
  onEdgeEnergyChange,
}: NormalizationRegionHandlesProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const outline = isDark
    ? "rgba(248,250,252,0.94)"
    : "rgba(15,23,42,0.88)";

  const makeHandler =
    (edge: NormalizationRegionEdgeId) => (energy: number) => {
      const rounded = Math.round(energy * 100) / 100;
      onEdgeEnergyChange(edge, clampEnergy(rounded, energyDomain));
    };

  const edges: {
    id: NormalizationRegionEdgeId;
    energy: number | undefined;
    fill: string;
    selectedFill: string;
  }[] = [];

  if (normalizationRegions.pre) {
    const [a, b] = normalizationRegions.pre;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    edges.push(
      {
        id: "preMin",
        energy: lo,
        fill: NORMALIZATION_COLORS.preHandle,
        selectedFill: NORMALIZATION_COLORS.preLine,
      },
      {
        id: "preMax",
        energy: hi,
        fill: NORMALIZATION_COLORS.preHandle,
        selectedFill: NORMALIZATION_COLORS.preLine,
      },
    );
  }

  if (normalizationRegions.post) {
    const [a, b] = normalizationRegions.post;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    edges.push(
      {
        id: "postMin",
        energy: lo,
        fill: NORMALIZATION_COLORS.postHandle,
        selectedFill: NORMALIZATION_COLORS.postLine,
      },
      {
        id: "postMax",
        energy: hi,
        fill: NORMALIZATION_COLORS.postHandle,
        selectedFill: NORMALIZATION_COLORS.postLine,
      },
    );
  }

  return (
    <g pointerEvents="auto">
      {edges.map(({ id, energy, fill, selectedFill }) =>
        typeof energy === "number" && Number.isFinite(energy) ? (
          <PinnedAxisMarker
            key={id}
            energy={energy}
            xScale={xScale}
            dimensions={dimensions}
            plotSvgRef={plotSvgRef}
            isSelected={false}
            fill={fill}
            selectedFill={selectedFill}
            outline={outline}
            railColor={undefined}
            labelTop={undefined}
            hitPadX={22}
            onEnergyChange={makeHandler(id)}
          />
        ) : null,
      )}
    </g>
  );
}
