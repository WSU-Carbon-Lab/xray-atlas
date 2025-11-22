"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import type { Layout, PlotData, PlotSelectionEvent } from "plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export type SpectrumPoint = {
  energy: number;
  absorption: number;
  theta?: number;
  phi?: number;
};

export type SpectrumSelection = {
  energyMin: number;
  energyMax: number;
  absorptionMin: number;
  absorptionMax: number;
  pointCount: number;
  geometryKeys: string[];
};

type AxisStats = {
  min: number | null;
  max: number | null;
};

type ReferenceCurve = {
  label: string;
  points: Array<{ energy: number; absorption: number }>;
  color?: string;
};

type NormalizationRegions = {
  pre: [number, number] | null;
  post: [number, number] | null;
};

type SpectrumPlotProps = {
  points: SpectrumPoint[];
  height?: number;
  energyStats?: AxisStats;
  absorptionStats?: AxisStats;
  referenceCurves?: ReferenceCurve[];
  normalizationRegions?: NormalizationRegions;
  selectionTarget?: "pre" | "post" | null;
  onSelectionChange?: (selection: SpectrumSelection | null) => void;
};

const COLORS = [
  "#d7263d",
  "#1b998b",
  "#2a9d8f",
  "#f4a261",
  "#577590",
  "#ff7f50",
  "#6a4c93",
  "#0b3d91",
];

const buildGeometryLabel = (theta?: number, phi?: number) => {
  const thetaLabel =
    typeof theta === "number" && Number.isFinite(theta)
      ? `θ=${theta.toFixed(1)}°`
      : null;
  const phiLabel =
    typeof phi === "number" && Number.isFinite(phi)
      ? `φ=${phi.toFixed(1)}°`
      : null;

  if (!thetaLabel && !phiLabel) {
    return "Fixed Geometry";
  }

  return [thetaLabel, phiLabel].filter(Boolean).join(", ");
};

export function SpectrumPlot({
  points,
  height = 360,
  energyStats,
  absorptionStats,
  referenceCurves = [],
  normalizationRegions,
  selectionTarget,
  onSelectionChange,
}: SpectrumPlotProps) {
  const groupedTraces = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        theta?: number;
        phi?: number;
        energies: number[];
        absorptions: number[];
      }
    >();

    points.forEach((point) => {
      const hasGeometry =
        typeof point.theta === "number" &&
        Number.isFinite(point.theta) &&
        typeof point.phi === "number" &&
        Number.isFinite(point.phi);

      const key = hasGeometry ? `${point.theta}:${point.phi}` : "fixed";
      const label = buildGeometryLabel(point.theta, point.phi);

      const group = groups.get(key);
      if (group) {
        group.energies.push(point.energy);
        group.absorptions.push(point.absorption);
      } else {
        groups.set(key, {
          label,
          theta: point.theta,
          phi: point.phi,
          energies: [point.energy],
          absorptions: [point.absorption],
        });
      }
    });

    const traces: PlotData[] = [];
    let index = 0;
    groups.forEach((group, key) => {
      const color = COLORS[index] ?? `hsl(${(index * 57) % 360} 65% 55%)`;
      traces.push({
        type: "scattergl",
        mode: "lines+markers",
        name: group.label || key,
        x: group.energies,
        y: group.absorptions,
        marker: {
          color,
          size: 4,
          opacity: 0.7,
          line: {
            width: 0,
          },
        },
        line: {
          color,
          width: 1.6,
        },
        hovertemplate:
          `<b>${group.label || key}</b><br>` +
          "Energy: %{x:.3f} eV<br>Intensity: %{y:.4f}" +
          "<extra></extra>",
      } as PlotData);
      index += 1;
    });

    return { traces, keys: Array.from(groups.keys()) };
  }, [points]);

  const referenceTraces = useMemo<PlotData[]>(() => {
    return referenceCurves.map((curve) => ({
      type: "scattergl",
      mode: "lines",
      name: curve.label,
      x: curve.points.map((point) => point.energy),
      y: curve.points.map((point) => point.absorption),
      line: {
        color: curve.color ?? "#111827",
        width: 2.5,
      },
      hovertemplate:
        `<b>${curve.label}</b><br>` +
        "Energy: %{x:.3f} eV<br>Bare μ: %{y:.3f}" +
        "<extra></extra>",
      showlegend: true,
    })) as PlotData[];
  }, [referenceCurves]);

  const measurementTraceCount = groupedTraces.traces.length;

  const measurementEnergyExtent = useMemo(() => {
    if (points.length === 0) return null;
    const energies = points.map((point) => point.energy);
    return { min: Math.min(...energies), max: Math.max(...energies) };
  }, [points]);

  const measurementAbsorptionExtent = useMemo(() => {
    if (points.length === 0) return null;
    const absorptions = points.map((point) => point.absorption);
    return { min: Math.min(...absorptions), max: Math.max(...absorptions) };
  }, [points]);

  const combinedLayout = useMemo<Layout>(() => {
    const energyRange = measurementEnergyExtent
      ? [measurementEnergyExtent.min, measurementEnergyExtent.max]
      : energyStats &&
        energyStats.min !== null &&
        energyStats.max !== null &&
        typeof energyStats.min === "number" &&
        typeof energyStats.max === "number"
      ? [energyStats.min, energyStats.max]
      : undefined;

    const absorptionCandidates: number[] = [];
    if (typeof absorptionStats?.min === "number") absorptionCandidates.push(absorptionStats.min);
    if (typeof absorptionStats?.max === "number") absorptionCandidates.push(absorptionStats.max);
    if (measurementAbsorptionExtent) {
      absorptionCandidates.push(measurementAbsorptionExtent.min, measurementAbsorptionExtent.max);
    }
    points.forEach((point) => {
      absorptionCandidates.push(point.absorption);
    });

    const measurementRange = (() => {
      const finiteValues = absorptionCandidates.filter((value) => Number.isFinite(value));
      if (finiteValues.length >= 1) {
        const maxAbs = Math.max(...finiteValues, 0);
        const padding = maxAbs > 0 ? maxAbs * 0.1 : 0.1;
        return [0, maxAbs + padding];
      }
      return undefined;
    })();

    const normalizationShapes = normalizationRegions
      ? (() => {
          const shapes: Layout["shapes"] = [];
          const { pre, post } = normalizationRegions;
          if (pre && pre[0] !== pre[1]) {
            shapes.push({
              type: "rect",
              xref: "x",
              yref: "paper",
              x0: pre[0],
              x1: pre[1],
              y0: 0,
              y1: 1,
              fillcolor: "rgba(59, 130, 246, 0.12)",
              line: { width: 0 },
            });
          }
          if (post && post[0] !== post[1]) {
            shapes.push({
              type: "rect",
              xref: "x",
              yref: "paper",
              x0: post[0],
              x1: post[1],
              y0: 0,
              y1: 1,
              fillcolor: "rgba(16, 185, 129, 0.12)",
              line: { width: 0 },
            });
          }
          return shapes;
        })()
      : [];

    const newSelectionStyle = (() => {
      if (!selectionTarget) return undefined;
      const isPre = selectionTarget === "pre";
      const style: {
        mode: string;
        line: { color: string; width: number };
        fillcolor: string;
      } = {
        mode: "immediate",
        line: {
          color: isPre ? "rgba(59, 130, 246, 0.8)" : "rgba(16, 185, 129, 0.8)",
          width: 2,
        },
        fillcolor: isPre
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(16, 185, 129, 0.2)",
      };
      return style;
    })();

    return {
      dragmode: selectionTarget ? "select" : "pan",
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: "#111827",
        font: { color: "#f8fafc" },
      },
      paper_bgcolor: "#f8fafc",
      plot_bgcolor: "#ffffff",
      height,
      margin: { t: 40, r: 200, b: 64, l: 78, pad: 0 },
      font: {
        family: "Inter, system-ui, sans-serif",
        color: "#4b5563",
      },
      xaxis: {
        title: { text: "Energy (eV)", standoff: 18 },
        gridcolor: "rgba(148, 163, 184, 0.15)",
        zeroline: false,
        rangemode: "normal",
        range: energyRange,
      },
      yaxis: {
        title: { text: "Intensity", standoff: 18 },
        gridcolor: "rgba(148, 163, 184, 0.15)",
        zeroline: false,
        rangemode: "normal",
        range: measurementRange,
      },
      legend: {
        orientation: "v",
        yanchor: "top",
        xanchor: "left",
        x: 1.02,
        y: 1,
        bgcolor: "rgba(255,255,255,0.85)",
        borderwidth: 0,
        font: {
          size: 12,
        },
        borderradius: 12,
        itemclick: "toggle",
        itemdoubleclick: "toggleothers",
      },
      shapes: normalizationShapes,
      newselection: newSelectionStyle,
    } as unknown as Layout;
  }, [
    absorptionStats,
    energyStats,
    height,
    measurementAbsorptionExtent,
    measurementEnergyExtent,
    normalizationRegions,
    selectionTarget,
    points,
  ]);

  const handleSelected = useCallback(
    (event: PlotSelectionEvent) => {
      if (!onSelectionChange) return;
      if (!event?.points || event.points.length === 0) {
        onSelectionChange(null);
        return;
      }

      const measurementEnergies: number[] = [];
      const measurementAbsorptions: number[] = [];
      const geometryKeys = new Set<string>();

      event.points.forEach((point) => {
        if (typeof point.curveNumber === "number") {
          if (point.curveNumber >= measurementTraceCount) {
            return;
          }
          const key = groupedTraces.keys[point.curveNumber];
          if (key) {
            geometryKeys.add(key);
          }
        }
        if (typeof point.x === "number") {
          measurementEnergies.push(point.x);
        }
        if (typeof point.y === "number") {
          measurementAbsorptions.push(point.y);
        }
      });

      if (measurementEnergies.length === 0 || measurementAbsorptions.length === 0) {
        onSelectionChange(null);
        return;
      }

      const summary: SpectrumSelection = {
        energyMin: Math.min(...measurementEnergies),
        energyMax: Math.max(...measurementEnergies),
        absorptionMin: Math.min(...measurementAbsorptions),
        absorptionMax: Math.max(...measurementAbsorptions),
        pointCount: measurementEnergies.length,
        geometryKeys: Array.from(geometryKeys),
      };

      onSelectionChange(summary);
    },
    [groupedTraces.keys, measurementTraceCount, onSelectionChange],
  );

  const handleDeselect = useCallback(() => {
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
        Upload a spectrum CSV to preview data.
      </div>
    );
  }

  return (
    <Plot
      data={[...groupedTraces.traces, ...referenceTraces]}
      layout={combinedLayout}
      config={{
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: [
          "zoomIn2d",
          "zoomOut2d",
          "select2d",
          "lasso2d",
        ],
        selectdirection: selectionTarget ? "h" : "any",
        toImageButtonOptions: {
          filename: "nexafs-spectrum",
        },
      } as Record<string, unknown>}
      onSelected={handleSelected as (event: unknown) => void}
      onDeselect={handleDeselect}
      style={{ width: "100%", height }}
      useResizeHandler
    />
  );
}
