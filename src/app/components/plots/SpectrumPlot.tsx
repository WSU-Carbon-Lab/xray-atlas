"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
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

type Peak = {
  energy: number;
  id?: string;
};

type DifferenceSpectrum = {
  label: string;
  points: SpectrumPoint[];
  preferred?: boolean;
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
  peaks?: Peak[];
  selectedPeakId?: string | null;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakDelete?: (peakId: string) => void;
  onPeakAdd?: (energy: number) => void;
  isManualPeakMode?: boolean;
  differenceSpectra?: DifferenceSpectrum[];
  showThetaData?: boolean;
  showPhiData?: boolean;
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
  peaks = [],
  selectedPeakId,
  onPeakUpdate,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  isManualPeakMode = false,
  differenceSpectra = [],
  showThetaData = false,
  showPhiData = false,
}: SpectrumPlotProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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

    // Filter points based on showThetaData and showPhiData
    // If difference spectra are being shown, don't show original data
    const showOriginalData =
      !differenceSpectra || differenceSpectra.length === 0;

    const filteredPoints = showOriginalData
      ? points.filter((point) => {
          const hasGeometry =
            typeof point.theta === "number" &&
            Number.isFinite(point.theta) &&
            typeof point.phi === "number" &&
            Number.isFinite(point.phi);

          if (!hasGeometry) {
            // Show fixed geometry points only if neither theta nor phi data is shown
            return !showThetaData && !showPhiData;
          }

          // If showing theta data, show all points (they all have theta)
          if (showThetaData) {
            return true;
          }

          // If showing phi data, show all points (they all have phi)
          if (showPhiData) {
            return true;
          }

          // If neither is shown, show all points (default behavior)
          return true;
        })
      : [];

    filteredPoints.forEach((point) => {
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
  }, [points, showThetaData, showPhiData, differenceSpectra]);

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

  const differenceTraces = useMemo<PlotData[]>(() => {
    return differenceSpectra.map((diff, index) => {
      const isPreferred = diff.preferred ?? false;
      const color = isPreferred
        ? "#d7263d"
        : (COLORS[(index + 8) % COLORS.length] ??
          `hsl(${((index + 8) * 57) % 360} 65% 55%)`);
      return {
        type: "scattergl",
        mode: "lines",
        name: diff.label + (isPreferred ? " ⭐" : ""),
        x: diff.points.map((point) => point.energy),
        y: diff.points.map((point) => point.absorption),
        line: {
          color,
          width: isPreferred ? 2.5 : 2,
          dash: "dash",
        },
        hovertemplate:
          `<b>${diff.label}</b><br>` +
          "Energy: %{x:.3f} eV<br>Difference: %{y:.4f}" +
          "<extra></extra>",
        showlegend: true,
      } as PlotData;
    });
  }, [differenceSpectra]);

  const measurementTraceCount = groupedTraces.traces.length;
  const uniqueGeometryCount = groupedTraces.traces.length;
  const totalLegendItems =
    uniqueGeometryCount +
    (referenceCurves.length > 0 ? 1 : 0) +
    differenceSpectra.length;

  const measurementEnergyExtent = useMemo(() => {
    // If difference spectra are shown, use their extent instead
    if (differenceSpectra.length > 0) {
      const allEnergies: number[] = [];
      differenceSpectra.forEach((spec) => {
        spec.points.forEach((point) => {
          allEnergies.push(point.energy);
        });
      });
      if (allEnergies.length > 0) {
        return { min: Math.min(...allEnergies), max: Math.max(...allEnergies) };
      }
    }

    if (points.length === 0) return null;
    const energies = points.map((point) => point.energy);
    return { min: Math.min(...energies), max: Math.max(...energies) };
  }, [points, differenceSpectra]);

  const measurementAbsorptionExtent = useMemo(() => {
    // If difference spectra are shown, use their extent instead
    if (differenceSpectra.length > 0) {
      const allAbsorptions: number[] = [];
      differenceSpectra.forEach((spec) => {
        spec.points.forEach((point) => {
          allAbsorptions.push(point.absorption);
        });
      });
      if (allAbsorptions.length > 0) {
        return {
          min: Math.min(...allAbsorptions),
          max: Math.max(...allAbsorptions),
        };
      }
    }

    if (points.length === 0) return null;
    const absorptions = points.map((point) => point.absorption);
    return { min: Math.min(...absorptions), max: Math.max(...absorptions) };
  }, [points, differenceSpectra]);

  const combinedLayout = useMemo<Layout>(() => {
    const energyRange = measurementEnergyExtent
      ? [measurementEnergyExtent.min, measurementEnergyExtent.max]
      : energyStats?.min !== null &&
          energyStats?.max !== null &&
          typeof energyStats?.min === "number" &&
          typeof energyStats?.max === "number"
        ? [energyStats.min, energyStats.max]
        : undefined;

    // Calculate measurement range - if difference spectra are shown, use their range
    let measurementRange: [number, number] | undefined;
    if (differenceSpectra.length > 0 && measurementAbsorptionExtent) {
      const minAbs = measurementAbsorptionExtent.min;
      const maxAbs = measurementAbsorptionExtent.max;
      const padding = Math.max(Math.abs(maxAbs - minAbs) * 0.1, 0.1);
      measurementRange = [minAbs - padding, maxAbs + padding];
    } else {
      const absorptionCandidates: number[] = [];
      if (typeof absorptionStats?.min === "number")
        absorptionCandidates.push(absorptionStats.min);
      if (typeof absorptionStats?.max === "number")
        absorptionCandidates.push(absorptionStats.max);
      if (measurementAbsorptionExtent) {
        absorptionCandidates.push(
          measurementAbsorptionExtent.min,
          measurementAbsorptionExtent.max,
        );
      }
      points.forEach((point) => {
        absorptionCandidates.push(point.absorption);
      });

      const finiteValues = absorptionCandidates.filter((value) =>
        Number.isFinite(value),
      );
      if (finiteValues.length >= 1) {
        const maxAbs = Math.max(...finiteValues, 0);
        const padding = maxAbs > 0 ? maxAbs * 0.1 : 0.1;
        measurementRange = [0, maxAbs + padding];
      }
    }

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

    const peakShapes = peaks.map((peak) => {
      const peakId = peak.id ?? `peak-${peak.energy}`;
      const isSelected = selectedPeakId === peakId;
      return {
        type: "line" as const,
        xref: "x" as const,
        yref: "paper" as const,
        x0: peak.energy,
        x1: peak.energy,
        y0: 0,
        y1: 1,
        line: {
          color: isSelected ? "#a60f2d" : "#6b7280",
          width: isSelected ? 1.5 : 1,
          dash: isSelected ? "solid" : "dash",
        },
        layer: "above" as const,
        editable: true,
        name: peakId,
      };
    });

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
      dragmode: isManualPeakMode ? false : selectionTarget ? "select" : "pan",
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: isDark ? "#111827" : "#f8fafc",
        font: { color: isDark ? "#f8fafc" : "#111827" },
      },
      paper_bgcolor: isDark ? "#1f2937" : "#f8fafc",
      plot_bgcolor: isDark ? "#111827" : "#ffffff",
      title: {
        text: "",
      },
      subtitle: {
        text: "",
      } as { text: string },
      annotations: [], // Remove any default annotations that might show as subtitle
      height,
      margin: { t: 10, r: 20, b: 120, l: 78, pad: 0 },
      font: {
        family: "Inter, system-ui, sans-serif",
        color: isDark ? "#d1d5db" : "#4b5563",
      },
      xaxis: {
        title: { text: "Energy (eV)", standoff: 18 },
        gridcolor: isDark
          ? "rgba(75, 85, 99, 0.3)"
          : "rgba(148, 163, 184, 0.15)",
        zeroline: false,
        rangemode: "normal",
        range: energyRange,
      },
      yaxis: {
        title: { text: "Intensity", standoff: 18 },
        gridcolor: isDark
          ? "rgba(75, 85, 99, 0.3)"
          : "rgba(148, 163, 184, 0.15)",
        zeroline: false,
        rangemode: "normal",
        range: measurementRange,
      },
      legend: {
        orientation: "h",
        yanchor: "bottom",
        xanchor: "center",
        x: 0.5,
        y: -0.35,
        bgcolor: isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255,255,255,0.9)",
        borderwidth: 1,
        bordercolor: isDark
          ? "rgba(75, 85, 99, 0.5)"
          : "rgba(148, 163, 184, 0.3)",
        font: {
          size: 13,
        },
        borderradius: 8,
        itemclick: "toggle",
        itemdoubleclick: "toggleothers",
        ...(totalLegendItems > 0 && {
          tracegroupgap: 10,
        }),
      },
      shapes: [...normalizationShapes, ...peakShapes],
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
    peaks,
    selectedPeakId,
    referenceCurves,
    totalLegendItems,
    isDark,
    differenceSpectra,
    showThetaData,
    showPhiData,
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

      if (
        measurementEnergies.length === 0 ||
        measurementAbsorptions.length === 0
      ) {
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

  const plotRef = useRef<HTMLDivElement>(null);

  // Handle peak clicks, keyboard deletion, and drag-to-edit
  useEffect(() => {
    if (!plotRef.current) return;

    const plotElement = plotRef.current.querySelector(".js-plotly-plot");
    if (!plotElement) return;

    // Handle keyboard Delete key - use global listener to work during drag operations
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if a peak is selected and we're not typing in an input
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedPeakId &&
        onPeakDelete &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        event.stopPropagation();
        onPeakDelete(selectedPeakId);
      }
    };

    // Make plot container focusable for keyboard events
    if (plotRef.current instanceof HTMLElement) {
      plotRef.current.setAttribute("tabindex", "0");
      plotRef.current.addEventListener("keydown", handleKeyDown);
    }

    // Also add global keyboard listener to catch Delete key even during drag operations
    window.addEventListener("keydown", handleKeyDown);

    // Handle peak clicks - detect clicks on or near peak lines
    const handlePlotClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !plotElement) return;

      // Get click position and convert to data coordinates
      const rect = (plotElement as HTMLElement).getBoundingClientRect();
      const clickXPixel = event.clientX - rect.left;

      // Convert pixel coordinates to data coordinates
      const xAxis = combinedLayout.xaxis;
      const yAxis = combinedLayout.yaxis;
      const xAxisRange = xAxis?.range;
      const yAxisRange = yAxis?.range;
      if (
        xAxisRange &&
        typeof xAxisRange === "object" &&
        Array.isArray(xAxisRange) &&
        xAxisRange.length === 2 &&
        yAxisRange &&
        typeof yAxisRange === "object" &&
        Array.isArray(yAxisRange) &&
        yAxisRange.length === 2
      ) {
        const xMinRaw: unknown = xAxisRange[0];
        const xMaxRaw: unknown = xAxisRange[1];
        const yMinRaw: unknown = yAxisRange[0];
        const yMaxRaw: unknown = yAxisRange[1];
        if (
          typeof xMinRaw !== "number" ||
          typeof xMaxRaw !== "number" ||
          typeof yMinRaw !== "number" ||
          typeof yMaxRaw !== "number"
        )
          return;
        const xMin = xMinRaw;
        const xMax = xMaxRaw;
        const leftMargin = 78;
        const rightMargin = 20;
        const plotWidth = rect.width - leftMargin - rightMargin;
        const xScale = plotWidth / (xMax - xMin);
        const dataX: number = xMin + (clickXPixel - leftMargin) / xScale;

        // If in manual peak mode, add a peak at the clicked location
        if (isManualPeakMode && onPeakAdd) {
          event.preventDefault();
          event.stopPropagation();
          onPeakAdd(dataX);
          return;
        }

        // Otherwise, handle peak selection (existing behavior)
        if (!onPeakSelect) return;

        // Check if click was directly on a shape (peak line)
        const isShapeElement =
          target.tagName === "path" ||
          target.closest('g[class*="shape"]') !== null ||
          target.closest('path[fill="none"]') !== null;

        // Find closest peak (within reasonable threshold)
        let closestPeak: Peak | null = null;
        let minDistance = Infinity;
        // Use 1% of the x-axis range as threshold, or 2 eV, whichever is smaller
        const range = xMax - xMin;
        const threshold = Math.min(range * 0.01, 2.0);

        for (const peak of peaks) {
          const distance = Math.abs(peak.energy - dataX);
          if (distance < minDistance && distance < threshold) {
            minDistance = distance;
            closestPeak = peak;
          }
        }

        // If clicked on a shape element or near a peak, select it
        if (closestPeak || isShapeElement) {
          if (closestPeak) {
            const peakId: string =
              closestPeak.id ?? `peak-${closestPeak.energy}`;
            const currentSelectedId = selectedPeakId;
            // Toggle selection: if already selected, deselect; otherwise select
            onPeakSelect(currentSelectedId === peakId ? null : peakId);
            // Focus the plot container for keyboard events
            if (plotRef.current instanceof HTMLElement) {
              plotRef.current.focus();
            }
          } else if (isShapeElement) {
            // If we clicked on a shape but couldn't identify which peak,
            // try to find it by checking all peaks (fallback)
            peaks.forEach((peak) => {
              const distance = Math.abs(peak.energy - dataX);
              if (distance < 2.0) {
                const peakId: string = peak.id ?? `peak-${peak.energy}`;
                const currentSelectedId = selectedPeakId;
                onPeakSelect(currentSelectedId === peakId ? null : peakId);
                if (plotRef.current instanceof HTMLElement) {
                  plotRef.current.focus();
                }
              }
            });
          }
        }
      }
    };

    // Also listen for Plotly's click event as a fallback
    const handlePlotlyClick = (event: Event) => {
      if (!onPeakSelect) return;

      const plotlyClickEvent = event as unknown as {
        points?: Array<{
          x?: number;
          y?: number;
        }>;
        event?: {
          target?: HTMLElement;
        };
      };

      const clickX = plotlyClickEvent.points?.[0]?.x;
      if (clickX === undefined) return;

      const target = plotlyClickEvent.event?.target as HTMLElement | null;
      if (target) {
        // Check if click was on a shape
        const isShapeClick =
          target.tagName === "path" ||
          target.closest("g[class*='shape']") !== null;

        if (isShapeClick) {
          // Find the peak closest to the click X coordinate
          let closestPeak: Peak | null = null;
          let minDistance = Infinity;

          for (const peak of peaks) {
            const distance = Math.abs(peak.energy - clickX);
            if (distance < minDistance && distance < 2.0) {
              minDistance = distance;
              closestPeak = peak;
            }
          }

          if (closestPeak) {
            const peakId: string =
              closestPeak.id ?? `peak-${closestPeak.energy}`;
            const currentSelectedId = selectedPeakId;
            onPeakSelect(currentSelectedId === peakId ? null : peakId);
            // Focus the plot container for keyboard events
            if (plotRef.current instanceof HTMLElement) {
              plotRef.current.focus();
            }
          }
        }
      }
    };

    // Handle peak drag-to-edit via Plotly's relayout event
    const handleRelayout = (event: Event) => {
      if (!onPeakUpdate) return;

      const plotlyEvent = event as unknown as {
        data?: Record<string, unknown>;
        update?: Record<string, unknown>;
      };

      const updateData = plotlyEvent.data ?? plotlyEvent.update;
      if (!updateData || typeof updateData !== "object") return;

      // Check for shape updates (when peaks are dragged)
      Object.keys(updateData).forEach((key) => {
        if (
          key.startsWith("shapes[") &&
          (key.includes(".x0") || key.includes(".x1"))
        ) {
          const regex = /shapes\[(\d+)\]\.x[01]/;
          const match = regex.exec(key);
          if (match) {
            const shapeIndex = parseInt(match[1] ?? "0", 10);
            const newEnergy = updateData[key];
            if (typeof newEnergy === "number") {
              const shape = combinedLayout.shapes?.[shapeIndex];
              if (shape?.type === "line" && shape.name) {
                const peakId: string = shape.name;
                const originalPeak = peaks.find((p) => {
                  const pId = p.id ?? `peak-${p.energy}`;
                  return pId === peakId;
                });
                if (
                  originalPeak &&
                  Math.abs(originalPeak.energy - newEnergy) > 0.01
                ) {
                  const roundedEnergy = Math.round(newEnergy * 100) / 100;
                  onPeakUpdate(peakId, roundedEnergy);
                }
              }
            }
          }
        }
      });
    };

    const safeRelayoutHandler = (e: Event) => {
      try {
        handleRelayout(e);
      } catch (error) {
        console.warn("Error handling plotly relayout:", error);
      }
    };

    plotElement.addEventListener(
      "plotly_click",
      handlePlotlyClick as EventListener,
    );
    plotElement.addEventListener(
      "click",
      handlePlotClick as EventListener,
      true,
    ); // Use capture phase
    if (onPeakUpdate) {
      plotElement.addEventListener("plotly_relayout", safeRelayoutHandler);
    }

    return () => {
      plotElement.removeEventListener(
        "plotly_click",
        handlePlotlyClick as EventListener,
      );
      plotElement.removeEventListener(
        "click",
        handlePlotClick as EventListener,
        true,
      );
      if (onPeakUpdate) {
        plotElement.removeEventListener("plotly_relayout", safeRelayoutHandler);
      }
      if (plotRef.current instanceof HTMLElement) {
        plotRef.current.removeEventListener("keydown", handleKeyDown);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    onPeakUpdate,
    peaks,
    combinedLayout.shapes,
    selectedPeakId,
    onPeakSelect,
    onPeakDelete,
    onPeakAdd,
    isManualPeakMode,
    combinedLayout.xaxis,
    combinedLayout.yaxis,
  ]);


  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
        Upload a spectrum CSV to preview data.
      </div>
    );
  }

  return (
    <div
      ref={plotRef}
      className="focus:ring-wsu-crimson/20 rounded-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
      onClick={() => {
        // Focus the container when clicked to enable keyboard events
        if (plotRef.current instanceof HTMLElement) {
          plotRef.current.focus();
        }
      }}
    >
      <Plot
        data={[
          ...groupedTraces.traces,
          ...referenceTraces,
          ...differenceTraces,
        ]}
        layout={combinedLayout}
        config={
          {
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
            editable: true,
          } as Record<string, unknown>
        }
        onSelected={handleSelected as (event: unknown) => void}
        onDeselect={handleDeselect}
        style={{ width: "100%", height }}
        useResizeHandler
      />
    </div>
  );
}
