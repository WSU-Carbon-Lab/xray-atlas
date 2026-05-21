"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { Copy } from "lucide-react";
import type { PinnedInspectPoint, PlotDimensions, TraceData } from "../types";
import type { SpectrumYAxisQuantity } from "../types";
import type { ChartScales } from "./types";
import type { ChartThemeColors } from "../config";
import { PEAK_SELECTION_ACCENT } from "../constants";
import { PinnedAxisMarker } from "./PinnedAxisMarker";
import {
  DraggablePlotPopover,
  type PopoverOffset,
} from "./DraggablePlotPopover";
import { getTraceColor, getValueAtEnergy } from "./utils";
import {
  buildInspectPinTraceDisplays,
  inspectPinAngleColumnTitle,
  inspectPinPreferTableLayout,
  type InspectPinDisplayContext,
  type InspectPinTraceDisplay,
} from "./inspect-pin-trace-display";

export type InspectPinLayerSlot = "svg" | "overlay";

type PopoverOffsetMap = Record<string, PopoverOffset>;

type InspectPinRow = {
  readonly display: InspectPinTraceDisplay;
  readonly color: string;
  readonly value: number | null;
};

function defaultOffsetForIndex(index: number): PopoverOffset {
  const stagger = 14 * index;
  return { dx: 0, dy: 12 + stagger };
}

function formatEnergyEv(energy: number): string {
  return (Math.round(energy * 1000) / 1000).toFixed(3);
}

/** Raw plotted y; axis may use a display offset (e.g. Re(ε) − 1 on the axis only). */
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
  const headers = ["energy_eV", ...rows.map((r) => r.display.csvLabel)];
  const values = [
    formatEnergyEv(energy),
    ...rows.map((r) =>
      r.value == null || !Number.isFinite(r.value) ? "" : String(r.value),
    ),
  ];
  return `${headers.join(",")}\n${values.join(",")}`;
}

function collapseUniformBareAtomBetaPinRows(rows: InspectPinRow[]): InspectPinRow[] {
  const bareRows = rows.filter((r) => r.display.isBareAtomBeta);
  if (bareRows.length <= 1) {
    return rows;
  }
  const vals = bareRows.map((r) => r.value);
  if (!vals.every((v) => v != null && Number.isFinite(v))) {
    return rows;
  }
  const nums = vals as number[];
  const minV = Math.min(...nums);
  const maxV = Math.max(...nums);
  const span = Math.max(Math.abs(minV), Math.abs(maxV), 1e-12);
  if (maxV - minV > Math.max(1e-12, span * 1e-9)) {
    return rows;
  }
  const collapsed: InspectPinRow = {
    display: {
      ...bareRows[0]!.display,
      listLabel: "Bare atom beta",
      csvLabel: "bare_atom_beta",
    },
    color: bareRows[0]!.color,
    value: nums[0]!,
  };
  let inserted = false;
  const out: InspectPinRow[] = [];
  for (const r of rows) {
    if (r.display.isBareAtomBeta) {
      if (!inserted) {
        out.push(collapsed);
        inserted = true;
      }
    } else {
      out.push(r);
    }
  }
  return out;
}

function pinSwatchStyle(
  color: string,
  markerSymbol: InspectPinTraceDisplay["markerSymbol"],
): CSSProperties {
  const size = 10;
  return {
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: markerSymbol === "circle" ? "50%" : 1,
    flexShrink: 0,
    boxSizing: "border-box",
  };
}

/**
 * Renders inspect-pin visuals in either the SVG plot group or the HTML overlay
 * layer. A single component owns both sides so popover offsets, hover focus,
 * and pin ordering remain consistent between the two render passes.
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
  yAxisQuantity,
  showThetaData = false,
  showPhiData = false,
  linkedImaginaryGlyph,
  linkedRealGlyph,
  suppressPinStem = false,
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
  yAxisQuantity?: SpectrumYAxisQuantity;
  showThetaData?: boolean;
  showPhiData?: boolean;
  linkedImaginaryGlyph?: string;
  linkedRealGlyph?: string;
  suppressPinStem?: boolean;
}) {
  const [popoverOffsets, setPopoverOffsets] = useState<PopoverOffsetMap>({});
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [pinCollapsed, setPinCollapsed] = useState<Record<string, boolean>>({});

  const displayContext = useMemo((): InspectPinDisplayContext => {
    return {
      yAxisQuantity,
      showThetaData,
      showPhiData,
      linkedImaginaryGlyph,
      linkedRealGlyph,
    };
  }, [
    yAxisQuantity,
    showThetaData,
    showPhiData,
    linkedImaginaryGlyph,
    linkedRealGlyph,
  ]);

  const traceDisplays = useMemo(
    () => buildInspectPinTraceDisplays(visibleTraces, displayContext),
    [visibleTraces, displayContext],
  );

  const useTableLayout = inspectPinPreferTableLayout(
    visibleTraces.length,
    visibleTraces,
  );
  const angleColumnTitle = inspectPinAngleColumnTitle(
    visibleTraces,
    displayContext,
  );

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
      const rawRows: InspectPinRow[] = visibleTraces.map((trace, index) => ({
        display: traceDisplays[index]!,
        color: getTraceColor(trace, themeColors.text),
        value: getValueAtEnergy(trace, pin.energy, threshold),
      }));
      const rows = collapseUniformBareAtomBetaPinRows(rawRows);
      map.set(pin.id, rows);
    }
    return map;
  }, [
    pins,
    scales.xScale,
    themeColors.text,
    traceDisplays,
    visibleTraces,
  ]);

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
              {!suppressPinStem ? (
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
              ) : null}
              {rows.map((row, rowIndex) =>
                row.value == null ? null : (
                  <PinSvgMarker
                    key={`${pin.id}-dot-${rowIndex}`}
                    x={xLocal}
                    y={scales.yScale(row.value)}
                    color={row.color}
                    symbol={row.display.markerSymbol}
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
              {rows.length === 0 ? (
                <p className="text-[11px] italic text-[var(--chart-text-secondary)]">
                  No visible traces
                </p>
              ) : useTableLayout ? (
                <InspectPinTraceTable
                  rows={rows}
                  angleColumnTitle={angleColumnTitle}
                  pinEnergy={pin.energy}
                />
              ) : (
                <InspectPinTraceList rows={rows} />
              )}
            </div>
          </DraggablePlotPopover>
        );
      })}
    </div>
  );
}

function PinSvgMarker({
  x,
  y,
  color,
  symbol,
}: {
  x: number;
  y: number;
  color: string;
  symbol: InspectPinTraceDisplay["markerSymbol"];
}) {
  const stroke = "rgba(255,255,255,0.9)";
  const strokeWidth = 1.5;
  if (symbol === "square") {
    const half = 5;
    return (
      <rect
        x={x - half}
        y={y - half}
        width={half * 2}
        height={half * 2}
        fill={color}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={0.95}
        pointerEvents="none"
      />
    );
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={5}
      fill={color}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={0.95}
      pointerEvents="none"
    />
  );
}

function InspectPinTraceList({ rows }: { rows: InspectPinRow[] }) {
  return (
    <ul className="flex flex-col gap-0.5 text-[11px]">
      {rows.map((row) => (
        <li key={row.display.rowKey} className="flex items-center gap-1.5">
          <span
            style={pinSwatchStyle(row.color, row.display.markerSymbol)}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-[var(--chart-text)]">
            {row.display.listLabel}
          </span>
          <span className="font-mono tabular-nums text-[var(--chart-text)]">
            {formatTraceValue(row.value)}
          </span>
          <InlineCopyButton
            label={`Copy ${row.display.listLabel}`}
            disabled={row.value == null}
            onCopy={() =>
              copyToClipboard(
                row.value == null ? "" : String(row.value),
              )
            }
          />
        </li>
      ))}
    </ul>
  );
}

function InspectPinTraceTable({
  rows,
  angleColumnTitle,
  pinEnergy,
}: {
  rows: InspectPinRow[];
  angleColumnTitle: string;
  pinEnergy: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[12rem] border-collapse text-[11px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--chart-text-secondary)]">
            <th className="pb-0.5 pr-2 font-medium">Trace</th>
            <th className="pb-0.5 pr-2 font-medium tabular-nums">
              {angleColumnTitle}
            </th>
            <th className="pb-0.5 pr-1 text-right font-medium">y</th>
            <th className="pb-0.5 w-6" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.display.rowKey}
              className="border-t border-[color-mix(in_oklab,var(--chart-grid-strong)_22%,transparent)]"
            >
              <td className="py-0.5 pr-2">
                <span className="flex items-center gap-1.5">
                  <span
                    style={pinSwatchStyle(row.color, row.display.markerSymbol)}
                    aria-hidden
                  />
                  <span className="text-[var(--chart-text)]">
                    {row.display.channelGlyph}
                  </span>
                </span>
              </td>
              <td className="py-0.5 pr-2 tabular-nums text-[var(--chart-text-secondary)]">
                {row.display.angleLabel || "\u2014"}
              </td>
              <td className="py-0.5 pr-1 text-right font-mono tabular-nums text-[var(--chart-text)]">
                {formatTraceValue(row.value)}
              </td>
              <td className="py-0.5 text-right">
                <InlineCopyButton
                  label={`Copy ${row.display.channelGlyph} at ${formatEnergyEv(pinEnergy)} eV`}
                  disabled={row.value == null}
                  onCopy={() =>
                    copyToClipboard(
                      row.value == null ? "" : String(row.value),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
