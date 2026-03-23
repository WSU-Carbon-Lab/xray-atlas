import { useCallback, useEffect, useRef, useState } from "react";
import type { ScaleLinear } from "d3-scale";
import type { PlotDimensions, SpectrumSelection } from "../types";
import { THEME_COLORS } from "../constants";
import type { ChartThemeColors } from "../hooks/useChartTheme";
import { eventToPlotCoords } from "../utils/svgPlotPointer";

type NormalizationBrushProps = {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  dimensions: PlotDimensions;
  selectionTarget?: "pre" | "post" | null;
  onSelectionChange?: (selection: SpectrumSelection | null) => void;
  isDark?: boolean;
  themeColors?: ChartThemeColors;
};

export function NormalizationBrush({
  xScale,
  yScale,
  dimensions,
  selectionTarget,
  onSelectionChange,
  isDark = false,
  themeColors: themeColorsProp,
}: NormalizationBrushProps) {
  const themeColors =
    themeColorsProp ?? (isDark ? THEME_COLORS.dark : THEME_COLORS.light);

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const left = dimensions.margins.left;
  const top = dimensions.margins.top;

  const [marquee, setMarquee] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const marqueeRef = useRef<typeof marquee>(null);
  marqueeRef.current = marquee;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const setSvgRef = useCallback((node: SVGGElement | null) => {
    svgRef.current = node?.ownerSVGElement ?? null;
  }, []);

  const buildSelection = useCallback(
    (x0: number, x1: number): SpectrumSelection => {
      const px0 = Math.max(0, Math.min(plotWidth, Math.min(x0, x1)));
      const px1 = Math.max(0, Math.min(plotWidth, Math.max(x0, x1)));
      const energyMin = Math.min(xScale.invert(px0), xScale.invert(px1));
      const energyMax = Math.max(xScale.invert(px0), xScale.invert(px1));
      const yBottom = yScale.invert(plotHeight);
      const yTop = yScale.invert(0);
      const absorptionMin = Math.min(yBottom, yTop);
      const absorptionMax = Math.max(yBottom, yTop);
      const domain = xScale.domain() as [number, number];
      const energyRange = (domain[1] ?? 0) - (domain[0] ?? 0);
      const selectionWidth = energyMax - energyMin;
      const estimatedPoints =
        energyRange > 0
          ? Math.ceil((selectionWidth / energyRange) * 100)
          : 0;
      return {
        energyMin,
        energyMax,
        absorptionMin,
        absorptionMax,
        pointCount: estimatedPoints,
        geometryKeys: [],
      };
    },
    [plotWidth, plotHeight, xScale, yScale],
  );

  useEffect(() => {
    if (!marquee) return;
    const svg = svgRef.current;
    if (!svg) return;

    const handlePointerMove = (e: PointerEvent) => {
      const pt = eventToPlotCoords(e, svg, left, top);
      if (!pt) return;
      const x = Math.max(0, Math.min(plotWidth, pt.x));
      const y = Math.max(0, Math.min(plotHeight, pt.y));
      setMarquee((prev) =>
        prev ? { ...prev, end: { x, y } } : null,
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      const current = marqueeRef.current;
      if (!current) return;
      const pt = eventToPlotCoords(e, svg, left, top);
      const endX = pt
        ? Math.max(0, Math.min(plotWidth, pt.x))
        : current.end.x;
      const x0 = Math.min(current.start.x, endX);
      const x1 = Math.max(current.start.x, endX);
      if (x1 - x0 >= 2) {
        onSelectionChange?.(buildSelection(x0, x1));
      }
      setMarquee(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { capture: true });
    window.addEventListener("pointerup", handlePointerUp, { capture: true });
    window.addEventListener("pointercancel", handlePointerUp, { capture: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, {
        capture: true,
      });
      window.removeEventListener("pointerup", handlePointerUp, { capture: true });
      window.removeEventListener("pointercancel", handlePointerUp, {
        capture: true,
      });
    };
  }, [
    marquee,
    left,
    top,
    plotWidth,
    plotHeight,
    onSelectionChange,
    buildSelection,
  ]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = eventToPlotCoords(event.nativeEvent, svg, left, top);
      if (!pt) return;
      const x = Math.max(0, Math.min(plotWidth, pt.x));
      setMarquee({
        start: { x, y: 0 },
        end: { x, y: plotHeight },
      });
    },
    [left, top, plotWidth, plotHeight],
  );

  const selectionStyle = {
    fill: themeColors.hoverBg,
    fillOpacity: 0.15,
    stroke: themeColors.text,
    strokeWidth: 2,
    strokeDasharray: "4 4",
  } as const;

  if (!selectionTarget || !onSelectionChange) return null;

  return (
    <g ref={setSvgRef} transform={`translate(${left}, ${top})`}>
      <rect
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        style={{
          cursor: selectionTarget === "pre" ? "w-resize" : "e-resize",
        }}
        onPointerDown={handlePointerDown}
      />
      {marquee && (
        <rect
          x={Math.min(marquee.start.x, marquee.end.x)}
          y={0}
          width={Math.abs(marquee.end.x - marquee.start.x)}
          height={plotHeight}
          style={selectionStyle}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
