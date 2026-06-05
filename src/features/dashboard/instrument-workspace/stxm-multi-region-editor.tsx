"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import type { StxmIzeroBounds, StxmPlotScaleMode, StxmSampleRegion } from "~/lib/stxm/stxm-region-types";
import {
  lineScanImageDisplayScale,
  lineScanPixelGray,
  pxToQAxisValue,
  qAxisBounds,
  qAxisValueToPx,
} from "~/lib/stxm/plot-scale";
import {
  clampRegionValue,
  computeRegionGaps,
  findRegionDragTarget,
  regionDisplayLabel,
  type RegionDragState,
  type RegionDragTarget,
  type RegionGap,
} from "~/lib/stxm/region-editor-utils";
import { createRegionInGap } from "~/lib/stxm/multi-region-state";
import { STXM_IZERO_COLOR, stxmRegionSeriesColor } from "~/lib/stxm/region-colors";
import {
  STXM_INGESTION_SPECTRUM_HEIGHT_PX,
  STXM_REGION_EDITOR_MAX_WIDTH_PX,
} from "./stxm-ingestion-layout";
import {
  STXM_ROW_SUM_TRACE_WIDTH,
  StxmRowSumTrace,
} from "./stxm-row-sum-trace";
const HEATMAP_WIDTH = STXM_REGION_EDITOR_MAX_WIDTH_PX - STXM_ROW_SUM_TRACE_WIDTH;
const CANVAS_HEIGHT = STXM_INGESTION_SPECTRUM_HEIGHT_PX;
const HIT_MARGIN_FRACTION = 0.015;

type StxmMultiRegionEditorProps = {
  image: number[][];
  qaxisPoints: number[];
  regions: StxmSampleRegion[];
  izero: StxmIzeroBounds;
  imageScaleMode: StxmPlotScaleMode;
  onRegionsChange: (regions: StxmSampleRegion[]) => void;
  onRegionChange: (index: number, region: StxmSampleRegion) => void;
  onIzeroChange: (izero: StxmIzeroBounds) => void;
  onDragStart?: (target: RegionDragTarget) => void;
  onDragEnd?: () => void;
  /** Runs automatic region placement from the line-scan image; omit to hide Auto regions. */
  onAutoSuggest?: () => void;
};

/**
 * Interactive line-scan heatmap with N draggable sample regions, izero band, and row-sum profile.
 */
export function StxmMultiRegionEditor({
  image,
  qaxisPoints,
  regions,
  izero,
  imageScaleMode,
  onRegionsChange,
  onRegionChange,
  onIzeroChange,
  onDragStart,
  onDragEnd,
  onAutoSuggest,
}: StxmMultiRegionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<RegionDragState>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverDragTarget, setHoverDragTarget] = useState<RegionDragState>(null);
  const regionListId = useId();
  const [editingRegionIndex, setEditingRegionIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const [sampleMin, sampleMax] = qAxisBounds(qaxisPoints);
  const sampleSpan = sampleMax - sampleMin || 1;
  const minGap = sampleSpan * 0.02;

  const yToPx = useCallback(
    (value: number, height: number) => qAxisValueToPx(value, qaxisPoints, height),
    [qaxisPoints],
  );

  const rowBandPx = useCallback(
    (row: number, rows: number, height: number) => {
      if (qaxisPoints.length !== rows || rows === 0) {
        const cellHeight = height / rows;
        return { top: row * cellHeight, bottom: (row + 1) * cellHeight };
      }
      const yAt = (index: number) =>
        yToPx(qaxisPoints[index] ?? qaxisPoints[0] ?? sampleMin, height);
      const yRow = yAt(row);
      const top = row === 0 ? 0 : (yAt(row - 1) + yRow) / 2;
      const bottom = row === rows - 1 ? height : (yRow + yAt(row + 1)) / 2;
      return top <= bottom ? { top, bottom } : { top: bottom, bottom: top };
    },
    [qaxisPoints, sampleMin, yToPx],
  );

  const pxToSample = useCallback(
    (clientY: number, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      return pxToQAxisValue(clientY, rect.top, rect.height, qaxisPoints);
    },
    [qaxisPoints],
  );

  const regionGaps = useMemo(
    () => computeRegionGaps(regions, izero, sampleMin, sampleMax, minGap),
    [regions, izero, sampleMin, sampleMax, minGap],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const handleMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const sample = pxToSample(event.clientY, canvas);
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      if (drag.kind === "izero-lo") {
        onIzeroChange({
          ...izero,
          izeroLo: clampRegionValue(sample, sampleMin, izero.izeroHi - minGap),
        });
        return;
      }
      if (drag.kind === "izero-hi") {
        onIzeroChange({
          ...izero,
          izeroHi: clampRegionValue(sample, izero.izeroLo + minGap, sampleMax),
        });
        return;
      }
      const region = regions[drag.index];
      if (!region) {
        return;
      }
      if (drag.edge === "lo") {
        onRegionChange(drag.index, {
          ...region,
          sampleLo: clampRegionValue(sample, sampleMin, region.sampleHi - minGap),
        });
        return;
      }
      onRegionChange(drag.index, {
        ...region,
        sampleHi: clampRegionValue(sample, region.sampleLo + minGap, sampleMax),
      });
    };
    const handleUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      onDragEnd?.();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [
    isDragging,
    izero,
    minGap,
    onDragEnd,
    onIzeroChange,
    onRegionChange,
    pxToSample,
    regions,
    sampleMax,
    sampleMin,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || image.length === 0) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const width = canvas.width;
    const height = canvas.height;
    const finite = image.flat().filter((value) => Number.isFinite(value));
    const dataMin = finite.length > 0 ? Math.min(...finite) : 0;
    const dataMax = finite.length > 0 ? Math.max(...finite) : 1;
    const displayScale = lineScanImageDisplayScale(
      image,
      dataMin,
      dataMax,
      imageScaleMode,
    );

    context.clearRect(0, 0, width, height);
    const rows = image.length;
    const cols = image[0]?.length ?? 0;
    for (let row = 0; row < rows; row += 1) {
      const { top, bottom } = rowBandPx(row, rows, height);
      const rowHeight = bottom - top;
      for (let col = 0; col < cols; col += 1) {
        const value = image[row]?.[col] ?? 0;
        const gray = lineScanPixelGray(value, displayScale);
        context.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        const x = (col / cols) * width;
        const cellWidth = width / cols + 1;
        context.fillRect(x, top, cellWidth, rowHeight + 1);
      }
    }

    context.font = "11px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeStyle = STXM_IZERO_COLOR;
    context.lineWidth = 2;
    drawHorizontalLine(context, yToPx(izero.izeroLo, height), width);
    drawHorizontalLine(context, yToPx(izero.izeroHi, height), width);
    context.fillStyle = STXM_IZERO_COLOR;
    context.fillText(
      "izero",
      width / 2,
      yToPx((izero.izeroLo + izero.izeroHi) / 2, height),
    );

    regions.forEach((region, index) => {
      const color = stxmRegionSeriesColor(index);
      context.strokeStyle = color;
      drawHorizontalLine(context, yToPx(region.sampleLo, height), width);
      drawHorizontalLine(context, yToPx(region.sampleHi, height), width);
    });
  }, [image, imageScaleMode, izero, regions, rowBandPx, yToPx]);

  useEffect(() => {
    if (editingRegionIndex === null) {
      return;
    }
    if (editingRegionIndex >= regions.length) {
      setEditingRegionIndex(null);
      return;
    }
    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [editingRegionIndex, regions.length]);

  const commitRegionLabelEdit = useCallback(
    (index: number) => {
      const region = regions[index];
      if (!region) {
        setEditingRegionIndex(null);
        return;
      }
      onRegionChange(index, { ...region, spotLabel: editDraft.trim() });
      setEditingRegionIndex(null);
    },
    [editDraft, onRegionChange, regions],
  );

  const startRegionLabelEdit = useCallback(
    (index: number) => {
      const region = regions[index];
      if (!region) {
        return;
      }
      setEditDraft(region.spotLabel);
      setEditingRegionIndex(index);
    },
    [regions],
  );

  const isInteractiveOverlayTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return Boolean(
      target.closest("[data-gap-button]") ??
        target.closest("[data-region-label]") ??
        target.closest("[data-region-remove]") ??
        target.closest("[data-region-label-edit]"),
    );
  };

  const updateHoverFromEvent = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (isInteractiveOverlayTarget(event.target)) {
        setHoverDragTarget(null);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        setHoverDragTarget(null);
        return;
      }
      const sample = pxToSample(event.clientY, canvas);
      const hitMargin = sampleSpan * HIT_MARGIN_FRACTION;
      setHoverDragTarget(findRegionDragTarget(sample, hitMargin, izero, regions));
    },
    [izero, pxToSample, regions, sampleSpan],
  );

  const beginDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    if (isInteractiveOverlayTarget(event.target)) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const sample = pxToSample(event.clientY, canvas);
    const hitMargin = sampleSpan * HIT_MARGIN_FRACTION;
    const dragTarget = findRegionDragTarget(sample, hitMargin, izero, regions);
    if (dragTarget) {
      dragRef.current = dragTarget;
      setIsDragging(true);
      if (dragTarget.kind === "izero-lo" || dragTarget.kind === "izero-hi") {
        onDragStart?.({ kind: "izero" });
      } else {
        onDragStart?.({ kind: "region", index: dragTarget.index });
      }
    }
  };

  const addRegionInGap = (gap: RegionGap) => {
    onRegionsChange([...regions, createRegionInGap(gap.lo, gap.hi, regions)]);
  };

  const addRegionFallback = () => {
    if (regionGaps.length > 0) {
      addRegionInGap(regionGaps[0]!);
      return;
    }
    const last = regions.at(-1);
    onRegionsChange([
      ...regions,
      createRegionInGap(
        last?.sampleHi ?? sampleMin,
        clampRegionValue(
          (last?.sampleHi ?? sampleMin) + sampleSpan * 0.1,
          sampleMin,
          sampleMax,
        ),
        regions,
      ),
    ]);
  };

  const removeRegion = (index: number) => {
    if (regions.length <= 1) {
      return;
    }
    if (editingRegionIndex === index) {
      setEditingRegionIndex(null);
    }
    onRegionsChange(regions.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div
      className="border-border bg-surface flex w-full max-w-[180px] flex-col overflow-hidden rounded-lg border"
      style={{ minHeight: CANVAS_HEIGHT }}
    >
      <div
        className={`flex min-h-0 flex-1 ${isDragging || hoverDragTarget ? "cursor-ns-resize" : "cursor-crosshair"}`}
        onPointerDown={beginDrag}
        onPointerMove={updateHoverFromEvent}
        onPointerLeave={() => setHoverDragTarget(null)}
        onPointerUp={() => {
          dragRef.current = null;
          setIsDragging(false);
        }}
      >
        <StxmRowSumTrace
          image={image}
          height={CANVAS_HEIGHT}
          qaxisPoints={qaxisPoints}
          sampleMin={sampleMin}
          yToPx={yToPx}
          izero={izero}
          regions={regions}
        />
        <div className="relative min-w-0 flex-1">
          <canvas
            ref={canvasRef}
            width={HEATMAP_WIDTH}
            height={CANVAS_HEIGHT}
            className="pointer-events-none relative z-0 block w-full"
            style={{ height: CANVAS_HEIGHT, width: HEATMAP_WIDTH }}
          />
          {!isDragging ? (
            <>
              {regions.map((region, index) => {
                const mid = (region.sampleLo + region.sampleHi) / 2;
                const topPct = (yToPx(mid, CANVAS_HEIGHT) / CANVAS_HEIGHT) * 100;
                const label = regionDisplayLabel(region, index);
                const color = stxmRegionSeriesColor(index);
                const isEditing = editingRegionIndex === index;
                const canRemove = regions.length > 1;
                return (
                  <div
                    key={region.id}
                    className="pointer-events-auto absolute left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center"
                    style={{ top: `${topPct}%` }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        data-region-label-edit=""
                        value={editDraft}
                        aria-label={`Edit label for ${label}`}
                        className="border-border bg-surface/95 w-24 rounded-md border px-1.5 py-0.5 text-center text-[11px] font-medium leading-none shadow-sm outline-none"
                        style={{ color }}
                        onChange={(event) => setEditDraft(event.target.value)}
                        onBlur={() => commitRegionLabelEdit(index)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitRegionLabelEdit(index);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setEditingRegionIndex(null);
                          }
                        }}
                      />
                    ) : (
                      <div className="border-border bg-surface/90 flex items-stretch overflow-hidden rounded-md border shadow-sm">
                        <button
                          type="button"
                          data-region-label=""
                          className="cursor-pointer px-1.5 py-0.5 text-[11px] font-medium leading-none hover:underline"
                          style={{ color }}
                          onClick={() => startRegionLabelEdit(index)}
                        >
                          {label}
                        </button>
                        {canRemove ? (
                          <button
                            type="button"
                            data-region-remove=""
                            aria-label={`Remove region ${label}`}
                            className="flex cursor-pointer items-center justify-center self-stretch border-l border-red-300 bg-red-50 px-1 py-0.5 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeRegion(index);
                            }}
                          >
                            <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
              {regionGaps.map((gap) => {
                const mid = (gap.lo + gap.hi) / 2;
                const topPct = (yToPx(mid, CANVAS_HEIGHT) / CANVAS_HEIGHT) * 100;
                return (
                  <button
                    key={`${gap.lo}-${gap.hi}`}
                    type="button"
                    data-gap-button=""
                    aria-label="Add region in gap"
                    className="border-border bg-surface/80 text-foreground absolute left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border text-sm font-semibold shadow-sm hover:bg-surface"
                    style={{ top: `${topPct}%` }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => addRegionInGap(gap)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                );
              })}
            </>
          ) : null}
        </div>
      </div>
      <div className="border-border space-y-1 border-t p-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-muted text-[10px] font-semibold uppercase tracking-wide">
            Regions
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              onPress={onAutoSuggest}
              isDisabled={onAutoSuggest == null}
            >
              Auto regions
            </Button>
            <Button size="sm" variant="secondary" onPress={addRegionFallback}>
              Add region
            </Button>
          </div>
        </div>
        <p className="text-muted text-[10px] leading-snug">
          Click a label to rename. Drag lines to adjust bounds.
        </p>
        <ul
          id={regionListId}
          className="max-h-28 space-y-0.5 overflow-y-auto"
          aria-label="Sample regions"
        >
          {regions.map((region, index) => {
            const color = stxmRegionSeriesColor(index);
            const label = regionDisplayLabel(region, index);
            const canRemove = regions.length > 1;
            return (
              <li
                key={region.id}
                className="hover:bg-default/40 flex min-h-0 items-center gap-1 rounded px-1 py-0.5"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span
                  className="text-foreground min-w-0 flex-1 truncate text-xs font-medium"
                  title={label}
                >
                  {label}
                  {region.role === "pure" ? " (pure)" : null}
                </span>
                {canRemove ? (
                  <button
                    type="button"
                    className="text-muted hover:text-danger flex h-5 w-5 shrink-0 items-center justify-center rounded"
                    aria-label={`Remove ${label}`}
                    onClick={() => removeRegion(index)}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function drawHorizontalLine(
  context: CanvasRenderingContext2D,
  y: number,
  width: number,
): void {
  context.beginPath();
  context.moveTo(0, y);
  context.lineTo(width, y);
  context.stroke();
}
