import type {
  BuildStxmSpectrumPlotModelParams,
  StxmSpectrumPlotModel,
} from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import { buildStxmSpectrumPlotModel } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import { hasStxmMultiRegionLineScanData } from "~/features/dashboard/lib/stxm-region-traces";

/** Discriminated plot output modes for STXM ingestion spectra. */
export type StxmIngestionPlotModel =
  | {
      kind: "regionMultiTrace";
      model: StxmSpectrumPlotModel;
    }
  | {
      kind: "aggregatedLegacy";
      model: StxmSpectrumPlotModel;
    }
  | {
      kind: "empty";
      model: null;
    };

export type BuildStxmIngestionPlotModelParams = BuildStxmSpectrumPlotModelParams & {
  /** Monotonic epoch from raw/enrichment recomputation; stabilizes memoization across preview/full transitions. */
  regionSpectraEpoch?: number;
  /** Monotonic epoch from full ingestion pipeline completion. */
  pipelineEpoch?: number;
  /**
   * When true, the line-scan editor has at least one sample region; aggregated legacy traces are forbidden
   * even if per-region spectra are momentarily empty during async recompute.
   */
  hasSampleRegions?: boolean;
};

/**
 * Resolves which STXM ingestion plot builder mode applies for the current region and channel inputs.
 */
export function resolveStxmIngestionPlotModelKind(
  params: BuildStxmIngestionPlotModelParams,
): StxmIngestionPlotModel["kind"] {
  return buildStxmIngestionPlotModel(params).kind;
}

/**
 * Builds the authoritative STXM ingestion plot model, preferring region-scoped multi-trace output
 * whenever line-scan sample regions exist and never silently falling back to aggregated legacy traces
 * in that mode.
 */
export function buildStxmIngestionPlotModel(
  params: BuildStxmIngestionPlotModelParams,
): StxmIngestionPlotModel {
  const model = buildStxmSpectrumPlotModel(params);
  if (model == null) {
    return { kind: "empty", model: null };
  }
  if (model.regionScopedTraces === true) {
    return { kind: "regionMultiTrace", model };
  }
  if (
    hasStxmMultiRegionLineScanData(params.regionSpectra) ||
    params.hasSampleRegions === true
  ) {
    if (
      process.env.NODE_ENV === "development" &&
      params.hasSampleRegions === true &&
      model != null
    ) {
      throw new Error(
        "STXM ingestion plot invariant: sample regions exist but plot model is not region-scoped",
      );
    }
    return { kind: "empty", model: null };
  }
  return { kind: "aggregatedLegacy", model };
}
