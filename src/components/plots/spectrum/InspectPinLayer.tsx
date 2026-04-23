"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import { Copy } from "lucide-react";
import type { PinnedInspectPoint, PlotDimensions, TraceData } from "../types";
import type { ChartScales } from "./types";
import type { ChartThemeColors } from "../config";
import { PEAK_SELECTION_ACCENT } from "../constants";
import { PinnedAxisMarker } from "./PinnedAxisMarker";
import {
  DraggablePlotPopover,
  type PopoverOffset,
} from "./DraggablePlotPopover";
import { getTraceColor, getTraceLabel, getValueAtEnergy } from "./utils";

export type InspectPinLayerSlot = "svg" | "overlay";

type PopoverOffsetMap = Record<string, PopoverOffset>;

type InspectPinRow = {
  label: string;
  color: string;
  value: number | null;
};

function defaultOffsetForIndex(index: number): PopoverOffset {
  const stagger = 14 * index;
  return { dx: 0, dy: 12 + stagger };
}

function formatEnergyEv(energy: number): string {
  return (Math.round(energy * 1000) / 1000).toFixed(3);
}

function formatTraceValue(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "\u2014";
  const abs = Math.abs(value);
  if (abs >= 1000 || (abs > 0 && abs < 0.001)) return value.toExponential(3);
  return value.toPrecision(4);
}

function copyToClipboard(text: string): void {
  if (typeof navigator === "undefined") return;
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
  }
}

function buildPinCsv(
  energy: number,
  rows: InspectPinRow[],
): string {
  const headers = ["energy_eV", ...rows.map((r) => r.label)];
  const values = [
    formatEnergyEv(energy),
    ...rows.map((r) =>
      r.value == null || !Number.isFinite(r.value) ? "" : String(r.value),
    ),
  ];
  return `${headers.join(",")}\n${values.join(",")}`;
}

/**
 * Renders inspect-pin visuals in either the SVG plot group or the HTML overlay
 * layer. A single component owns both sides so popover offsets, hover focus,
 * and pin ordering remain consistent between the two render passes.
 *
 * Parameters
 * ----------
 * slot : "svg" | "overlay"
 *     Selects which subtree to render in the current pass. SVG pass draws
 *     crosshairs + colored dots + the draggable rail marker; overlay pass
 *     draws the HTML popovers.
 * pins : PinnedInspectPoint[]
 *     List of active client-side pins.
 * selectedPinId : string | null
 *     Id of the focused pin used to elevate z-index and emphasize the rail.
 * visibleTraces : TraceData[]
 *     Spectra currently shown on the plot. Rows and crosshair dots are
 *     derived from these at render time so pins stay consistent with legend
 *     toggles and y-axis quantity switches.
 * scales : ChartScales
 *     Main plot scales used by both SVG and overlay positioning.
 * dimensions : PlotDimensions
 *     Main plot dimensions used by both SVG and overlay positioning.
 * themeColors : ChartThemeColors
 *     Provides crosshair / text defaults.
 * plotSvgRef : RefObject<SVGSVGElement | null>
 *     Used by the rail marker to translate pointer `clientX` to energy.
 * onSelectPin : (id: string | null) => void
 *     Invoked when a pin's marker or popover is pressed.
 * onRemovePin : (id: string) => void
 *     Invoked by the popover close button.
 * onUpdatePinEnergy : (id: string, energy: number) => void
 *     Invoked while the user drags a pin's rail marker.
 * overlayWidth, overlayHeight : number
 *     Dimensions of the HTML overlay; used for absolute positioning only.
 */
export function InspectPinLayer({
  slot,
  pins,
  selectedPinId,
  visibleTraces,
  scales,
  dimensions,
  themeColors,
  plotSvgRef,
  onSelectPin,
  onRemovePin,
  onUpdatePinEnergy,
  overlayWidth,
  overlayHeight,
}: {
  slot: InspectPinLayerSlot;
  pins: PinnedInspectPoint[];
  selectedPinId: string | null;
  visibleTraces: TraceData[];
  scales: ChartScales;
  dimensions: PlotDimensions;
  themeColors: ChartThemeColors;
  plotSvgRef: RefObject<SVGSVGElement | null>;
  onSelectPin: (id: string | null) => void;
  onRemovePin: (id: string) => void;
  onUpdatePinEnergy: (id: string, energy: number) => void;
  overlayWidth: number;
  overlayHeight: number;
}) {
  const [popoverOffsets, setPopoverOffsets] = useState<PopoverOffsetMap>({});
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [pinCollapsed, setPinCollapsed] = useState<Record<string, boolean>>({});

  const setOffsetForPin = useCallback(
    (pinId: string, next: PopoverOffset) => {
      setPopoverOffsets((prev) => ({ ...prev, [pinId]: next }));
    },
    [],
  );

  useEffect(() => {
    if (
      draggingPinId != null &&
      !pins.some((p) => p.id === draggingPinId)
    ) {
      setDraggingPinId(null);
    }
  }, [pins, draggingPinId]);

  const pinRowsById = useMemo(() => {
    const domain = scales.xScale.domain() as [number, number];
    const range = Math.abs((domain[1] ?? 0) - (domain[0] ?? 0));
    const threshold = Math.max(range * 0.02, 1e-9);
    const map = new Map<string, InspectPinRow[]>();
    for (const pin of pins) {
      const rows: InspectPinRow[] = visibleTraces.map((trace, index) => ({
        label: getTraceLabel(trace, index),
        color: getTraceColor(trace, themeColors.text),
        value: getValueAtEnergy(trace, pin.energy, threshold),
      }));
      map.set(pin.id, rows);
    }
    return map;
  }, [pins, scales.xScale, themeColors.text, visibleTraces]);

  if (pins.length === 0) return null;

  if (slot === "svg") {
    const plotHeight =
      dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
    const crosshairColor = themeColors.crosshair ?? themeColors.text;

    return (
      <g data-inspect-pin-layer style={{ pointerEvents: "none" }}>
        {pins.map((pin, index) => {
          const gripActive = draggingPinId === pin.id;
          const rows = pinRowsById.get(pin.id) ?? [];
          const xLocal = scales.xScale(pin.energy);
          return (
            <g key={pin.id}>
              <line
                x1={xLocal}
                y1={0}
                x2={xLocal}
                y2={plotHeight}
                stroke={gripActive ? PEAK_SELECTION_ACCENT : crosshairColor}
                strokeWidth={gripActive ? 1.5 : 1.25}
                strokeDasharray={gripActive ? undefined : "5,4"}
                opacity={gripActive ? 0.85 : 0.6}
                pointerEvents="none"
              />
              {rows.map((row, rowIndex) =>
                row.value == null ? null : (
                  <circle
                    key={`${pin.id}-dot-${rowIndex}`}
                    cx={xLocal}
                    cy={scales.yScale(row.value)}
                    r={5}
                    fill={row.color}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={1.5}
                    opacity={0.95}
                    pointerEvents="none"
                  />
                ),
              )}
              <PinnedAxisMarker
                energy={pin.energy}
                xScale={scales.xScale}
                dimensions={dimensions}
                plotSvgRef={plotSvgRef}
                isSelected={gripActive}
                fill={themeColors.legendBg}
                selectedFill={PEAK_SELECTION_ACCENT}
                outline={
                  gripActive ? PEAK_SELECTION_ACCENT : themeColors.textSecondary
                }
                railColor={undefined}
                labelTop={String(index + 1)}
                onEnergyChange={(energy) => onUpdatePinEnergy(pin.id, energy)}
                onPress={() => onSelectPin(pin.id)}
                onGripPointerActiveChange={(active) =>
                  setDraggingPinId(active ? pin.id : null)
                }
              />
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[18]"
      style={{ width: overlayWidth, height: overlayHeight }}
    >
      {pins.map((pin, index) => {
        const rows = pinRowsById.get(pin.id) ?? [];
        const xCss = dimensions.margins.left + scales.xScale(pin.energy);
        const yCss = dimensions.margins.top;
        const offset = popoverOffsets[pin.id] ?? defaultOffsetForIndex(index);
        const isSelected = selectedPinId === pin.id;
        const collapsed = pinCollapsed[pin.id] === true;
        return (
          <DraggablePlotPopover
            key={pin.id}
            anchorXCss={xCss}
            anchorYCss={yCss}
            offset={offset}
            onOffsetChange={(next) => setOffsetForPin(pin.id, next)}
            onFocus={() => onSelectPin(pin.id)}
            onClose={() => onRemovePin(pin.id)}
            collapsed={collapsed}
            onCollapsedChange={(next) =>
              setPinCollapsed((prev) => ({ ...prev, [pin.id]: next }))
            }
            zIndex={isSelected ? 26 : 24}
            title={
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--chart-grid-strong)_45%,transparent)] bg-[color-mix(in_oklab,var(--chart-background)_88%,transparent)] px-1 text-[9px] font-semibold tabular-nums text-[var(--chart-text-secondary)]">
                  {index + 1}
                </span>
                <span>Pin</span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--chart-text-secondary)]">
                  {formatEnergyEv(pin.energy)} eV
                </span>
              </span>
            }
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_oklab,var(--chart-grid-strong)_35%,transparent)] pb-1">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--chart-text-secondary)]">
                    Energy
                  </div>
                  <div className="font-mono text-[12px] font-semibold tabular-nums">
                    {formatEnergyEv(pin.energy)} eV
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <InlineCopyButton
                    label="Copy energy"
                    onCopy={() => copyToClipboard(formatEnergyEv(pin.energy))}
                  />
                  <button
                    type="button"
                    className="rounded border border-[color-mix(in_oklab,var(--chart-grid-strong)_45%,transparent)] bg-[color-mix(in_oklab,var(--chart-background)_82%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--chart-text)] hover:bg-[color-mix(in_oklab,var(--chart-grid-strong)_25%,transparent)]"
                    onClick={() =>
                      copyToClipboard(buildPinCsv(pin.energy, rows))
                    }
                    title="Copy all values as CSV"
                  >
                    Copy all
                  </button>
                </div>
              </div>
              <ul className="flex flex-col gap-0.5 text-[11px]">
                {rows.length === 0 ? (
                  <li className="italic text-[var(--chart-text-secondary)]">
                    No visible traces
                  </li>
                ) : (
                  rows.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[var(--chart-text)]">
                        {row.label}
                      </span>
                      <span className="font-mono tabular-nums text-[var(--chart-text)]">
                        {formatTraceValue(row.value)}
                      </span>
                      <InlineCopyButton
                        label={`Copy ${row.label}`}
                        disabled={row.value == null}
                        onCopy={() =>
                          copyToClipboard(
                            row.value == null ? "" : String(row.value),
                          )
                        }
                      />
                    </li>
                  ))
                )}
              </ul>
            </div>
          </DraggablePlotPopover>
        );
      })}
    </div>
  );
}

function InlineCopyButton({
  label,
  onCopy,
  disabled,
}: {
  label: string;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onCopy();
      }}
      className="rounded p-0.5 text-[var(--chart-text-secondary)] transition-colors hover:bg-[color-mix(in_oklab,var(--chart-grid-strong)_25%,transparent)] hover:text-[var(--chart-text)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Copy className="h-3 w-3" aria-hidden />
    </button>
  );
}
