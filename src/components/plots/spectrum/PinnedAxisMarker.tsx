"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PlotDimensions } from "../types";
import type { ChartScales } from "./types";

/**
 * Reusable SVG rail marker anchored to a fixed x-axis energy with an optional
 * draggable grip. Pointer drags map `clientX` back to an `energy` value through
 * the x-scale and are clamped to the plot drawing area. Exposes two handles —
 * one at the top of the rail and one at the bottom when the plot is tall
 * enough — so the marker remains reachable independently of where the data
 * curve happens to pass the crosshair.
 *
 * The marker is the shared axis grip used by both persisted peaks and
 * client-side inspect pins; peaks and pins configure it via props such as
 * `fill`, `outline`, `label`, and `onEnergyChange`.
 *
 * Parameters
 * ----------
 * energy : number
 *     Axis coordinate the marker snaps to.
 * xScale : ScaleLinear<number, number>
 *     Maps energy to local (left-margin-relative) pixel space.
 * dimensions : PlotDimensions
 *     Used to compute the rail height and the horizontal drag clamp.
 * plotSvgRef : RefObject<SVGSVGElement | null>
 *     Root plot SVG used to translate `PointerEvent.clientX` to plot space.
 * isSelected : boolean
 *     When true, the pill handles render in `selectedFill`/thicker stroke.
 * onEnergyChange : ((energy: number) => void) | undefined
 *     When defined, pointer-drag on a handle reports the new energy rounded
 *     to 0.01 eV. When undefined, the marker is not draggable.
 * onPress : (() => void) | undefined
 *     Optional callback for click-without-drag on a handle (used to select
 *     a pin when tapping its rail grip).
 * fill : string
 *     Base pill color when unselected.
 * selectedFill : string
 *     Pill color when `isSelected` is true.
 * outline : string
 *     Stroke color on both states.
 * railColor : string | undefined
 *     When set, draws a thin vertical rail line behind the pills in this
 *     color; otherwise no rail line is drawn.
 * labelTop : string | undefined
 *     Optional tiny label rendered inside the top pill (e.g. "1" for pin
 *     ordinal numbers). Truncated visually to one character.
 * hitPadX : number
 *     Half-width of the transparent pointer-hit rect around each handle.
 * onGripPointerActiveChange : ((active: boolean) => void) | undefined
 *     Fires true when the user presses a handle and false on release. Inspect
 *     pins use this to show accent styling only while the grip is held; peaks
 *     omit it and rely on `isSelected` alone.
 */
export function PinnedAxisMarker({
  energy,
  xScale,
  dimensions,
  plotSvgRef,
  isSelected,
  onEnergyChange,
  onPress,
  onGripPointerActiveChange,
  fill,
  selectedFill,
  outline,
  railColor,
  labelTop,
  hitPadX = 24,
}: {
  energy: number;
  xScale: ChartScales["xScale"];
  dimensions: PlotDimensions;
  plotSvgRef: RefObject<SVGSVGElement | null>;
  isSelected: boolean;
  onEnergyChange?: (energy: number) => void;
  onPress?: () => void;
  onGripPointerActiveChange?: (active: boolean) => void;
  fill: string;
  selectedFill: string;
  outline: string;
  railColor?: string;
  labelTop?: string;
  hitPadX?: number;
}) {
  const xPos = xScale(energy);
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const railInset = 11;
  const topCenterY = railInset;
  const bottomCenterY = Math.max(railInset, plotHeight - railInset);
  const pillW = isSelected ? 24 : 20;
  const pillH = 14;
  const hitH = 32;
  const dualHandles = bottomCenterY - topCenterY >= hitH - 2;

  const [isDragging, setIsDragging] = useState(false);
  const draggedRef = useRef(false);
  const left = dimensions.margins.left;

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!onEnergyChange) return;
      const svg = plotSvgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const adjustedX = clientX - left;
      const clampedX = Math.max(0, Math.min(plotWidth, adjustedX));
      const nextEnergy = xScale.invert(clampedX);
      const rounded = Math.round(nextEnergy * 100) / 100;
      if (Math.abs(rounded - energy) >= 0.005) {
        draggedRef.current = true;
      }
      onEnergyChange(rounded);
    },
    [energy, left, onEnergyChange, plotSvgRef, plotWidth, xScale],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    onGripPointerActiveChange?.(false);
    if (!draggedRef.current) onPress?.();
    draggedRef.current = false;
  }, [onPress, onGripPointerActiveChange]);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (!onEnergyChange && !onPress) return;
    e.preventDefault();
    e.stopPropagation();
    draggedRef.current = false;
    onGripPointerActiveChange?.(true);
    setIsDragging(true);
  };

  const stopPlotClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  const resolvedFill = isSelected ? selectedFill : fill;
  const cursor = onEnergyChange
    ? isDragging
      ? "grabbing"
      : "grab"
    : onPress
      ? "pointer"
      : "default";

  const handlePair = (centerY: number, key: string, showLabel: boolean) => {
    const hitTop = centerY - hitH / 2;
    const label = showLabel && labelTop ? labelTop.slice(0, 1) : null;
    return (
      <g key={key}>
        <rect
          x={xPos - hitPadX}
          y={hitTop}
          width={hitPadX * 2}
          height={hitH}
          fill="transparent"
          cursor={cursor}
          onPointerDown={handlePointerDown}
          onClick={stopPlotClick}
          style={{ touchAction: "none" }}
        />
        <rect
          x={xPos - pillW / 2}
          y={centerY - pillH / 2}
          width={pillW}
          height={pillH}
          rx={pillH / 2}
          fill={resolvedFill}
          stroke={outline}
          strokeWidth={isSelected ? 2 : 1.5}
          opacity={isDragging ? 0.92 : 1}
          pointerEvents="none"
        />
        {label ? (
          <text
            x={xPos}
            y={centerY + 3}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill={outline}
            pointerEvents="none"
            style={{ userSelect: "none" }}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <g style={{ pointerEvents: "all" }}>
      {railColor ? (
        <line
          x1={xPos}
          y1={topCenterY}
          x2={xPos}
          y2={bottomCenterY}
          stroke={railColor}
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.45}
          pointerEvents="none"
        />
      ) : null}
      {handlePair(topCenterY, "top", true)}
      {dualHandles ? handlePair(bottomCenterY, "bottom", false) : null}
    </g>
  );
}
