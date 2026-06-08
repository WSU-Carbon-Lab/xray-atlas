"use client";

import { useMemo, useRef } from "react";
import type { ReferenceCurve } from "~/components/plots/types";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import {
  buildStxmIngestionPlotModel,
  type BuildStxmIngestionPlotModelParams,
  type StxmIngestionPlotModel,
} from "~/features/dashboard/lib/stxm-plot-model";
import type {
  StxmCompareOverlay,
  StxmSpectrumStandardOverlay,
} from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import type { StxmIngestionPlotChannel } from "~/lib/stxm/stxm-ingestion-display";
import type { StxmRawSignalTransformMode } from "~/lib/stxm/stxm-raw-signal-transform";
import type { StxmRegionSpectrumSeries, StxmSampleRegion } from "~/lib/stxm/stxm-region-types";
import type { NormalizationRegions } from "~/components/plots/types";

/** Cached region-multi-trace plot output used for stale-while-revalidate display. */
export type StxmIngestionPlotDisplayCache = {
  cacheKey: string;
  build: Extract<StxmIngestionPlotModel, { kind: "regionMultiTrace" }>;
};

export type UseStxmIngestionPlotStateParams = {
  result: StxmIngestionResult | null;
  regionSpectra: StxmRegionSpectrumSeries[];
  regions: StxmSampleRegion[];
  channel: StxmIngestionPlotChannel;
  rawSignalTransform: StxmRawSignalTransformMode;
  standards: StxmSpectrumStandardOverlay[];
  bareAtomCurve: ReferenceCurve | null;
  showBareAtomOverlay: boolean;
  showRegionOverlays: boolean;
  linkImaginaryReal: boolean;
  compareOverlays: StxmCompareOverlay[];
  normalizationOverride: NormalizationRegions | null | undefined;
  primaryTraceLabel?: string;
  pureRegionLabel?: string;
  regionSpectraEpoch: number;
  pipelineEpoch: number;
  /** Invalidates stale cache when the active scan or session identity changes. */
  plotScopeKey: string;
};

export type StxmIngestionPlotState = {
  plotBuild: StxmIngestionPlotModel;
  plotModel: StxmIngestionPlotModel["model"];
};

/**
 * Returns whether the line-scan editor currently defines at least one sample region.
 */
export function hasStxmIngestionSampleRegions(
  regions: readonly StxmSampleRegion[],
): boolean {
  return regions.length > 0;
}

/**
 * Builds the memo key used to decide whether a cached region-multi-trace model may be reused.
 */
export function stxmIngestionPlotDisplayCacheKey(
  channel: StxmIngestionPlotChannel,
  regionSpectraEpoch: number,
  pipelineEpoch: number,
): string {
  return `${channel}:${regionSpectraEpoch}:${pipelineEpoch}`;
}

/**
 * Resolves the plot model shown in the ingestion spectrum card, preferring region-multi-trace output
 * and reusing the last good region-multi-trace model while async spectra recompute when sample regions exist.
 */
export function resolveStxmIngestionPlotDisplay(
  fresh: StxmIngestionPlotModel,
  options: {
    hasSampleRegions: boolean;
    channel: StxmIngestionPlotChannel;
    cacheKey: string;
    previous: StxmIngestionPlotDisplayCache | null;
  },
): { display: StxmIngestionPlotModel; nextCache: StxmIngestionPlotDisplayCache | null } {
  const { hasSampleRegions, channel, cacheKey, previous } = options;

  if (fresh.kind === "regionMultiTrace") {
    return {
      display: fresh,
      nextCache: { cacheKey, build: fresh },
    };
  }

  if (!hasSampleRegions) {
    return { display: fresh, nextCache: null };
  }

  if (fresh.kind === "aggregatedLegacy") {
    const channelPrefix = `${channel}:`;
    if (previous?.cacheKey.startsWith(channelPrefix)) {
      return { display: previous.build, nextCache: previous };
    }
    return { display: { kind: "empty", model: null }, nextCache: previous };
  }

  if (fresh.kind === "empty") {
    const channelPrefix = `${channel}:`;
    if (previous?.cacheKey.startsWith(channelPrefix)) {
      return { display: previous.build, nextCache: previous };
    }
  }

  return { display: fresh, nextCache: previous };
}

/**
 * Owns STXM ingestion plot model derivation with stale-while-revalidate so transient empty or legacy
 * builder output never flashes during region recompute, channel enrichment, or scan restore.
 */
export function useStxmIngestionPlotState(
  params: UseStxmIngestionPlotStateParams,
): StxmIngestionPlotState {
  const {
    result,
    regionSpectra,
    regions,
    channel,
    rawSignalTransform,
    standards,
    bareAtomCurve,
    showBareAtomOverlay,
    showRegionOverlays,
    linkImaginaryReal,
    compareOverlays,
    normalizationOverride,
    primaryTraceLabel,
    pureRegionLabel,
    regionSpectraEpoch,
    pipelineEpoch,
    plotScopeKey,
  } = params;

  const hasSampleRegions = hasStxmIngestionSampleRegions(regions);
  const cacheRef = useRef<{
    scopeKey: string;
    cache: StxmIngestionPlotDisplayCache | null;
  }>({ scopeKey: plotScopeKey, cache: null });

  const buildParams = useMemo((): BuildStxmIngestionPlotModelParams => {
    return {
      result,
      regionSpectra,
      channel,
      rawSignalTransform,
      standards,
      bareAtomCurve,
      showBareAtomOverlay,
      showRegionOverlays,
      linkImaginaryReal,
      compareOverlays,
      normalizationOverride: normalizationOverride ?? undefined,
      primaryTraceLabel,
      pureRegionLabel,
      regionSpectraEpoch,
      pipelineEpoch,
      hasSampleRegions,
    };
  }, [
    bareAtomCurve,
    channel,
    compareOverlays,
    hasSampleRegions,
    linkImaginaryReal,
    normalizationOverride,
    pipelineEpoch,
    primaryTraceLabel,
    pureRegionLabel,
    rawSignalTransform,
    regionSpectra,
    regionSpectraEpoch,
    result,
    showBareAtomOverlay,
    showRegionOverlays,
    standards,
  ]);

  const cacheKey = stxmIngestionPlotDisplayCacheKey(
    channel,
    regionSpectraEpoch,
    pipelineEpoch,
  );

  const plotBuild = useMemo((): StxmIngestionPlotModel => {
    if (cacheRef.current.scopeKey !== plotScopeKey) {
      cacheRef.current = { scopeKey: plotScopeKey, cache: null };
    }
    const previous = cacheRef.current.cache;
    const channelPrefix = `${channel}:`;
    const matchingPrevious =
      previous?.cacheKey.startsWith(channelPrefix) === true
        ? previous
        : null;

    if (
      hasSampleRegions &&
      regionSpectra.length === 0 &&
      matchingPrevious
    ) {
      cacheRef.current = {
        scopeKey: plotScopeKey,
        cache: matchingPrevious,
      };
      return matchingPrevious.build;
    }

    const freshBuild = buildStxmIngestionPlotModel(buildParams);
    const resolved = resolveStxmIngestionPlotDisplay(freshBuild, {
      hasSampleRegions,
      channel,
      cacheKey,
      previous,
    });
    cacheRef.current = {
      scopeKey: plotScopeKey,
      cache: resolved.nextCache,
    };
    return resolved.display;
  }, [
    buildParams,
    cacheKey,
    channel,
    hasSampleRegions,
    plotScopeKey,
    regionSpectra.length,
  ]);

  return {
    plotBuild,
    plotModel: plotBuild.model,
  };
}
