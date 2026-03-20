/**
 * Custom marquee zoom: user drags a selection rect, zoom is applied on pointer release.
 * Uses window pointerup so release always triggers zoom regardless of pointer position.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScaleLinear } from "d3-scale";
import type { PlotDimensions } from "../types";
import { THEME_COLORS } from "../constants";
import type { ChartThemeColors } from "../hooks/useChartTheme";
import { eventToPlotCoords } from "../utils/svgPlotPointer";

export type ZoomMode = "horizontal" | "vertical" | "default";

type BrushZoomProps = {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  dimensions: PlotDimensions;
  isDark: boolean;
  themeColors?: ChartThemeColors;
  zoomMode: ZoomMode;
  onZoom: (xDomain: [number, number], yDomain: [number, number]) => void;
  onReset?: () => void;
};

export function BrushZoom({
  xScale,
  yScale,
  dimensions,
  isDark,
  themeColors: themeColorsProp,
  zoomMode,
  onZoom,
  onReset,
}: BrushZoomProps) {
  const themeColors = themeColorsProp ?? (isDark ? THEME_COLORS.dark : THEME_COLORS.light);

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

  const commitZoom = useCallback(
    (extent: { x0: number; x1: number; y0: number; y1: number }) => {
      const currentX = xScale.domain() as [number, number];
      const currentY = yScale.domain() as [number, number];
      let xDomain: [number, number];
      const yDomain: [number, number] = [currentY[0] ?? 0, currentY[1] ?? 1];
      if (zoomMode === "horizontal" || zoomMode === "default") {
        const xMin = Math.min(extent.x0, extent.x1);
        const xMax = Math.max(extent.x0, extent.x1);
        const span = xMax - xMin;
        if (span < 1e-6) return;
        xDomain = [xMin, xMax];
      } else {
        xDomain = [currentX[0] ?? 0, currentX[1] ?? 1000];
      }
      onZoom(xDomain, yDomain);
    },
    [zoomMode, xScale, yScale, onZoom],
  );

  useEffect(() => {
    if (!marquee) return;
    const svg = svgRef.current;
    if (!svg) return;

    const handlePointerMove = (e: PointerEvent) => {
      const pt = eventToPlotCoords(e, svg, left, top);
      if (!pt) return;
      const x = Math.max(0, Math.min(plotWidth, pt.x));
      setMarquee((prev) =>
        prev ? { ...prev, end: { ...prev.end, x } } : null,
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
        const extent = {
          x0: xScale.invert(x0),
          x1: xScale.invert(x1),
          y0: 0,
          y1: plotHeight,
        };
        commitZoom(extent);
      }
      setMarquee(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { capture: true });
    window.addEventListener("pointerup", handlePointerUp, { capture: true });
    window.addEventListener("pointercancel", handlePointerUp, { capture: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, { capture: true });
      window.removeEventListener("pointerup", handlePointerUp, { capture: true });
      window.removeEventListener("pointercancel", handlePointerUp, { capture: true });
    };
  }, [marquee, left, top, plotWidth, plotHeight, xScale, yScale, commitZoom]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = eventToPlotCoords(
        event.nativeEvent,
        svg,
        left,
        top,
      );
      if (!pt) return;
      const x = Math.max(0, Math.min(plotWidth, pt.x));
      setMarquee({ start: { x, y: 0 }, end: { x, y: plotHeight } });
    },
    [left, top, plotWidth, plotHeight],
  );

  const selectionStyle = {
    fill: themeColors.hoverBg,
    fillOpacity: 0.15,
    stroke: themeColors.text,
    strokeWidth: 2,
    strokeDasharray: "4 4",
  };

  return (
    <g ref={setSvgRef} transform={`translate(${left}, ${top})`}>
      <rect
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        style={{ cursor: "crosshair" }}
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
