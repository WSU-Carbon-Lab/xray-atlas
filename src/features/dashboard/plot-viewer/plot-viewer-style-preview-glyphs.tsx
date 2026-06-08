"use client";

import type { PlotViewerLineDash, PlotViewerMarkerSymbol } from "./plot-viewer-trace-styles";

const PREVIEW_WIDTH = 28;
const PREVIEW_HEIGHT = 12;
const MARKER_GLYPH_SIZE = 10;

function lineDashStrokeDasharray(lineDash: PlotViewerLineDash): string | undefined {
  switch (lineDash) {
    case "solid":
      return undefined;
    case "dash":
      return "5 3";
    case "dot":
      return "1.5 3";
    case "dashdot":
      return "5 2 1.5 2";
  }
}

export type PlotViewerLineStylePreviewProps = {
  lineDash: PlotViewerLineDash;
  color?: string;
  className?: string;
};

/**
 * Renders a compact horizontal SVG preview of a plot line dash pattern.
 */
export function PlotViewerLineStylePreview({
  lineDash,
  color = "currentColor",
  className,
}: PlotViewerLineStylePreviewProps) {
  const dasharray = lineDashStrokeDasharray(lineDash);
  return (
    <svg
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      className={className}
      aria-hidden
    >
      <line
        x1={2}
        y1={PREVIEW_HEIGHT / 2}
        x2={PREVIEW_WIDTH - 2}
        y2={PREVIEW_HEIGHT / 2}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={dasharray}
      />
    </svg>
  );
}

export type PlotViewerMarkerShapeGlyphProps = {
  symbol: PlotViewerMarkerSymbol;
  color?: string;
  size?: number;
  className?: string;
};

function markerPath(symbol: Exclude<PlotViewerMarkerSymbol, "none">): string {
  switch (symbol) {
    case "circle":
      return `M ${MARKER_GLYPH_SIZE / 2} 1 a ${MARKER_GLYPH_SIZE / 2 - 1} ${MARKER_GLYPH_SIZE / 2 - 1} 0 1 0 0.01 0`;
    case "square":
      return `M 1 1 h ${MARKER_GLYPH_SIZE - 2} v ${MARKER_GLYPH_SIZE - 2} h -${MARKER_GLYPH_SIZE - 2} z`;
    case "triangle":
      return `M ${MARKER_GLYPH_SIZE / 2} 1 L ${MARKER_GLYPH_SIZE - 1} ${MARKER_GLYPH_SIZE - 1} L 1 ${MARKER_GLYPH_SIZE - 1} z`;
    case "diamond":
      return `M ${MARKER_GLYPH_SIZE / 2} 1 L ${MARKER_GLYPH_SIZE - 1} ${MARKER_GLYPH_SIZE / 2} L ${MARKER_GLYPH_SIZE / 2} ${MARKER_GLYPH_SIZE - 1} L 1 ${MARKER_GLYPH_SIZE / 2} z`;
  }
}

/**
 * Renders a compact marker shape glyph aligned with plot legend swatches.
 */
export function PlotViewerMarkerShapeGlyph({
  symbol,
  color = "currentColor",
  size = MARKER_GLYPH_SIZE,
  className,
}: PlotViewerMarkerShapeGlyphProps) {
  if (symbol === "none") {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={className}
        aria-hidden
      >
        <line
          x1={2}
          y1={size - 2}
          x2={size - 2}
          y2={2}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.55}
        />
      </svg>
    );
  }
  const scale = size / MARKER_GLYPH_SIZE;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${MARKER_GLYPH_SIZE} ${MARKER_GLYPH_SIZE}`}
      className={className}
      aria-hidden
      style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "center" } : undefined}
    >
      <path d={markerPath(symbol)} fill={color} />
    </svg>
  );
}
