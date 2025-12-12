/**
 * Marquee selection component for zooming
 * Supports horizontal, vertical, and default (both) zoom modes
 */

import { useState, useCallback, useRef } from "react";
import type { ScaleLinear } from "d3-scale";
import type { PlotDimensions } from "../../core/types";
import { THEME_COLORS } from "../../core/constants";

export type ZoomMode = "horizontal" | "vertical" | "default";

type MarqueeZoomProps = {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  dimensions: PlotDimensions;
  isDark: boolean;
  zoomMode: ZoomMode;
  onZoom: (xDomain: [number, number], yDomain: [number, number]) => void;
  onCancel?: () => void;
};

export function MarqueeZoom({
  xScale,
  yScale,
  dimensions,
  isDark,
  zoomMode,
  onZoom,
  onCancel,
}: MarqueeZoomProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [currentPoint, setCurrentPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const plotRef = useRef<SVGRectElement>(null);

  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const left = dimensions.margins.left;
  const top = dimensions.margins.top;

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      // Activate marquee zoom on left mouse button (no Shift required in zoom mode)
      if (event.button !== 0) return;

      const svgRect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - svgRect.left - left;
      const y = event.clientY - svgRect.top - top;

      // Check if within plot bounds
      if (x >= 0 && x <= plotWidth && y >= 0 && y <= plotHeight) {
        event.preventDefault();
        event.stopPropagation();
        setIsSelecting(true);
        setStartPoint({ x, y });
        setCurrentPoint({ x, y });
      }
    },
    [left, top, plotWidth, plotHeight],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      if (!isSelecting || !startPoint) return;

      const svgRect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - svgRect.left - left;
      const y = event.clientY - svgRect.top - top;

      // Constrain to plot bounds
      const constrainedX = Math.max(0, Math.min(x, plotWidth));
      const constrainedY = Math.max(0, Math.min(y, plotHeight));

      setCurrentPoint({ x: constrainedX, y: constrainedY });
      event.stopPropagation();
    },
    [isSelecting, startPoint, left, top, plotWidth, plotHeight],
  );

  const handleMouseUp = useCallback(
    (event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }

      if (!isSelecting || !startPoint || !currentPoint) {
        setIsSelecting(false);
        setStartPoint(null);
        setCurrentPoint(null);
        return;
      }

      const minX = Math.min(startPoint.x, currentPoint.x);
      const maxX = Math.max(startPoint.x, currentPoint.x);
      const minY = Math.min(startPoint.y, currentPoint.y);
      const maxY = Math.max(startPoint.y, currentPoint.y);

      // Calculate selection width/height
      const width = maxX - minX;
      const height = maxY - minY;

      // Only zoom if selection is large enough (at least 5 pixels)
      if (width < 5 && height < 5) {
        setIsSelecting(false);
        setStartPoint(null);
        setCurrentPoint(null);
        onCancel?.();
        return;
      }

      // Convert pixel coordinates to data coordinates
      let xDomain: [number, number];
      let yDomain: [number, number];

      if (zoomMode === "horizontal" || zoomMode === "default") {
        const x0 = xScale.invert(minX);
        const x1 = xScale.invert(maxX);
        xDomain = [Math.min(x0, x1), Math.max(x0, x1)];
      } else {
        // Vertical only - keep full x domain
        const currentDomain = xScale.domain();
        xDomain = [currentDomain[0] ?? 0, currentDomain[1] ?? 1000];
      }

      if (zoomMode === "vertical" || zoomMode === "default") {
        const y0 = yScale.invert(minY);
        const y1 = yScale.invert(maxY);
        yDomain = [Math.min(y0, y1), Math.max(y0, y1)];
      } else {
        // Horizontal only - keep full y domain
        const currentDomain = yScale.domain();
        yDomain = [currentDomain[0] ?? 0, currentDomain[1] ?? 1];
      }

      onZoom(xDomain, yDomain);

      setIsSelecting(false);
      setStartPoint(null);
      setCurrentPoint(null);
    },
    [
      isSelecting,
      startPoint,
      currentPoint,
      zoomMode,
      xScale,
      yScale,
      onZoom,
      onCancel,
    ],
  );

  const handleMouseLeave = useCallback(
    (event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }
      if (isSelecting) {
        setIsSelecting(false);
        setStartPoint(null);
        setCurrentPoint(null);
        onCancel?.();
      }
    },
    [isSelecting, onCancel],
  );

  if (!isSelecting || !startPoint || !currentPoint) {
    return (
      <rect
        ref={plotRef}
        x={left}
        y={top}
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "crosshair", pointerEvents: "all" }}
      />
    );
  }

  const minX = Math.min(startPoint.x, currentPoint.x);
  const maxX = Math.max(startPoint.x, currentPoint.x);
  const minY = Math.min(startPoint.y, currentPoint.y);
  const maxY = Math.max(startPoint.y, currentPoint.y);
  const width = maxX - minX;
  const height = maxY - minY;

  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  return (
    <>
      {/* Invisible overlay for mouse events */}
      <rect
        ref={plotRef}
        x={left}
        y={top}
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "crosshair", pointerEvents: "all" }}
      />
      {/* Selection rectangle */}
      <rect
        x={left + minX}
        y={top + minY}
        width={width}
        height={height}
        fill={themeColors.hoverBg}
        fillOpacity={0.1}
        stroke={themeColors.text}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        style={{ pointerEvents: "none" }}
      />
    </>
  );
}
