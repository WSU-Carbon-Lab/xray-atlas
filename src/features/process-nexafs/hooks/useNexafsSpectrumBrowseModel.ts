"use client";

import { useCallback, useMemo } from "react";
import type {
  ReferenceCurve,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import { usePlotDataRail } from "~/components/plots/data-rail";
import type { Peak } from "~/components/plots/types";
import { showToast } from "~/components/ui/toast";
import {
  assessPlotChannelAvailability,
  buildPlotPointsForChannel,
  isPlotChannelAvailable,
  legacyDataViewToPlotChannel,
  plotChannelToLegacyDataView,
  type NexafsBrowseDataView,
  type NexafsPlotChannelAvailability,
  type NexafsPlotChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";
import { NEXAFS_PLOT_DATA_RAIL_DEFINITION } from "~/features/process-nexafs/nexafs-plot-data-rail-config";

export type { NexafsBrowseDataView, NexafsPlotChannelId };

export interface UseNexafsSpectrumBrowseModelArgs {
  spectrumPoints: SpectrumPoint[];
  stoichiometryFormula?: string | null;
}

export interface UseNexafsSpectrumBrowseModelResult {
  plotChannel: NexafsPlotChannelId;
  setPlotChannel: (next: NexafsPlotChannelId) => void;
  /** @deprecated Prefer `plotChannel`; retained for bare-atom and normalization branches. */
  dataView: NexafsBrowseDataView;
  /** @deprecated Prefer `setPlotChannel`. */
  setDataView: (next: NexafsBrowseDataView) => void;
  plotPoints: SpectrumPoint[];
  edgeZeroOnePoints: SpectrumPoint[];
  absorptionPlotPoints: SpectrumPoint[];
  betaPoints: SpectrumPoint[] | null;
  deltaPoints: SpectrumPoint[] | null;
  spectrumYAxisQuantity: SpectrumYAxisQuantity;
  channelAvailability: NexafsPlotChannelAvailability;
  referenceCurves: ReferenceCurve[];
  normalizationRegions: { pre: [number, number] | null; post: [number, number] | null };
  showNormalizationShading: boolean;
  odAvailable: boolean;
  absorptionAvailable: boolean;
  betaAvailable: boolean;
  deltaAvailable: boolean;
}

/**
 * Maps persisted spectrum points to plot traces without recomputing normalization.
 *
 * @param spectrumPoints Rows from `mapDbSpectrumRowsToPoints` (energy-ascending).
 * @param stoichiometryFormula Optional formula for derived optical-constant channels.
 */
export function useNexafsSpectrumBrowseModel({
  spectrumPoints,
  stoichiometryFormula = null,
}: UseNexafsSpectrumBrowseModelArgs): UseNexafsSpectrumBrowseModelResult {
  const channelAvailability = useMemo(
    () =>
      assessPlotChannelAvailability(
        spectrumPoints,
        Boolean(stoichiometryFormula?.trim()),
      ),
    [spectrumPoints, stoichiometryFormula],
  );

  const isChannelAvailable = useCallback(
    (id: NexafsPlotChannelId) =>
      isPlotChannelAvailable(id, channelAvailability),
    [channelAvailability],
  );

  const buildPlotPoints = useCallback(
    (id: NexafsPlotChannelId) =>
      buildPlotPointsForChannel(id, spectrumPoints, stoichiometryFormula),
    [spectrumPoints, stoichiometryFormula],
  );

  const onUnavailableSelect = useCallback(
    (_id: NexafsPlotChannelId, _message: string) => {
      showToast(NEXAFS_GATE_MESSAGE(_id), "info");
    },
    [],
  );

  const rail = usePlotDataRail({
    definition: NEXAFS_PLOT_DATA_RAIL_DEFINITION,
    isChannelAvailable,
    buildPlotPoints,
    onUnavailableSelect,
  });

  const setPlotChannel = rail.setActiveChannelId;

  const setDataView = useCallback(
    (next: NexafsBrowseDataView) => {
      const mapped = legacyDataViewToPlotChannel(next);
      setPlotChannel(mapped);
    },
    [setPlotChannel],
  );

  const storedOdPoints = useMemo(
    () =>
      spectrumPoints
        .filter((p) => typeof p.od === "number" && Number.isFinite(p.od))
        .map((p) => ({ ...p, absorption: p.od! })),
    [spectrumPoints],
  );

  const storedBetaPoints = useMemo((): SpectrumPoint[] | null => {
    const rows = spectrumPoints.filter(
      (p) => typeof p.beta === "number" && Number.isFinite(p.beta),
    );
    if (rows.length === 0) return null;
    return rows.map((p) => ({ ...p, absorption: p.beta! }));
  }, [spectrumPoints]);

  const storedDeltaPoints = useMemo((): SpectrumPoint[] | null => {
    const rows = spectrumPoints.filter(
      (p) => typeof p.delta === "number" && Number.isFinite(p.delta),
    );
    if (rows.length === 0) return null;
    return rows.map((p) => ({ ...p, absorption: p.delta! }));
  }, [spectrumPoints]);

  const plotChannel = rail.activeChannelId;
  const dataView = plotChannelToLegacyDataView(plotChannel);

  return {
    plotChannel,
    setPlotChannel,
    dataView,
    setDataView,
    plotPoints: rail.plotPoints,
    edgeZeroOnePoints: storedOdPoints,
    absorptionPlotPoints: spectrumPoints,
    betaPoints: storedBetaPoints,
    deltaPoints: storedDeltaPoints,
    spectrumYAxisQuantity: rail.yAxisQuantity,
    channelAvailability,
    referenceCurves: [],
    normalizationRegions: { pre: null, post: null },
    showNormalizationShading: false,
    odAvailable: channelAvailability.normalized,
    absorptionAvailable: channelAvailability.massAbsorption,
    betaAvailable: channelAvailability.beta,
    deltaAvailable: channelAvailability.delta,
  };
}

function NEXAFS_GATE_MESSAGE(channel: NexafsPlotChannelId): string {
  if (channel === "raw") {
    return "No raw upload column on this experiment.";
  }
  if (channel === "normalized") {
    return "No stored optical density (OD) for this experiment.";
  }
  if (channel === "mass-absorption") {
    return "No stored mass absorption for this experiment.";
  }
  if (channel === "delta") {
    return "No stored delta values for this experiment.";
  }
  if (
    channel === "beta" ||
    channel === "f2" ||
    channel === "im-epsilon" ||
    channel === "im-chi"
  ) {
    return "No stored beta values for this experiment.";
  }
  return "Select a molecule formula and upload beta and delta to use derived optical constants.";
}

export function mapPeaksetsToPlotPeaks(
  rows: Array<{ id: string; energyev: number; intensity: number | null }>,
): Peak[] {
  return rows.map((p) => ({
    id: p.id,
    energy: p.energyev,
    amplitude: p.intensity ?? undefined,
  }));
}
