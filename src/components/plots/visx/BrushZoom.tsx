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

type MarqueePoint = { x: number; y: number };

type BrushZoomProps = {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  dimensions: PlotDimensions;
  isDark: boolean;
  themeColors?: ChartThemeColors;
  zoomMode: ZoomMode;
  onZoom: (xDomain: [number, number], yDomain: [number, number]) => void;
  onReset?: () => void;
  /**
   * When true, horizontal marquee zoom on the plot interior is suppressed so clicks
   * reach the plot below (inspect pins, tooltips, etc.). Vertical absorption zoom
   * remains available via the y-axis gutter or Shift+drag when
   * `enableVerticalMarqueeWithShift` is set.
   */
  allowPlotInteractionsBelow?: boolean;
  /**
   * When true, holding Shift while dragging uses a vertical marquee for the y-axis
   * even when `zoomMode` is horizontal.
   */
  enableVerticalMarqueeWithShift?: boolean;
  /**
   * Width of the left y-axis margin (pixels) where drag always performs vertical zoom
   * without holding Shift.
   */
  yAxisGutterWidth?: number;
};

function resolveActiveZoomMode(
  baseMode: ZoomMode,
  shiftKey: boolean,
  enableVerticalMarqueeWithShift: boolean,
): ZoomMode {
  if (enableVerticalMarqueeWithShift && shiftKey) {
    return "vertical";
  }
  return baseMode;
}

export function BrushZoom({
  xScale,
  yScale,
  dimensions,
  isDark,
  themeColors: themeColorsProp,
  zoomMode,
  onZoom,
  onReset: _onReset,
  allowPlotInteractionsBelow = false,
  enableVerticalMarqueeWithShift = false,
  yAxisGutterWidth = 0,
}: BrushZoomProps) {
  const themeColors = themeColorsProp ?? (isDark ? THEME_COLORS.dark : THEME_COLORS.light);

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const left = dimensions.margins.left;
  const top = dimensions.margins.top;

  const [shiftKeyHeld, setShiftKeyHeld] = useState(false);

  useEffect(() => {
    if (!enableVerticalMarqueeWithShift || !allowPlotInteractionsBelow) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftKeyHeld(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftKeyHeld(false);
      }
    };
    const onBlur = () => {
      setShiftKeyHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [allowPlotInteractionsBelow, enableVerticalMarqueeWithShift]);

  const [marquee, setMarquee] = useState<{
    start: MarqueePoint;
    end: MarqueePoint;
    mode: ZoomMode;
  } | null>(null);
  const marqueeRef = useRef<typeof marquee>(null);
  marqueeRef.current = marquee;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const setSvgRef = useCallback((node: SVGGElement | null) => {
    svgRef.current = node?.ownerSVGElement ?? null;
  }, []);

  const commitZoom = useCallback(
    (
      extent: { x0: number; x1: number; y0: number; y1: number },
      mode: ZoomMode,
    ) => {
      const currentX = xScale.domain() as [number, number];
      const currentY = yScale.domain() as [number, number];
      let xDomain: [number, number] = [currentX[0] ?? 0, currentX[1] ?? 1000];
      let yDomain: [number, number] = [currentY[0] ?? 0, currentY[1] ?? 1];

      if (mode === "horizontal" || mode === "default") {
        const xMin = Math.min(extent.x0, extent.x1);
        const xMax = Math.max(extent.x0, extent.x1);
        const span = xMax - xMin;
        if (span >= 1e-6) {
          xDomain = [xMin, xMax];
        }
      }
      if (mode === "vertical" || mode === "default") {
        const yMin = Math.min(extent.y0, extent.y1);
        const yMax = Math.max(extent.y0, extent.y1);
        const span = yMax - yMin;
        if (span >= 1e-12) {
          yDomain = [yMin, yMax];
        }
      }
      onZoom(xDomain, yDomain);
    },
    [xScale, yScale, onZoom],
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
      setMarquee((prev) => {
        if (!prev) return null;
        if (prev.mode === "vertical") {
          return { ...prev, end: { ...prev.end, y } };
        }
        if (prev.mode === "horizontal") {
          return { ...prev, end: { ...prev.end, x } };
        }
        return { ...prev, end: { x, y } };
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const current = marqueeRef.current;
      if (!current) return;
      const pt = eventToPlotCoords(e, svg, left, top);
      const endX = pt
        ? Math.max(0, Math.min(plotWidth, pt.x))
        : current.end.x;
      const endY = pt
        ? Math.max(0, Math.min(plotHeight, pt.y))
        : current.end.y;

      if (current.mode === "vertical") {
        const y0 = Math.min(current.start.y, endY);
        const y1 = Math.max(current.start.y, endY);
        if (y1 - y0 >= 2) {
          commitZoom(
            {
              x0: xScale.invert(0),
              x1: xScale.invert(plotWidth),
              y0: yScale.invert(y1),
              y1: yScale.invert(y0),
            },
            current.mode,
          );
        }
      } else if (current.mode === "horizontal") {
        const x0 = Math.min(current.start.x, endX);
        const x1 = Math.max(current.start.x, endX);
        if (x1 - x0 >= 2) {
          commitZoom(
            {
              x0: xScale.invert(x0),
              x1: xScale.invert(x1),
              y0: yScale.invert(plotHeight),
              y1: yScale.invert(0),
            },
            current.mode,
          );
        }
      } else {
        const x0 = Math.min(current.start.x, endX);
        const x1 = Math.max(current.start.x, endX);
        const y0 = Math.min(current.start.y, endY);
        const y1 = Math.max(current.start.y, endY);
        if (x1 - x0 >= 2 && y1 - y0 >= 2) {
          commitZoom(
            {
              x0: xScale.invert(x0),
              x1: xScale.invert(x1),
              y0: yScale.invert(y1),
              y1: yScale.invert(y0),
            },
            current.mode,
          );
        }
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
  }, [
    marquee,
    left,
    top,
    plotWidth,
    plotHeight,
    xScale,
    yScale,
    commitZoom,
  ]);

  const beginMarquee = useCallback(
    (x: number, y: number, mode: ZoomMode) => {
      if (mode === "vertical") {
        setMarquee({
          start: { x: 0, y },
          end: { x: plotWidth, y },
          mode,
        });
        return;
      }
      if (mode === "horizontal") {
        setMarquee({
          start: { x, y: 0 },
          end: { x, y: plotHeight },
          mode,
        });
        return;
      }
      setMarquee({
        start: { x, y },
        end: { x, y },
        mode,
      });
    },
    [plotWidth, plotHeight],
  );

  const handlePlotPointerDown = useCallback(
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
      const y = Math.max(0, Math.min(plotHeight, pt.y));
      const mode = resolveActiveZoomMode(
        zoomMode,
        event.shiftKey,
        enableVerticalMarqueeWithShift,
      );
      if (
        allowPlotInteractionsBelow &&
        mode === "horizontal"
      ) {
        return;
      }
      beginMarquee(x, y, mode);
    },
    [
      left,
      top,
      plotWidth,
      plotHeight,
      zoomMode,
      enableVerticalMarqueeWithShift,
      allowPlotInteractionsBelow,
      beginMarquee,
    ],
  );

  const handleYGutterPointerDown = useCallback(
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
      const y = Math.max(0, Math.min(plotHeight, pt.y));
      beginMarquee(0, y, "vertical");
    },
    [left, top, plotHeight, beginMarquee],
  );

  const showYGutter =
    enableVerticalMarqueeWithShift && yAxisGutterWidth > 0;
  const mainPlotPointerEvents =
    allowPlotInteractionsBelow && !shiftKeyHeld ? "none" : "auto";
  const mainPlotCursor =
    allowPlotInteractionsBelow && !shiftKeyHeld
      ? "default"
      : shiftKeyHeld && enableVerticalMarqueeWithShift
        ? "ns-resize"
        : "crosshair";

  const selectionStyle = {
    fill: themeColors.hoverBg,
    fillOpacity: 0.15,
    stroke: themeColors.text,
    strokeWidth: 2,
    strokeDasharray: "4 4",
  };

  const selectionRect = marquee
    ? marquee.mode === "vertical"
      ? {
          x: 0,
          y: Math.min(marquee.start.y, marquee.end.y),
          width: plotWidth,
          height: Math.abs(marquee.end.y - marquee.start.y),
        }
      : marquee.mode === "horizontal"
        ? {
            x: Math.min(marquee.start.x, marquee.end.x),
            y: 0,
            width: Math.abs(marquee.end.x - marquee.start.x),
            height: plotHeight,
          }
        : {
            x: Math.min(marquee.start.x, marquee.end.x),
            y: Math.min(marquee.start.y, marquee.end.y),
            width: Math.abs(marquee.end.x - marquee.start.x),
            height: Math.abs(marquee.end.y - marquee.start.y),
          }
    : null;

  return (
    <g ref={setSvgRef} transform={`translate(${left}, ${top})`}>
      {showYGutter ? (
        <rect
          x={-yAxisGutterWidth}
          y={0}
          width={yAxisGutterWidth}
          height={plotHeight}
          fill="transparent"
          style={{ cursor: "ns-resize", pointerEvents: "auto" }}
          onPointerDown={handleYGutterPointerDown}
          aria-hidden
        />
      ) : null}
      <rect
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        style={{
          cursor: mainPlotCursor,
          pointerEvents: mainPlotPointerEvents,
        }}
        onPointerDown={
          mainPlotPointerEvents === "auto" ? handlePlotPointerDown : undefined
        }
      />
      {selectionRect ? (
        <rect
          x={selectionRect.x}
          y={selectionRect.y}
          width={selectionRect.width}
          height={selectionRect.height}
          style={selectionStyle}
          pointerEvents="none"
        />
      ) : null}
    </g>
  );
}
