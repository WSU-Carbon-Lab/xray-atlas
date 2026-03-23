"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { SimpleDialog } from "~/components/ui/dialog";
import {
  DocumentDuplicateIcon,
  PhotoIcon,
  ChevronRightIcon,
  Square2StackIcon,
  RectangleStackIcon,
  FilmIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import { Button, Input, Label } from "@heroui/react";
import { Tooltip } from "@heroui/react";
import {
  type ExportConfig,
  type ExportLineStyle,
  createDefaultExportConfig,
  getDimensionsFromConfig,
  EXPORT_DEFAULTS,
  ASPECT_RATIOS,
  LINE_STYLE_OPTS,
  FONT_SIZE_OPTS,
  type LegendBackgroundKind,
} from "./export-types";
import { applyExportOverrides } from "./apply-export-overrides";

export type { ExportLineStyle, TraceExportOverride } from "./export-types";

function cmToPx(cm: number, dpi: number): number {
  return Math.round((cm / EXPORT_DEFAULTS.CM_PER_INCH) * dpi);
}

type ExportPlotModalProps = {
  isOpen: boolean;
  onClose: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  plotWidth: number;
  plotHeight: number;
  plotArea?: { left: number; top: number; width: number; height: number };
  visibleTraceExportInfo?: { id: string; label: string }[];
};

export const ExportPlotModal = memo(function ExportPlotModal({
  isOpen,
  onClose,
  svgRef,
  plotWidth,
  plotHeight,
  plotArea,
  visibleTraceExportInfo = [],
}: ExportPlotModalProps) {
  const [exportConfig, setExportConfig] = useState<ExportConfig>(createDefaultExportConfig);
  const [exportPreviewUrl, setExportPreviewUrl] = useState("");
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current || !svgRef.current || visibleTraceExportInfo.length === 0) return;
    const svg = svgRef.current;
    const next: Record<string, { color?: string }> = {};
    visibleTraceExportInfo.forEach(({ id }, i) => {
      const g = svg.querySelector(`[data-trace-index="${i}"]`);
      if (!g) return;
      const pathOrLine = g.querySelector("path, line");
      if (pathOrLine instanceof SVGElement) {
        const stroke = pathOrLine.getAttribute("stroke");
        if (stroke) next[id] = { color: stroke };
      }
    });
    if (Object.keys(next).length === 0) return;
    seededRef.current = true;
    setExportConfig((c) => {
      const traceOverrides = { ...c.traceOverrides };
      for (const [id, v] of Object.entries(next)) {
        traceOverrides[id] = { ...traceOverrides[id], ...v };
      }
      return { ...c, traceOverrides };
    });
  }, [isOpen, visibleTraceExportInfo]);

  const { widthCm, heightCm } = getDimensionsFromConfig(exportConfig, plotWidth, plotHeight, plotArea);
  const targetWidthPx = cmToPx(widthCm, exportConfig.dpi);
  const targetHeightPx = cmToPx(heightCm, exportConfig.dpi);

  const previewScale = Math.min(280 / targetWidthPx, 1);
  const mainPreviewW = Math.round(targetWidthPx * previewScale);
  const mainPreviewH = Math.round(targetHeightPx * previewScale);

  useEffect(() => {
    if (!isOpen || !svgRef.current) {
      setExportPreviewUrl("");
      return;
    }
    const run = () => {
      const dims = getDimensionsFromConfig(exportConfig, plotWidth, plotHeight, plotArea);
      const wPx = cmToPx(dims.widthCm, exportConfig.dpi);
      const hPx = cmToPx(dims.heightCm, exportConfig.dpi);
      const clone = svgRef.current!.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("viewBox", `0 0 ${plotWidth} ${plotHeight}`);
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      clone.setAttribute("width", String(wPx));
      clone.setAttribute("height", String(hPx));
      applyExportOverrides(clone, exportConfig, visibleTraceExportInfo);
      const str = new XMLSerializer().serializeToString(clone);
      setExportPreviewUrl("data:image/svg+xml," + encodeURIComponent(str));
    };
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(run, 200);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [isOpen, exportConfig, plotWidth, plotHeight, plotArea, visibleTraceExportInfo, svgRef]);

  const buildExportSvg = useCallback(
    (opts: { viewBoxOnly?: boolean } = {}) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("viewBox", `0 0 ${plotWidth} ${plotHeight}`);
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      if (!opts.viewBoxOnly) {
        clone.setAttribute("width", String(targetWidthPx));
        clone.setAttribute("height", String(targetHeightPx));
      }
      applyExportOverrides(clone, exportConfig, visibleTraceExportInfo);
      return clone;
    },
    [svgRef, plotWidth, plotHeight, targetWidthPx, targetHeightPx, exportConfig, visibleTraceExportInfo],
  );

  const exportAsSvg = useCallback(() => {
    const clone = buildExportSvg();
    if (!clone) return;
    const str = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spectrum-plot.svg";
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }, [buildExportSvg, onClose]);

  const fillStyle =
    exportConfig.background === "white" ? "#ffffff" : "transparent";

  const exportAsPng = useCallback(() => {
    const clone = buildExportSvg();
    if (!clone) return;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (fillStyle !== "transparent") {
      ctx.fillStyle = fillStyle;
      ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);
    }
    const img = new Image();
    const str = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(
      new Blob([str], { type: "image/svg+xml;charset=utf-8" }),
    );
    img.onload = () => {
      ctx.drawImage(img, 0, 0, targetWidthPx, targetHeightPx);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => {
          if (!b) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = `spectrum-plot-${exportConfig.dpi}dpi.png`;
          a.click();
          URL.revokeObjectURL(a.href);
          onClose();
        },
        "image/png",
        1,
      );
    };
    img.src = url;
  }, [buildExportSvg, targetWidthPx, targetHeightPx, fillStyle, exportConfig.dpi, onClose]);

  const copyPngToClipboard = useCallback(() => {
    const clone = buildExportSvg();
    if (!clone) return;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (fillStyle !== "transparent") {
      ctx.fillStyle = fillStyle;
      ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);
    }
    const img = new Image();
    const str = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(
      new Blob([str], { type: "image/svg+xml;charset=utf-8" }),
    );
    img.onload = () => {
      ctx.drawImage(img, 0, 0, targetWidthPx, targetHeightPx);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => {
          if (!b) return;
          void navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
          onClose();
        },
        "image/png",
        1,
      );
    };
    img.src = url;
  }, [buildExportSvg, targetWidthPx, targetHeightPx, fillStyle, onClose]);

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Export plot"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-sm">
        <section>
          <Label className="mb-3 font-medium text-(--text-primary)">
            Size and aspect
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ASPECT_RATIOS.map((ar) => {
              const selected =
                exportConfig.sizePreset.type === "aspect" && exportConfig.sizePreset.id === ar.id;
              const Icon =
                ar.icon === "square"
                  ? Square2StackIcon
                  : ar.icon === "landscape"
                    ? RectangleStackIcon
                    : FilmIcon;
              return (
                <Button
                  key={ar.id}
                  variant={selected ? "primary" : "outline"}
                  onPress={() =>
                    setExportConfig((c) => ({ ...c, sizePreset: { type: "aspect", id: ar.id } }))
                  }
                  className="tabular-nums inline-flex items-center gap-2"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {ar.label}
                </Button>
              );
            })}
            <Button
              variant={exportConfig.sizePreset.type === "custom" ? "primary" : "outline"}
              onPress={() =>
                setExportConfig((c) => ({
                  ...c,
                  sizePreset: {
                    type: "custom",
                    widthCm: Number.parseFloat(c.customWidthCm) || 8.6,
                    heightCm: Number.parseFloat(c.customHeightCm) || 6,
                  },
                }))
              }
              className="inline-flex items-center gap-2"
            >
              <PencilSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
              Custom
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-(--text-primary) [&::-webkit-details-marker]:hidden">
              <ChevronRightIcon className="h-4 w-4 transition-transform group-open:rotate-90" />
              Background
            </summary>
            <div className="border-t border-(--border-default) px-3 py-2 space-y-2">
              {(
                [
                  { value: "transparent" as const, label: "Transparent" },
                  { value: "white" as const, label: "White" },
                ] as const
              ).map((opt) => (
                <Label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2"
                  htmlFor={`export-bg-${opt.value}`}
                >
                  <input
                    id={`export-bg-${opt.value}`}
                    type="radio"
                    name="export-bg"
                    checked={exportConfig.background === opt.value}
                    onChange={() =>
                      setExportConfig((c) => ({ ...c, background: opt.value }))
                    }
                    className="rounded-full border-(--border-default)"
                  />
                  <span className="text-(--text-secondary)">{opt.label}</span>
                </Label>
              ))}
            </div>
          </details>
        </section>

        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-(--text-primary) [&::-webkit-details-marker]:hidden">
              <ChevronRightIcon className="h-4 w-4 transition-transform group-open:rotate-90" />
              Resolution (DPI)
            </summary>
            <div className="border-t border-(--border-default) px-3 py-2 flex items-center gap-2">
              <Tooltip>
                <Input
                  type="number"
                  min={72}
                  max={1200}
                  step={72}
                  value={String(exportConfig.dpi)}
                  onChange={(e) =>
                    setExportConfig((c) => ({
                      ...c,
                      dpi: Math.max(72, Math.min(1200, Number(e.target.value) || 72)),
                    }))
                  }
                  className="w-24"
                  aria-label="DPI"
                />
                <Tooltip.Content>Pixels per inch for PNG export. 72 for screen, 300–600 for print.</Tooltip.Content>
              </Tooltip>
              <Label className="text-(--text-tertiary)">dpi</Label>
            </div>
          </details>
        </section>

        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-(--text-primary) [&::-webkit-details-marker]:hidden">
              <ChevronRightIcon className="h-4 w-4 transition-transform group-open:rotate-90" />
              Font sizes
            </summary>
            <div className="border-t border-(--border-default) px-3 py-2 grid grid-cols-2 gap-3">
              <Label className="text-(--text-tertiary)">Axis labels</Label>
              <select
                value={exportConfig.fontAxisLabel}
                onChange={(e) =>
                  setExportConfig((c) => ({
                    ...c,
                    fontAxisLabel: Number(e.target.value),
                  }))
                }
                className="rounded-lg border border-(--border-default) bg-(--surface-2) px-2 py-1.5 text-(--text-primary)"
              >
                {FONT_SIZE_OPTS.map((n) => (
                  <option key={n} value={n}>
                    {n} pt
                  </option>
                ))}
              </select>
              <Label className="text-(--text-tertiary)">Tick labels</Label>
              <select
                value={exportConfig.fontTick}
                onChange={(e) =>
                  setExportConfig((c) => ({ ...c, fontTick: Number(e.target.value) }))
                }
                className="rounded-lg border border-(--border-default) bg-(--surface-2) px-2 py-1.5 text-(--text-primary)"
              >
                {FONT_SIZE_OPTS.map((n) => (
                  <option key={n} value={n}>
                    {n} pt
                  </option>
                ))}
              </select>
              <Label className="text-(--text-tertiary)">Legend title</Label>
              <select
                value={exportConfig.fontLegendTitle}
                onChange={(e) =>
                  setExportConfig((c) => ({
                    ...c,
                    fontLegendTitle: Number(e.target.value),
                  }))
                }
                className="rounded-lg border border-(--border-default) bg-(--surface-2) px-2 py-1.5 text-(--text-primary)"
              >
                {FONT_SIZE_OPTS.map((n) => (
                  <option key={n} value={n}>
                    {n} pt
                  </option>
                ))}
              </select>
              <Label className="text-(--text-tertiary)">Legend labels</Label>
              <select
                value={exportConfig.fontLegendLabel}
                onChange={(e) =>
                  setExportConfig((c) => ({
                    ...c,
                    fontLegendLabel: Number(e.target.value),
                  }))
                }
                className="rounded-lg border border-(--border-default) bg-(--surface-2) px-2 py-1.5 text-(--text-primary)"
              >
                {FONT_SIZE_OPTS.map((n) => (
                  <option key={n} value={n}>
                    {n} pt
                  </option>
                ))}
              </select>
            </div>
          </details>
        </section>

        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-(--text-primary) [&::-webkit-details-marker]:hidden">
              <ChevronRightIcon className="h-4 w-4 transition-transform group-open:rotate-90" />
              Legend
            </summary>
            <div className="border-t border-(--border-default) px-3 py-2 grid grid-cols-2 gap-3">
              <Label className="text-(--text-tertiary)">Background</Label>
              <select
                value={exportConfig.legendBackground}
                onChange={(e) =>
                  setExportConfig((c) => ({
                    ...c,
                    legendBackground: e.target.value as LegendBackgroundKind,
                  }))
                }
                className="rounded-lg border border-(--border-default) bg-(--surface-2) px-2 py-1.5 text-(--text-primary)"
                aria-label="Legend background"
              >
                <option value="white">White</option>
                <option value="color">Color (theme)</option>
              </select>
              <Label className="text-(--text-tertiary)">Corner radius</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={2}
                value={String(exportConfig.legendBorderRadius)}
                onChange={(e) =>
                  setExportConfig((c) => ({
                    ...c,
                    legendBorderRadius: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                  }))
                }
                className="w-20"
                aria-label="Legend corner radius"
              />
              <Label className="text-(--text-tertiary)">Columns</Label>
              <select
                value={String(exportConfig.legendColumns)}
                onChange={(e) =>
                  setExportConfig((c) => ({
                    ...c,
                    legendColumns: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                  }))
                }
                className="rounded-lg border border-(--border-default) bg-(--surface-2) px-2 py-1.5 text-(--text-primary)"
                aria-label="Legend columns"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </details>
        </section>

        <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-(--text-primary) [&::-webkit-details-marker]:hidden">
              <ChevronRightIcon className="h-4 w-4 transition-transform group-open:rotate-90" />
              Axes
            </summary>
            <div className="border-t border-(--border-default) px-3 py-2 grid grid-cols-2 gap-3">
              <Tooltip>
                <div>
                  <Label className="text-(--text-tertiary)">Spine thickness</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={4}
                    step={0.5}
                    value={String(exportConfig.spineWidth)}
                    onChange={(e) =>
                      setExportConfig((c) => ({
                        ...c,
                        spineWidth: Math.max(0.5, Math.min(4, Number(e.target.value) || 1)),
                      }))
                    }
                    className="w-24"
                    aria-label="Spine thickness"
                  />
                </div>
                <Tooltip.Content>Stroke width of the axis spine lines.</Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <div>
                  <Label className="text-(--text-tertiary)">Tick thickness</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={3}
                    step={0.5}
                    value={String(exportConfig.tickStrokeWidth)}
                    onChange={(e) =>
                      setExportConfig((c) => ({
                        ...c,
                        tickStrokeWidth: Math.max(0.5, Math.min(3, Number(e.target.value) || 1)),
                      }))
                    }
                    className="w-24"
                    aria-label="Tick thickness"
                  />
                </div>
                <Tooltip.Content>Stroke width of axis tick lines.</Tooltip.Content>
              </Tooltip>
            </div>
          </details>
        </section>

        {visibleTraceExportInfo.length > 0 && (
          <section className="rounded-lg border border-(--border-default) bg-(--surface-1) overflow-hidden">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-(--text-primary) [&::-webkit-details-marker]:hidden">
                <ChevronRightIcon className="h-4 w-4 transition-transform group-open:rotate-90" />
                Trace appearance
              </summary>
              <div className="border-t border-(--border-default) px-3 py-2 space-y-3">
                {visibleTraceExportInfo.map(({ id, label }) => {
                  const over = exportConfig.traceOverrides[id] ?? {};
                  return (
                    <div
                      key={id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-(--border-subtle) p-2 bg-(--surface-2)"
                    >
                      <Label className="min-w-24 truncate font-medium text-(--text-secondary)" title={label}>
                        {label}
                      </Label>
                      <select
                        value={over.lineStyle ?? "solid"}
                        onChange={(e) =>
                          setExportConfig((c) => ({
                            ...c,
                            traceOverrides: {
                              ...c.traceOverrides,
                              [id]: { ...c.traceOverrides[id], lineStyle: e.target.value as ExportLineStyle },
                            },
                          }))
                        }
                        className="rounded-lg border border-(--border-default) bg-(--surface-1) px-2 py-1.5 text-(--text-primary) text-sm"
                        aria-label={`Line style for ${label}`}
                      >
                        {LINE_STYLE_OPTS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <Tooltip>
                        <div className="flex items-center gap-1.5">
                          <Label className="text-(--text-tertiary) text-xs">Width</Label>
                          <Input
                            type="number"
                            min={0.5}
                            max={6}
                            step={0.5}
                            value={String(over.lineWidth ?? 2)}
                            onChange={(e) =>
                              setExportConfig((c) => ({
                                ...c,
                                traceOverrides: {
                                  ...c.traceOverrides,
                                  [id]: {
                                    ...c.traceOverrides[id],
                                    lineWidth: Number(e.target.value) || 2,
                                  },
                                },
                              }))
                            }
                            className="w-14 text-sm"
                            aria-label={`Line width for ${label}`}
                          />
                        </div>
                        <Tooltip.Content>Trace line width in export.</Tooltip.Content>
                      </Tooltip>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-(--text-tertiary) text-xs">Color</Label>
                        <input
                          type="color"
                          value={over.color ?? "#6366f1"}
                          onChange={(e) =>
                            setExportConfig((c) => ({
                              ...c,
                              traceOverrides: {
                                ...c.traceOverrides,
                                [id]: { ...c.traceOverrides[id], color: e.target.value },
                              },
                            }))
                          }
                          className="h-8 w-8 rounded border border-(--border-default) cursor-pointer"
                          aria-label={`Color for ${label}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </section>
        )}

        {exportConfig.sizePreset.type === "custom" && (
          <section>
            <Label className="mb-2 font-medium text-(--text-primary)">
              Custom dimensions
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <Tooltip>
                <div className="flex items-center gap-2">
                  <Label className="text-(--text-tertiary)">Width</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    value={exportConfig.customWidthCm}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExportConfig((c) => ({
                        ...c,
                        customWidthCm: v,
                        sizePreset: {
                          type: "custom",
                          widthCm: Number.parseFloat(v) || 8.6,
                          heightCm: Number.parseFloat(c.customHeightCm) || 6,
                        },
                      }));
                    }}
                    className="w-20"
                    aria-label="Width cm"
                  />
                  <span className="text-(--text-tertiary)">cm</span>
                </div>
                <Tooltip.Content>Figure width in centimetres.</Tooltip.Content>
              </Tooltip>
              <span className="text-(--text-tertiary)">×</span>
              <Tooltip>
                <div className="flex items-center gap-2">
                  <Label className="text-(--text-tertiary)">Height</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    value={exportConfig.customHeightCm}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExportConfig((c) => ({
                        ...c,
                        customHeightCm: v,
                        sizePreset: {
                          type: "custom",
                          widthCm: Number.parseFloat(c.customWidthCm) || 8.6,
                          heightCm: Number.parseFloat(v) || 6,
                        },
                      }));
                    }}
                    className="w-20"
                    aria-label="Height cm"
                  />
                  <span className="text-(--text-tertiary)">cm</span>
                </div>
                <Tooltip.Content>Figure height in centimetres.</Tooltip.Content>
              </Tooltip>
            </div>
          </section>
        )}

        <section>
          <h4 className="mb-2 font-medium text-(--text-primary)">
            Preview
          </h4>
          <div
            className="rounded-lg border border-(--border-default) p-3 flex items-center justify-center min-h-[140px]"
            style={
              exportConfig.background === "transparent"
                ? {
                    backgroundColor: "#e2e8f0",
                    backgroundImage: `
                      linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
                      linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
                      linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)
                    `,
                    backgroundSize: "12px 12px",
                    backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                  }
                : { background: fillStyle }
            }
          >
            {exportPreviewUrl ? (
              <img
                alt="Export preview"
                className="max-h-[280px] w-auto max-w-full object-contain"
                style={{
                  width: mainPreviewW,
                  height: mainPreviewH,
                }}
                src={exportPreviewUrl}
              />
            ) : (
              <span className="text-(--text-tertiary)">Loading preview…</span>
            )}
          </div>
          <p className="mt-1 text-(--text-tertiary)">
            {widthCm.toFixed(1)} × {heightCm.toFixed(1)} cm
            {" · "}
            {targetWidthPx} × {targetHeightPx} px at {exportConfig.dpi} dpi
          </p>
        </section>

        <section className="flex flex-wrap gap-2 pt-2 border-t border-(--border-default)">
          <Tooltip>
            <Button
              variant="outline"
              onPress={copyPngToClipboard}
              aria-label="Copy PNG"
              className="inline-flex items-center gap-2"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              Copy PNG
            </Button>
            <Tooltip.Content>Copy the preview as PNG to the clipboard.</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Button
              variant="outline"
              onPress={exportAsPng}
              aria-label="Save PNG"
              className="inline-flex items-center gap-2"
            >
              <PhotoIcon className="h-4 w-4" />
              Save PNG
            </Button>
            <Tooltip.Content>Download the plot as a PNG file.</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Button
              variant="outline"
              onPress={exportAsSvg}
              aria-label="Save SVG"
              className="inline-flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Save SVG
            </Button>
            <Tooltip.Content>Download the plot as an SVG file.</Tooltip.Content>
          </Tooltip>
        </section>
      </div>
    </SimpleDialog>
  );
});
