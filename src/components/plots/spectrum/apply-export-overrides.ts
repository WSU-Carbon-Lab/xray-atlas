import type { ExportConfig } from "./export-types";
import { strokeDasharrayForStyle } from "./export-types";

export type VisibleTraceExportInfo = { id: string; label: string }[];

export function applyExportOverrides(
  clone: SVGSVGElement,
  config: ExportConfig,
  visibleTraceExportInfo: VisibleTraceExportInfo,
): void {
  const axisLabelRe =
    /^(Energy \(|Optical density|Mass absorption|Intensity \(a\.u\.\)|β)/;
  const {
    background,
    fontAxisLabel,
    fontTick,
    fontLegendTitle,
    fontLegendLabel,
    spineWidth,
    tickStrokeWidth,
    legendBackground,
    legendBorderRadius,
    legendColumns,
    traceOverrides,
  } = config;

  const plotBg = clone.querySelector("[data-export-plot-background]");
  if (plotBg && plotBg instanceof SVGElement) {
    if (background === "transparent") {
      plotBg.setAttribute("fill", "none");
    } else {
      plotBg.setAttribute("fill", "#ffffff");
    }
  }

  const texts = clone.querySelectorAll("text");
  texts.forEach((el) => {
    const parent = el.closest("g");
    const isAxisLabel =
      parent?.getAttribute("class")?.includes("axis") &&
      (axisLabelRe.exec(el.textContent ?? "") != null ||
        el.getAttribute("style")?.includes("fontWeight"));
    if (isAxisLabel) el.setAttribute("font-size", String(fontAxisLabel));
    else el.setAttribute("font-size", String(fontTick));
  });

  clone.querySelectorAll("[data-export-legend-title]").forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.fontSize = `${fontLegendTitle}px`;
    }
  });
  clone.querySelectorAll("[data-export-legend-label]").forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.fontSize = `${fontLegendLabel}px`;
    }
  });

  const legendContainer = clone.querySelector("[data-export-legend-container]");
  if (legendContainer instanceof HTMLElement) {
    legendContainer.style.backgroundColor =
      legendBackground === "white" ? "#ffffff" : "var(--surface-2, #f1f5f9)";
    legendContainer.style.borderRadius = `${legendBorderRadius}px`;
  }
  const legendEntries = clone.querySelector("[data-export-legend-entries]");
  if (legendEntries instanceof HTMLElement) {
    legendEntries.style.display = "grid";
    legendEntries.style.gridTemplateColumns = `repeat(${legendColumns}, 1fr)`;
    legendEntries.style.gap = "8px";
  }

  clone.querySelectorAll("[data-export-axis-spine]").forEach((el) => {
    if (el instanceof SVGElement) {
      el.setAttribute("stroke-width", String(spineWidth));
    }
  });

  clone.querySelectorAll("[data-export-axis-group]").forEach((group) => {
    if (!(group instanceof SVGElement)) return;
    const lines = Array.from(group.querySelectorAll("line"));
    if (lines.length === 0) return;
    const withLength = lines.map((line) => {
      const x1 = Number(line.getAttribute("x1")) ?? 0;
      const y1 = Number(line.getAttribute("y1")) ?? 0;
      const x2 = Number(line.getAttribute("x2")) ?? 0;
      const y2 = Number(line.getAttribute("y2")) ?? 0;
      const len = Math.hypot(x2 - x1, y2 - y1);
      return { line, len };
    });
    withLength.sort((a, b) => b.len - a.len);
    withLength[0]?.line.setAttribute("stroke-width", String(spineWidth));
    withLength.slice(1).forEach(({ line }) => {
      line.setAttribute("stroke-width", String(tickStrokeWidth));
    });
  });

  clone.querySelectorAll("[data-trace-index]").forEach((g) => {
    if (!(g instanceof SVGElement)) return;
    const indexStr = g.getAttribute("data-trace-index");
    if (indexStr == null) return;
    const index = Number.parseInt(indexStr, 10);
    const info = visibleTraceExportInfo[index];
    if (!info) return;
    const over = traceOverrides[info.id];
    if (!over) return;
    const stroke = over.color;
    const strokeWidth = over.lineWidth;
    const strokeDasharray = over.lineStyle != null ? strokeDasharrayForStyle(over.lineStyle) : undefined;
    g.querySelectorAll("path, line").forEach((el) => {
      if (!(el instanceof SVGElement)) return;
      if (stroke != null) el.setAttribute("stroke", stroke);
      if (strokeWidth != null) el.setAttribute("stroke-width", String(strokeWidth));
      if (strokeDasharray != null) el.setAttribute("stroke-dasharray", strokeDasharray);
    });
  });
}
