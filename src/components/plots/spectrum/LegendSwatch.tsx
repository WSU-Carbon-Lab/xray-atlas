import type { CSSProperties } from "react";
import type { GraphStyle, TraceMarkerSymbol } from "../types";

export type LegendSwatchVariant = "solid" | "dash" | "band";
export type LegendMarkerShape = TraceMarkerSymbol;

export const LEGEND_SWATCH_WIDTH = 22;
const SWATCH_BOX_HEIGHT = 12;
const SWATCH_LINE_HEIGHT = 3;
const SWATCH_MARKER_SIZE = 10;

export function legendSwatchBoxStyle(contrastStroke?: string): CSSProperties {
  return {
    width: LEGEND_SWATCH_WIDTH,
    height: SWATCH_BOX_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: contrastStroke
      ? `inset 0 0 0 1px color-mix(in oklch, ${contrastStroke} 42%, transparent)`
      : undefined,
  };
}

function lineSwatchInner(
  color: string,
  variant: LegendSwatchVariant,
): CSSProperties {
  return {
    width: LEGEND_SWATCH_WIDTH,
    height: SWATCH_LINE_HEIGHT,
    borderRadius: 1,
    backgroundColor: variant === "solid" ? color : "transparent",
    borderTop: variant === "solid" ? undefined : `2px dashed ${color}`,
  };
}

function lineWithMarkerSwatchInner(
  color: string,
  variant: "solid" | "dash",
  markerShape: LegendMarkerShape,
): { container: CSSProperties; line: CSSProperties; marker: CSSProperties } {
  const markerSize =
    markerShape === "square" ? SWATCH_MARKER_SIZE - 1 : SWATCH_MARKER_SIZE;
  const markerRadius = markerShape === "circle" ? "50%" : 1;
  const lineStyle = lineSwatchInner(color, variant);
  return {
    container: {
      position: "relative",
      width: LEGEND_SWATCH_WIDTH,
      height: SWATCH_BOX_HEIGHT,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    line: {
      ...lineStyle,
      position: "absolute",
      left: 0,
      right: 0,
      top: "50%",
      transform: "translateY(-50%)",
    },
    marker: {
      position: "relative",
      zIndex: 1,
      width: markerSize,
      height: markerSize,
      backgroundColor: color,
      borderRadius: markerRadius,
      boxSizing: "border-box",
      flexShrink: 0,
    },
  };
}

function scatterSwatchInner(
  color: string,
  variant: LegendSwatchVariant,
  markerShape: LegendMarkerShape,
): CSSProperties {
  const borderRadius = markerShape === "circle" ? "50%" : 1;
  const filled: CSSProperties = {
    width: SWATCH_MARKER_SIZE,
    height: SWATCH_MARKER_SIZE,
    backgroundColor: color,
    borderRadius,
    boxSizing: "border-box",
  };
  if (variant === "solid") {
    return filled;
  }
  if (markerShape === "square") {
    return {
      ...filled,
      border: `1px dashed ${color}`,
    };
  }
  return filled;
}

function linkedAreaBandSwatchInner(
  color: string,
  topVariant: "solid" | "dash",
  bottomVariant: "solid" | "dash",
): { container: CSSProperties; topLine: CSSProperties; bottomLine: CSSProperties } {
  const bandHeight = SWATCH_BOX_HEIGHT - 2;
  const lineStyle = (variant: "solid" | "dash"): CSSProperties =>
    variant === "solid"
      ? { height: 2, backgroundColor: color, borderRadius: 1 }
      : {
          height: 0,
          borderTop: `2px dashed ${color}`,
          boxSizing: "border-box",
        };
  return {
    container: {
      width: LEGEND_SWATCH_WIDTH,
      height: bandHeight,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: color,
      opacity: 0.38,
      borderRadius: 2,
      padding: "1px 0",
      boxSizing: "border-box",
    },
    topLine: { ...lineStyle(topVariant), width: "100%", flexShrink: 0 },
    bottomLine: { ...lineStyle(bottomVariant), width: "100%", flexShrink: 0 },
  };
}

function areaSwatchInner(
  color: string,
  variant: LegendSwatchVariant,
): CSSProperties {
  const bandHeight = SWATCH_BOX_HEIGHT - 2;
  if (variant === "solid") {
    return {
      width: LEGEND_SWATCH_WIDTH,
      height: bandHeight,
      backgroundColor: color,
      opacity: 0.45,
      borderRadius: 2,
    };
  }
  return {
    width: LEGEND_SWATCH_WIDTH,
    height: bandHeight,
    backgroundColor: color,
    opacity: 0.22,
    borderRadius: 2,
    borderTop: `2px dashed ${color}`,
    boxSizing: "border-box",
  };
}

function swatchInnerStyle(
  color: string,
  variant: LegendSwatchVariant,
  graphStyle: GraphStyle,
  markerShape: LegendMarkerShape,
): CSSProperties | null {
  if (graphStyle === "area" && variant === "band") {
    return null;
  }
  switch (graphStyle) {
    case "scatter":
      return scatterSwatchInner(
        color,
        variant === "band" ? "solid" : variant,
        markerShape,
      );
    case "area":
      return areaSwatchInner(color, variant);
    default:
      return lineSwatchInner(color, variant === "band" ? "solid" : variant);
  }
}

export function LegendSwatch({
  color,
  variant,
  graphStyle = "line",
  markerShape = "circle",
  markerOnLine = false,
  bandLineVariants,
  contrastStroke,
}: {
  color: string;
  variant: LegendSwatchVariant;
  graphStyle?: GraphStyle;
  /** Scatter swatch glyph; linked optical legend uses circle (imaginary) and square (real). */
  markerShape?: LegendMarkerShape;
  /**
   * When true with `graphStyle="line"`, draws the line dash pattern and centers the marker glyph
   * on the segment (trace legend handles with decimated markers).
   */
  markerOnLine?: boolean;
  /** Top/bottom line styles for linked optical area band swatches (imaginary | real). */
  bandLineVariants?: {
    top: "solid" | "dash";
    bottom: "solid" | "dash";
  };
  /** Axis or foreground stroke for a subtle swatch keyline (light-mode contrast). */
  contrastStroke?: string;
}) {
  if (
    graphStyle === "line" &&
    markerOnLine &&
    variant !== "band"
  ) {
    const parts = lineWithMarkerSwatchInner(
      color,
      variant === "solid" ? "solid" : "dash",
      markerShape,
    );
    return (
      <span aria-hidden style={legendSwatchBoxStyle(contrastStroke)}>
        <span style={parts.container}>
          <span style={parts.line} />
          <span style={parts.marker} />
        </span>
      </span>
    );
  }

  const innerStyle = swatchInnerStyle(color, variant, graphStyle, markerShape);
  if (graphStyle === "area" && variant === "band" && bandLineVariants) {
    const parts = linkedAreaBandSwatchInner(
      color,
      bandLineVariants.top,
      bandLineVariants.bottom,
    );
    return (
      <span aria-hidden style={legendSwatchBoxStyle(contrastStroke)}>
        <span style={parts.container}>
          <span style={parts.topLine} />
          <span style={parts.bottomLine} />
        </span>
      </span>
    );
  }
  return (
    <span aria-hidden style={legendSwatchBoxStyle(contrastStroke)}>
      <span style={innerStyle ?? undefined} />
    </span>
  );
}
