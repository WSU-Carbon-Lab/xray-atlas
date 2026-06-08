import type {
  DifferenceSpectrum,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import { groupPointsByGeometry } from "~/components/plots/utils/trace-utils";
import { channelDefinitionById } from "~/components/plots/data-rail/plot-data-rail-types";
import {
  buildPlotPointsForChannel,
  type NexafsPlotChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";
import { NEXAFS_PLOT_DATA_RAIL_DEFINITION } from "~/features/process-nexafs/nexafs-plot-data-rail-config";
import { filterPointsByGeometryKeys, geometryKeyFromPoint } from "./geometry-keys";

export type DashboardPlotDatasetInput = {
  experimentId: string;
  label: string;
  spectrumPoints: SpectrumPoint[];
  chemicalFormula: string | null;
};

export type DashboardPlotTraceSpec = {
  label: string;
  points: SpectrumPoint[];
};

export type DashboardPlotModel = {
  points: SpectrumPoint[];
  primaryTraceLabel: string | undefined;
  companionSpectra: DifferenceSpectrum[];
  yAxisQuantity: SpectrumYAxisQuantity;
  isEmpty: boolean;
};

function traceHasFiniteAbsorption(points: readonly SpectrumPoint[]): boolean {
  return points.some(
    (point) =>
      Number.isFinite(point.energy) && Number.isFinite(point.absorption),
  );
}

/**
 * Expands one catalog dataset into one trace per geometry after channel mapping.
 */
export function expandDatasetTraces(
  dataset: DashboardPlotDatasetInput,
  channelId: NexafsPlotChannelId,
  selectedGeometryKeys: readonly string[],
): DashboardPlotTraceSpec[] {
  const filtered = filterPointsByGeometryKeys(
    dataset.spectrumPoints,
    selectedGeometryKeys,
  );
  const channelPoints = buildPlotPointsForChannel(
    channelId,
    filtered,
    dataset.chemicalFormula,
  );
  if (!traceHasFiniteAbsorption(channelPoints)) {
    return [];
  }

  const groups = groupPointsByGeometry(channelPoints);
  if (groups.size <= 1) {
    const onlyGroup = groups.values().next().value;
    const geomSuffix =
      onlyGroup != null && groups.has("fixed") === false
        ? ` — ${onlyGroup.label}`
        : "";
    return [
      {
        label: `${dataset.label}${geomSuffix}`.trim(),
        points: channelPoints,
      },
    ];
  }

  const traces: DashboardPlotTraceSpec[] = [];
  for (const [key, group] of groups) {
    const points = channelPoints.filter((point) => {
      if (key === "fixed") {
        return geometryKeyFromPoint(point) === "fixed";
      }
      return geometryKeyFromPoint(point) === key;
    });
    if (!traceHasFiniteAbsorption(points)) {
      continue;
    }
    traces.push({
      label: `${dataset.label} — ${group.label}`,
      points,
    });
  }
  return traces;
}

/**
 * Builds a multi-dataset overlay model for `SpectrumPlot` (primary trace plus companions).
 */
export function buildDashboardPlotModel(params: {
  datasets: readonly DashboardPlotDatasetInput[];
  channelId: NexafsPlotChannelId;
  selectedGeometryKeys: readonly string[];
}): DashboardPlotModel {
  const yAxisQuantity = channelDefinitionById(
    NEXAFS_PLOT_DATA_RAIL_DEFINITION,
    params.channelId,
  ).yAxisQuantity;

  const allTraces: DashboardPlotTraceSpec[] = [];
  for (const dataset of params.datasets) {
    allTraces.push(
      ...expandDatasetTraces(
        dataset,
        params.channelId,
        params.selectedGeometryKeys,
      ),
    );
  }

  const finiteTraces = allTraces.filter((trace) =>
    traceHasFiniteAbsorption(trace.points),
  );
  if (finiteTraces.length === 0) {
    return {
      points: [],
      primaryTraceLabel: undefined,
      companionSpectra: [],
      yAxisQuantity,
      isEmpty: true,
    };
  }

  const [primary, ...rest] = finiteTraces;
  if (primary == null) {
    return {
      points: [],
      primaryTraceLabel: undefined,
      companionSpectra: [],
      yAxisQuantity,
      isEmpty: true,
    };
  }
  return {
    points: primary.points,
    primaryTraceLabel: primary.label,
    companionSpectra: rest.map((trace) => ({
      label: trace.label,
      preferred: false,
      points: trace.points,
    })),
    yAxisQuantity,
    isEmpty: false,
  };
}
