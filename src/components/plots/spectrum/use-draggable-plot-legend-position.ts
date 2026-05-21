"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { eventToPlotCoords } from "../utils/svgPlotPointer";

export type PlotLegendPosition = { x: number; y: number };

type DragSession = {
  startPlotX: number;
  startPlotY: number;
  originX: number;
  originY: number;
};

/**
 * Manages draggable in-plot legend position in plot-inner coordinates (0..plotWidth),
 * clamped inside the plot area. Uses pointer capture and window pointer listeners so
 * drag continues outside the legend and does not rely on mouse events from SVG foreignObject.
 */
export function useDraggablePlotLegendPosition(args: {
  plotWidth: number;
  plotHeight: number;
  boxHeight: number;
  legendWidth: number;
  defaultX: number;
  defaultY: number;
  plotSvgRef: RefObject<SVGSVGElement | null>;
  plotMarginLeft: number;
  plotMarginTop: number;
  positionResetKey?: string | number;
  inset?: number;
}) {
  const inset = args.inset ?? 12;
  const {
    plotWidth,
    plotHeight,
    boxHeight,
    legendWidth,
    defaultX,
    defaultY,
    plotSvgRef,
    plotMarginLeft,
    plotMarginTop,
    positionResetKey,
  } = args;

  const [position, setPosition] = useState<PlotLegendPosition>({
    x: defaultX,
    y: defaultY,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragSessionRef = useRef<DragSession | null>(null);

  const clampPosition = useCallback(
    (x: number, y: number): PlotLegendPosition => {
      const maxX = Math.max(0, plotWidth - legendWidth - inset);
      const maxY = Math.max(0, plotHeight - boxHeight - inset);
      return {
        x: Math.max(inset, Math.min(x, maxX)),
        y: Math.max(inset, Math.min(y, maxY)),
      };
    },
    [plotWidth, plotHeight, boxHeight, legendWidth, inset],
  );

  const plotPointFromClient = useCallback(
    (event: Pick<PointerEvent, "clientX" | "clientY">) => {
      const svg = plotSvgRef.current;
      if (!svg) return null;
      return eventToPlotCoords(event, svg, plotMarginLeft, plotMarginTop);
    },
    [plotSvgRef, plotMarginLeft, plotMarginTop],
  );

  const applyDragMove = useCallback(
    (event: Pick<PointerEvent, "clientX" | "clientY">) => {
      const session = dragSessionRef.current;
      if (!session) return;
      const pt = plotPointFromClient(event);
      if (!pt) return;
      setPosition(
        clampPosition(
          session.originX + (pt.x - session.startPlotX),
          session.originY + (pt.y - session.startPlotY),
        ),
      );
    },
    [plotPointFromClient, clampPosition],
  );

  const endDrag = useCallback(() => {
    dragSessionRef.current = null;
    setIsDragging(false);
  }, []);

  const handleContainerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-legend-toggle="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      const pt = plotPointFromClient(event.nativeEvent);
      if (!pt) return;
      dragSessionRef.current = {
        startPlotX: pt.x,
        startPlotY: pt.y,
        originX: position.x,
        originY: position.y,
      };
      setIsDragging(true);
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    },
    [plotPointFromClient, position.x, position.y],
  );

  const handleWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragSessionRef.current) return;
      event.preventDefault();
      applyDragMove(event);
    },
    [applyDragMove],
  );

  const handleWindowPointerUp = useCallback(() => {
    if (!dragSessionRef.current) return;
    endDrag();
  }, [endDrag]);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove", handleWindowPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [isDragging, handleWindowPointerMove, handleWindowPointerUp]);

  useEffect(() => {
    setPosition((prev) => clampPosition(prev.x, prev.y));
  }, [plotWidth, plotHeight, boxHeight, legendWidth, clampPosition]);

  useEffect(() => {
    if (positionResetKey === undefined) return;
    setPosition({ x: defaultX, y: defaultY });
  }, [positionResetKey, defaultX, defaultY]);

  const handleContainerPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragSessionRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      applyDragMove(event.nativeEvent);
    },
    [applyDragMove],
  );

  const handleContainerPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragSessionRef.current) return;
      event.stopPropagation();
      (event.currentTarget as HTMLElement).releasePointerCapture?.(
        event.pointerId,
      );
      endDrag();
    },
    [endDrag],
  );

  return {
    position,
    isDragging,
    handleContainerPointerDown,
    handleContainerPointerMove,
    handleContainerPointerUp,
    handleContainerPointerCancel: handleContainerPointerUp,
  };
}
