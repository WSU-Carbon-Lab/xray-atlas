"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ReferenceCurve,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import type { Peak } from "~/components/plots/types";
import {
  calculateBareAtomAbsorption,
  computeBetaIndex,
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
  defaultNormalizationRangesFromSpectrum,
} from "~/features/process-nexafs/utils";
import type { BareAtomPoint } from "~/features/process-nexafs/types";
import { defaultDatasetViewNormalizationTypes } from "~/features/process-nexafs/types";
import { showToast } from "~/components/ui/toast";

export type NexafsBrowseDataView = "od" | "absorption" | "beta";

export interface UseNexafsSpectrumBrowseModelArgs {
  spectrumPoints: SpectrumPoint[];
  chemicalFormula: string | null;
}

export interface UseNexafsSpectrumBrowseModelResult {
  dataView: NexafsBrowseDataView;
  setDataView: (next: NexafsBrowseDataView) => void;
  showBareAtomOverlay: boolean;
  setShowBareAtomOverlay: (v: boolean) => void;
  plotPoints: SpectrumPoint[];
  edgeZeroOnePoints: SpectrumPoint[];
  absorptionPlotPoints: SpectrumPoint[];
  betaPoints: SpectrumPoint[] | null;
  spectrumYAxisQuantity: SpectrumYAxisQuantity;
  referenceCurves: ReferenceCurve[];
  normalizationRegions: { pre: [number, number] | null; post: [number, number] | null };
  showNormalizationShading: boolean;
  absorptionAvailable: boolean;
  betaAvailable: boolean;
  bareAtomLoading: boolean;
  bareAtomError: string | null;
  bareAtomReady: boolean;
}

/**
 * Derives OD, normalized mu, and beta plot series from uploaded spectrum points plus optional bare-atom physics, mirroring the contribute workflow but without mutating dataset state.
 *
 * @param spectrumPoints Energy-ordered samples (typically mapped from `spectrumpoints` rows).
 * @param chemicalFormula When non-empty, enables async bare-atom curve generation for overlays and beta.
 * @returns View state, derived `plotPoints`, axis quantity, optional reference curves, and default normalization band extents for read-only shading.
 */
export function useNexafsSpectrumBrowseModel({
  spectrumPoints,
  chemicalFormula,
}: UseNexafsSpectrumBrowseModelArgs): UseNexafsSpectrumBrowseModelResult {
  const normalizationTypes = defaultDatasetViewNormalizationTypes();
  const absorptionNormType = normalizationTypes.absorption;
  const betaNormType = normalizationTypes.beta;

  const [dataView, setDataViewState] = useState<NexafsBrowseDataView>("od");
  const [showBareAtomOverlay, setShowBareAtomOverlay] = useState(false);
  const [bareAtomPoints, setBareAtomPoints] = useState<BareAtomPoint[] | null>(
    null,
  );
  const [bareAtomLoading, setBareAtomLoading] = useState(false);
  const [bareAtomError, setBareAtomError] = useState<string | null>(null);
  const gateToastRef = useRef<Record<string, number>>({});

  const showGateToast = useCallback((key: string, message: string) => {
    const last = gateToastRef.current[key] ?? 0;
    const now = Date.now();
    if (now - last < 5000) return;
    gateToastRef.current[key] = now;
    showToast(message, "info");
  }, []);

  const normalizationRegions = useMemo(() => {
    const def = defaultNormalizationRangesFromSpectrum(spectrumPoints);
    return {
      pre: def?.pre ?? null,
      post: def?.post ?? null,
    };
  }, [spectrumPoints]);

  const zeroOneComputation = useMemo(() => {
    if (
      spectrumPoints.length === 0 ||
      !normalizationRegions.pre ||
      !normalizationRegions.post
    ) {
      return null;
    }
    return computeZeroOneNormalization(
      spectrumPoints,
      normalizationRegions.pre,
      normalizationRegions.post,
    );
  }, [spectrumPoints, normalizationRegions.pre, normalizationRegions.post]);

  useEffect(() => {
    const formula = chemicalFormula?.trim() ?? "";
    if (!formula || spectrumPoints.length === 0) {
      setBareAtomPoints(null);
      setBareAtomError(null);
      setBareAtomLoading(false);
      return;
    }
    let cancelled = false;
    setBareAtomLoading(true);
    setBareAtomError(null);
    void calculateBareAtomAbsorption(formula, spectrumPoints)
      .then((pts) => {
        if (!cancelled) {
          setBareAtomPoints(pts);
          setBareAtomLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBareAtomError(
            err instanceof Error ? err.message : "Bare atom calculation failed",
          );
          setBareAtomPoints(null);
          setBareAtomLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chemicalFormula, spectrumPoints]);

  const bareAtomComputation = useMemo(() => {
    if (
      spectrumPoints.length === 0 ||
      !normalizationRegions.pre ||
      !normalizationRegions.post ||
      !bareAtomPoints ||
      bareAtomPoints.length === 0
    ) {
      return null;
    }
    const preRange = normalizationRegions.pre;
    const postRange = normalizationRegions.post;
    const preCount = spectrumPoints.filter(
      (p) => p.energy >= preRange[0] && p.energy <= preRange[1],
    ).length;
    const postCount = spectrumPoints.filter(
      (p) => p.energy >= postRange[0] && p.energy <= postRange[1],
    ).length;
    if (preCount === 0 || postCount === 0) return null;
    return computeNormalizationForExperiment(
      spectrumPoints,
      bareAtomPoints,
      preCount,
      postCount,
    );
  }, [
    spectrumPoints,
    normalizationRegions.pre,
    normalizationRegions.post,
    bareAtomPoints,
  ]);

  const edgeZeroOnePoints = useMemo(
    () => zeroOneComputation?.normalizedPoints ?? spectrumPoints,
    [zeroOneComputation, spectrumPoints],
  );

  const absorptionPlotPoints =
    absorptionNormType === "bare-atom"
      ? (bareAtomComputation?.normalizedPoints ?? edgeZeroOnePoints)
      : (zeroOneComputation?.normalizedPoints ?? edgeZeroOnePoints);

  const betaMuLike = useMemo(() => {
    const primary =
      betaNormType === "bare-atom"
        ? bareAtomComputation?.normalizedPoints
        : zeroOneComputation?.normalizedPoints;
    if (primary && primary.length > 0) return primary;
    return zeroOneComputation?.normalizedPoints ?? spectrumPoints;
  }, [
    betaNormType,
    bareAtomComputation,
    zeroOneComputation,
    spectrumPoints,
  ]);

  const betaPoints = useMemo(() => {
    if (!bareAtomPoints?.length) return null;
    if (betaMuLike.length === 0) return null;
    return computeBetaIndex(
      betaMuLike,
      betaMuLike.map((p) => p.energy),
      bareAtomPoints,
    );
  }, [bareAtomPoints, betaMuLike]);

  const bareAtomBetaReferencePoints = useMemo((): SpectrumPoint[] | null => {
    if (!bareAtomPoints?.length) return null;
    const asSpectrum: SpectrumPoint[] = bareAtomPoints.map((p) => ({
      energy: p.energy,
      absorption: p.absorption,
    }));
    const computed = computeBetaIndex(
      asSpectrum,
      asSpectrum.map((p) => p.energy),
      bareAtomPoints,
    );
    return computed.length > 0 ? computed : null;
  }, [bareAtomPoints]);

  const absorptionComputation =
    absorptionNormType === "bare-atom"
      ? bareAtomComputation
      : zeroOneComputation;

  const absorptionAvailable =
    (absorptionComputation?.normalizedPoints?.length ?? 0) > 0;

  const betaAvailable =
    !!bareAtomPoints &&
    betaMuLike.length > 0 &&
    (betaPoints?.length ?? 0) > 0;

  const setDataView = useCallback(
    (next: NexafsBrowseDataView) => {
      if (next === "od") {
        setDataViewState("od");
        return;
      }
      const hasAbs =
        (absorptionComputation?.normalizedPoints?.length ?? 0) > 0;
      if (next === "absorption") {
        if (!hasAbs) {
          showGateToast(
            "browse-absorption",
            "Normalization is not available for this spectrum yet.",
          );
          return;
        }
        setDataViewState("absorption");
        return;
      }
      if (next === "beta") {
        if (!bareAtomPoints?.length) {
          showGateToast(
            "browse-beta-bare",
            "Bare-atom absorption is required for beta; check the molecule formula.",
          );
          return;
        }
        if (!betaPoints?.length) {
          showGateToast(
            "browse-beta-points",
            "Beta could not be computed for this spectrum.",
          );
          return;
        }
        setDataViewState("beta");
      }
    },
    [
      absorptionComputation?.normalizedPoints?.length,
      bareAtomPoints?.length,
      betaPoints?.length,
      showGateToast,
    ],
  );

  const plotPoints =
    dataView === "od"
      ? edgeZeroOnePoints
      : dataView === "beta"
        ? (betaPoints ?? absorptionPlotPoints ?? edgeZeroOnePoints)
        : absorptionPlotPoints;

  const spectrumYAxisQuantity: SpectrumYAxisQuantity =
    dataView === "od"
      ? "optical-density"
      : dataView === "beta"
        ? "beta"
        : "mass-absorption";

  const referenceCurves: ReferenceCurve[] = useMemo(() => {
    if (!showBareAtomOverlay || !bareAtomPoints?.length) {
      return [];
    }
    if (dataView === "absorption") {
      return [
        {
          label: "Bare atom absorption",
          points: bareAtomPoints.map((p) => ({
            energy: p.energy,
            absorption: p.absorption,
          })),
          color: "#6b7280",
        },
      ];
    }
    if (dataView === "beta" && bareAtomBetaReferencePoints?.length) {
      return [
        {
          label: "Beta (bare-atom mu)",
          points: bareAtomBetaReferencePoints,
          color: "#6b7280",
        },
      ];
    }
    return [];
  }, [
    bareAtomPoints,
    bareAtomBetaReferencePoints,
    dataView,
    showBareAtomOverlay,
  ]);

  const showNormalizationShading = Boolean(
    normalizationRegions.pre && normalizationRegions.post,
  );

  return {
    dataView,
    setDataView,
    showBareAtomOverlay,
    setShowBareAtomOverlay,
    plotPoints,
    edgeZeroOnePoints,
    absorptionPlotPoints,
    betaPoints,
    spectrumYAxisQuantity,
    referenceCurves,
    normalizationRegions,
    showNormalizationShading,
    absorptionAvailable,
    betaAvailable,
    bareAtomLoading,
    bareAtomError,
    bareAtomReady: (bareAtomPoints?.length ?? 0) > 0,
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
