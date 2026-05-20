"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ReferenceCurve,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import type { Peak } from "~/components/plots/types";
import { showToast } from "~/components/ui/toast";

export type NexafsBrowseDataView = "od" | "absorption" | "beta" | "delta";

export interface UseNexafsSpectrumBrowseModelArgs {
  spectrumPoints: SpectrumPoint[];
}

export interface UseNexafsSpectrumBrowseModelResult {
  dataView: NexafsBrowseDataView;
  setDataView: (next: NexafsBrowseDataView) => void;
  plotPoints: SpectrumPoint[];
  edgeZeroOnePoints: SpectrumPoint[];
  absorptionPlotPoints: SpectrumPoint[];
  betaPoints: SpectrumPoint[] | null;
  deltaPoints: SpectrumPoint[] | null;
  spectrumYAxisQuantity: SpectrumYAxisQuantity;
  referenceCurves: ReferenceCurve[];
  normalizationRegions: { pre: [number, number] | null; post: [number, number] | null };
  showNormalizationShading: boolean;
  odAvailable: boolean;
  absorptionAvailable: boolean;
  betaAvailable: boolean;
  deltaAvailable: boolean;
}

/**
 * Maps persisted spectrum points to plot traces without recomputing normalization: OD, mu (mass absorption when stored else raw absorption), and beta use the values saved at upload time.
 *
 * @param spectrumPoints Rows from `mapDbSpectrumRowsToPoints` (energy-ascending), with optional `od`, `massabsorption`, `rawabs` merged into `absorption` for mu, and optional `beta`.
 * @returns View selection, per-basis `plotPoints` (y values in `absorption` for the plot stack), difference-spectrum roots aligned with the active basis, and availability flags for each basis toggle including optional KK `delta`.
 */
export function useNexafsSpectrumBrowseModel({
  spectrumPoints,
}: UseNexafsSpectrumBrowseModelArgs): UseNexafsSpectrumBrowseModelResult {
  const [dataView, setDataViewState] = useState<NexafsBrowseDataView>("od");
  const gateToastRef = useRef<Record<string, number>>({});

  const showGateToast = useCallback((key: string, message: string) => {
    const last = gateToastRef.current[key] ?? 0;
    const now = Date.now();
    if (now - last < 5000) return;
    gateToastRef.current[key] = now;
    showToast(message, "info");
  }, []);

  const storedMuPoints = spectrumPoints;

  const storedOdPoints = useMemo(
    () =>
      spectrumPoints
        .filter(
          (p) => typeof p.od === "number" && Number.isFinite(p.od),
        )
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

  const odAvailable = storedOdPoints.length > 0;
  const absorptionAvailable = storedMuPoints.some(
    (p) => typeof p.absorption === "number" && Number.isFinite(p.absorption),
  );
  const betaAvailable =
    storedBetaPoints !== null && storedBetaPoints.length > 0;
  const deltaAvailable =
    storedDeltaPoints !== null && storedDeltaPoints.length > 0;

  const absorptionPlotPoints = storedMuPoints;
  const edgeZeroOnePoints = storedOdPoints;
  const betaPoints = storedBetaPoints;
  const deltaPoints = storedDeltaPoints;

  const setDataView = useCallback(
    (next: NexafsBrowseDataView) => {
      if (next === "od") {
        if (!odAvailable) {
          showGateToast(
            "browse-od",
            "No stored optical density (OD) for this experiment.",
          );
          return;
        }
        setDataViewState("od");
        return;
      }
      if (next === "absorption") {
        if (!absorptionAvailable) {
          showGateToast(
            "browse-absorption",
            "No stored mass absorption or raw absorption for this experiment.",
          );
          return;
        }
        setDataViewState("absorption");
        return;
      }
      if (next === "beta") {
        if (!betaAvailable) {
          showGateToast(
            "browse-beta",
            "No stored beta values for this experiment.",
          );
          return;
        }
        setDataViewState("beta");
        return;
      }
      if (next === "delta") {
        if (!deltaAvailable) {
          showGateToast(
            "browse-delta",
            "No stored delta values for this experiment.",
          );
          return;
        }
        setDataViewState("delta");
        return;
      }
    },
    [
      odAvailable,
      absorptionAvailable,
      betaAvailable,
      deltaAvailable,
      showGateToast,
    ],
  );

  const plotPoints =
    dataView === "od"
      ? storedOdPoints
      : dataView === "beta"
        ? (storedBetaPoints ?? storedMuPoints)
        : dataView === "delta"
          ? (storedDeltaPoints ?? storedMuPoints)
          : storedMuPoints;

  const spectrumYAxisQuantity: SpectrumYAxisQuantity =
    dataView === "od"
      ? "optical-density"
      : dataView === "beta"
        ? "beta"
        : dataView === "delta"
          ? "delta"
          : "mass-absorption";

  return {
    dataView,
    setDataView,
    plotPoints,
    edgeZeroOnePoints,
    absorptionPlotPoints,
    betaPoints,
    deltaPoints,
    spectrumYAxisQuantity,
    referenceCurves: [],
    normalizationRegions: { pre: null, post: null },
    showNormalizationShading: false,
    odAvailable,
    absorptionAvailable,
    betaAvailable,
    deltaAvailable,
  };
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
