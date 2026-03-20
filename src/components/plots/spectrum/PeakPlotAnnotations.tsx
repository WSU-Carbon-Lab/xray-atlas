"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import type { Peak, PeakAnnotationPatch, PlotDimensions } from "../types";
import type { ChartScales } from "./types";
import { PEAK_SELECTION_ACCENT } from "../constants";
import { peakStableId } from "../utils/peakStableId";
import {
  NEXAFS_PEAK_KIND_OPTIONS,
  unicodeShortLabelForPeakKind,
} from "./peakKindOptions";

const RAIL_CLEARANCE = 16;
const ROW_H = 22;
const GAP = 5;
const ROW_W = 132;
const STAGGER_GAP = 2;
const OVERLAP_X = ROW_W - 6;

const shellClass =
  "flex h-[22px] w-full shrink-0 items-center gap-0.5 rounded-sm border border-[color-mix(in_oklab,var(--chart-grid-strong)_55%,transparent)] bg-[color-mix(in_oklab,var(--chart-paper)_94%,transparent)] px-1.5 text-[11px] leading-none text-[var(--chart-text)] shadow-none";

const fieldClass =
  "h-[18px] rounded-sm border border-[color-mix(in_oklab,var(--chart-grid-strong)_45%,transparent)] bg-[color-mix(in_oklab,var(--chart-background)_88%,transparent)] px-1 text-[11px] text-[var(--chart-text)] outline-none focus:border-[var(--accent)] focus:ring-0";

function formatEnergyEv(energy: number): string {
  return String(Math.round(energy * 100) / 100);
}

export function PeakPlotAnnotations({
  peaks,
  selectedPeakId,
  scales,
  dimensions,
  getYValueAtEnergy,
  onPeakSelect,
  onPeakPatch,
  onPeakUpdate,
  visible,
  overlayWidth,
  overlayHeight,
}: {
  peaks: Peak[];
  selectedPeakId: string | null;
  scales: ChartScales;
  dimensions: PlotDimensions;
  getYValueAtEnergy: (energy: number) => number;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakPatch?: (peakId: string, patch: PeakAnnotationPatch) => void;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  visible: boolean;
  overlayWidth: number;
  overlayHeight: number;
}) {
  const [energyDraft, setEnergyDraft] = useState("");

  useEffect(() => {
    if (selectedPeakId == null) {
      setEnergyDraft("");
      return;
    }
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i]!;
      if (peakStableId(peak, i) === selectedPeakId) {
        setEnergyDraft(String(peak.energy));
        return;
      }
    }
    setEnergyDraft("");
  }, [peaks, selectedPeakId]);

  const commitEnergy = useCallback(
    (peakId: string, raw: string) => {
      const n = parseFloat(raw);
      if (!Number.isFinite(n)) return;
      const rounded = Math.round(n * 100) / 100;
      if (onPeakPatch) {
        onPeakPatch(peakId, { energy: rounded });
      } else {
        onPeakUpdate?.(peakId, rounded);
      }
    },
    [onPeakPatch, onPeakUpdate],
  );

  const ml = dimensions.margins.left;
  const mt = dimensions.margins.top;
  const plotInnerH =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  const topByPeakId = useMemo(() => {
    if (!visible || peaks.length === 0) return new Map<string, number>();
    const maxTop = Math.max(
      mt + RAIL_CLEARANCE,
      mt + plotInnerH - ROW_H - 4,
    );
    type L = {
      peakId: string;
      peakIndex: number;
      xCss: number;
      baseTop: number;
    };
    const layouts: L[] = peaks.map((peak, peakIndex) => {
      const peakId = peakStableId(peak, peakIndex);
      const xCss = ml + scales.xScale(peak.energy);
      const yTraceCss = mt + scales.yScale(getYValueAtEnergy(peak.energy));
      let baseTop = yTraceCss - GAP - ROW_H;
      if (baseTop < mt + RAIL_CLEARANCE) {
        baseTop = yTraceCss + GAP;
      }
      return { peakId, peakIndex, xCss, baseTop };
    });
    layouts.sort((a, b) => a.xCss - b.xCss);
    const placed: Array<{ xCss: number; top: number }> = [];
    const map = new Map<string, number>();
    for (const L of layouts) {
      let top = L.baseTop;
      for (const p of placed) {
        if (Math.abs(L.xCss - p.xCss) < OVERLAP_X) {
          top = Math.max(top, p.top + ROW_H + STAGGER_GAP);
        }
      }
      top = Math.min(top, maxTop);
      placed.push({ xCss: L.xCss, top });
      map.set(L.peakId, top);
    }
    return map;
  }, [visible, peaks, scales, getYValueAtEnergy, ml, mt, plotInnerH]);

  if (!visible || peaks.length === 0) return null;

  const focusStyle = {
    boxShadow: `0 0 0 1px ${PEAK_SELECTION_ACCENT}`,
  } as const;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[19]"
      style={{ width: overlayWidth, height: overlayHeight }}
    >
      {peaks.map((peak, peakIndex) => {
        const peakId = peakStableId(peak, peakIndex);
        const isSelected = selectedPeakId === peakId;
        const xInner = scales.xScale(peak.energy);
        const xCss = ml + xInner;
        const top = topByPeakId.get(peakId) ?? mt + RAIL_CLEARANCE;
        const kind = peak.peakKind;
        const kindDisplay = unicodeShortLabelForPeakKind(
          kind != null && kind !== "" ? kind : null,
        );
        const hasLegacyKind =
          kind != null &&
          kind !== "" &&
          kind !== "pi-star" &&
          kind !== "sigma-star";
        const selectValue =
          kind == null || kind === ""
            ? "none"
            : hasLegacyKind
              ? "__keep__"
              : kind;
        const canKind = onPeakPatch != null;
        const canEnergy = onPeakPatch != null || onPeakUpdate != null;
        const showEditor = isSelected && canEnergy;
        const ev = formatEnergyEv(peak.energy);

        const stopPan = (e: React.SyntheticEvent) => {
          e.stopPropagation();
        };

        return (
          <div
            key={peakId}
            className="pointer-events-auto absolute -translate-x-1/2"
            style={{ left: xCss, top, width: ROW_W }}
            onPointerDown={stopPan}
          >
            {showEditor ? (
              <div className={shellClass} style={focusStyle}>
                <input
                  id={`peak-e-${peakId}`}
                  type="number"
                  step="0.01"
                  value={energyDraft}
                  onChange={(e) => setEnergyDraft(e.target.value)}
                  onBlur={() => {
                    if (selectedPeakId === peakId) {
                      commitEnergy(peakId, energyDraft);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className={`${fieldClass} w-[3.1rem] shrink-0 tabular-nums`}
                  aria-label="Peak energy in eV"
                />
                <span className="shrink-0 text-[10px] tabular-nums opacity-80">
                  eV|
                </span>
                {canKind ? (
                  <select
                    value={selectValue}
                    onChange={(e) => {
                      if (!onPeakPatch) return;
                      const raw = e.target.value;
                      if (raw === "__keep__") return;
                      onPeakPatch(peakId, {
                        peakKind: raw === "none" ? null : raw,
                      });
                    }}
                    className={`${fieldClass} min-w-0 flex-1 cursor-pointer py-0 pr-4`}
                    style={{ maxWidth: "3.75rem" }}
                    aria-label="Resonance assignment"
                  >
                    <option value="none">{"\u2014"}</option>
                    {hasLegacyKind && kind != null && kind !== "" ? (
                      <option value="__keep__" title={kind}>
                        {unicodeShortLabelForPeakKind(kind)}
                      </option>
                    ) : null}
                    {NEXAFS_PEAK_KIND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} title={opt.label}>
                        {opt.unicodeShort}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium tracking-tight opacity-90">
                    {kindDisplay}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                className={`${shellClass} text-left hover:opacity-95`}
                style={isSelected ? focusStyle : undefined}
                aria-label={`Select peak at ${peak.energy} eV to edit`}
                onClick={() => onPeakSelect?.(peakId)}
              >
                <span className="shrink-0 font-mono text-[11px] font-medium tabular-nums">
                  {ev}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums opacity-80">
                  eV|
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium tracking-tight opacity-90">
                  {kindDisplay}
                </span>
                <Pencil
                  className="h-2.5 w-2.5 shrink-0 opacity-35"
                  aria-hidden
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
