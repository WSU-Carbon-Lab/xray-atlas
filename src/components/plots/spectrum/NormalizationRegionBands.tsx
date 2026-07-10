"use client";

import { useId, useMemo } from "react";
import { useTheme } from "next-themes";
import type { ScaleLinear } from "d3-scale";
import { NORMALIZATION_COLORS } from "../constants";
import type { NormalizationRegions } from "../types";
import { resolveNormalizationBandRect } from "./normalization-region-band-geometry";

export type NormalizationRegionBandsProps = {
  normalizationRegions: NormalizationRegions;
  xScale: ScaleLinear<number, number>;
  offsetX: number;
  offsetY: number;
  height: number;
  /** When set, band rectangles are clipped horizontally to this inner plot width. */
  plotInnerWidth?: number;
  showLabels?: boolean;
};

/**
 * Renders hatched pre-edge and post-edge normalization bands behind spectrum traces.
 *
 * Pre-edge uses forward diagonal hatching (blue); post-edge uses reverse diagonal hatching (emerald).
 * Bands are non-interactive (`pointer-events: none`) so normalization brushes and edge handles keep
 * receiving pointer events from sibling layers.
 */
export function NormalizationRegionBands({
  normalizationRegions,
  xScale,
  offsetX,
  offsetY,
  height,
  plotInnerWidth,
  showLabels = true,
}: NormalizationRegionBandsProps) {
  const patternUid = useId().replace(/:/g, "");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const preRect = useMemo(
    () =>
      normalizationRegions.pre
        ? resolveNormalizationBandRect(
            normalizationRegions.pre,
            xScale,
            offsetX,
            offsetY,
            height,
            plotInnerWidth,
          )
        : null,
    [height, normalizationRegions.pre, offsetX, offsetY, plotInnerWidth, xScale],
  );

  const postRect = useMemo(
    () =>
      normalizationRegions.post
        ? resolveNormalizationBandRect(
            normalizationRegions.post,
            xScale,
            offsetX,
            offsetY,
            height,
            plotInnerWidth,
          )
        : null,
    [height, normalizationRegions.post, offsetX, offsetY, plotInnerWidth, xScale],
  );

  if (!preRect && !postRect) {
    return null;
  }

  const prePatternId = `norm-pre-hatch-${patternUid}`;
  const postPatternId = `norm-post-hatch-${patternUid}`;
  const baseFillOpacity = isDark ? 0.28 : 0.2;
  const hatchOpacity = isDark ? 0.72 : 0.58;
  const edgeOpacity = isDark ? 0.55 : 0.45;
  const labelFill = isDark ? "rgba(248, 250, 252, 0.92)" : "rgba(15, 23, 42, 0.88)";

  return (
    <g pointerEvents="none" aria-hidden>
      <defs>
        <pattern
          id={prePatternId}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect
            width={10}
            height={10}
            fill={NORMALIZATION_COLORS.preFill}
            fillOpacity={baseFillOpacity}
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={10}
            stroke={NORMALIZATION_COLORS.preLine}
            strokeOpacity={hatchOpacity}
            strokeWidth={1.25}
          />
        </pattern>
        <pattern
          id={postPatternId}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <rect
            width={10}
            height={10}
            fill={NORMALIZATION_COLORS.postFill}
            fillOpacity={baseFillOpacity}
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={10}
            stroke={NORMALIZATION_COLORS.postLine}
            strokeOpacity={hatchOpacity}
            strokeWidth={1.25}
          />
        </pattern>
      </defs>

      {preRect ? (
        <g>
          <rect
            x={preRect.x}
            y={preRect.y}
            width={preRect.width}
            height={preRect.height}
            fill={`url(#${prePatternId})`}
            stroke={NORMALIZATION_COLORS.preLine}
            strokeOpacity={edgeOpacity}
            strokeWidth={1}
          />
          {showLabels && preRect.width >= 48 ? (
            <text
              x={preRect.x + 8}
              y={preRect.y + 16}
              fill={labelFill}
              fontSize={11}
              fontWeight={600}
              style={{ paintOrder: "stroke", stroke: "var(--surface)" }}
            >
              Pre-edge
            </text>
          ) : null}
        </g>
      ) : null}

      {postRect ? (
        <g>
          <rect
            x={postRect.x}
            y={postRect.y}
            width={postRect.width}
            height={postRect.height}
            fill={`url(#${postPatternId})`}
            stroke={NORMALIZATION_COLORS.postLine}
            strokeOpacity={edgeOpacity}
            strokeWidth={1}
          />
          {showLabels && postRect.width >= 52 ? (
            <text
              x={postRect.x + 8}
              y={postRect.y + 16}
              fill={labelFill}
              fontSize={11}
              fontWeight={600}
              style={{ paintOrder: "stroke", stroke: "var(--surface)" }}
            >
              Post-edge
            </text>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}
