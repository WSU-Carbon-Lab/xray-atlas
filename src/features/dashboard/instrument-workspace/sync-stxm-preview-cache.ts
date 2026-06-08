import type {
  DashboardIngestionResult,
  DashboardPreviewSpectrumEntry,
  DashboardPreviewStepMetadata,
} from "~/lib/dashboard-processing-session";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import { ingestionResultToPersisted } from "~/features/dashboard/lib/downsampleIngestionResult";
import { resolveIncidentThetaDegForScan } from "~/lib/stxm/parse-incident-theta-from-hdr";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import { downsampleRegionSpectraForPersist } from "./downsample-region-spectra-for-persist";
import {
  defaultStxmPreviewTraceKeys,
  listStxmPreviewTraceCandidates,
} from "./stxm-preview-styled-traces";

export type SyncStxmPreviewCacheInput = {
  scanId: string;
  scanLabel: string;
  edgeLabel?: string;
  hdrFileName?: string;
  ximFileName?: string;
  moleculeId?: string;
  moleculeName?: string;
  hdrText?: string;
  incidentThetaDeg?: number;
  previewMetadata: DashboardPreviewStepMetadata | undefined;
  ingestionResult: StxmIngestionResult | DashboardIngestionResult | null;
  regionSpectra: readonly StxmRegionSpectrumSeries[];
  standardOverlays?: DashboardPreviewStepMetadata["standardOverlays"];
};

/**
 * Returns true when reduced region spectra or aggregate ingestion contain at least one plottable trace.
 */
function regionSeriesHasPlottableChannel(
  region: StxmRegionSpectrumSeries,
): boolean {
  if (region.od?.some((value) => Number.isFinite(value))) {
    return true;
  }
  if (region.odNormalized?.some((value) => Number.isFinite(value))) {
    return true;
  }
  if (region.massAbsorption?.some((value) => Number.isFinite(value))) {
    return true;
  }
  if (region.beta?.some((value) => Number.isFinite(value))) {
    return true;
  }
  if (region.delta?.some((value) => Number.isFinite(value))) {
    return true;
  }
  return false;
}

export function stxmPreviewCacheHasPlottableSpectra(params: {
  ingestionResult: StxmIngestionResult | DashboardIngestionResult | null;
  regionSpectra: readonly StxmRegionSpectrumSeries[];
}): boolean {
  const sampleRegions = params.regionSpectra.filter((row) => !row.isIzero);
  if (sampleRegions.some(regionSeriesHasPlottableChannel)) {
    return true;
  }
  const ingestion = params.ingestionResult;
  if (ingestion?.od.some((value) => Number.isFinite(value))) {
    return true;
  }
  if (ingestion?.odNormalized?.some((value) => Number.isFinite(value))) {
    return true;
  }
  if (ingestion?.massAbsorption?.some((value) => Number.isFinite(value))) {
    return true;
  }
  if (ingestion?.beta?.some((value) => Number.isFinite(value))) {
    return true;
  }
  return false;
}

/**
 * Builds updated preview step metadata after a successful STXM reduce, auto-keeping the scan in session cache.
 *
 * Merges ingestion and downsampled region spectra for `scanId`, upserts the preview entry row, and extends
 * `compareTraceKeys` with default trace keys for the scan when newly cached. Returns `null` when spectra are
 * not yet plottable.
 */
export function buildStxmPreviewCacheUpdate(
  input: SyncStxmPreviewCacheInput,
): DashboardPreviewStepMetadata | null {
  if (
    !stxmPreviewCacheHasPlottableSpectra({
      ingestionResult: input.ingestionResult,
      regionSpectra: input.regionSpectra,
    })
  ) {
    return null;
  }

  const preview = input.previewMetadata ?? {
    spectra: [],
    standardOverlays: [],
    compareScanIds: [],
    compareTraceKeys: [],
    atlasExperiments: [],
    atlasGeometryByExperimentId: {},
  };

  const keptAt = new Date().toISOString();
  const incidentThetaDeg =
    input.incidentThetaDeg ??
    resolveIncidentThetaDegForScan({
      hdrText: input.hdrText,
      scanLabel: input.scanLabel,
    });
  const entry: DashboardPreviewSpectrumEntry = {
    scanId: input.scanId,
    scanLabel: input.scanLabel,
    keptAt,
    edgeLabel: input.edgeLabel,
    hdrFileName: input.hdrFileName,
    ximFileName: input.ximFileName,
    moleculeId: input.moleculeId,
    moleculeName: input.moleculeName,
    incidentThetaDeg,
  };

  const nextSpectra = [
    ...preview.spectra.filter((row) => row.scanId !== input.scanId),
    entry,
  ];

  const ingestionCache = { ...(preview.ingestionCache ?? {}) };
  const regionSpectraCache = { ...(preview.regionSpectraCache ?? {}) };

  if (input.ingestionResult) {
    const persisted =
      "computedAt" in input.ingestionResult
        ? input.ingestionResult
        : ingestionResultToPersisted(input.ingestionResult, input.scanId);
    ingestionCache[input.scanId] = persisted;
  }

  if (input.regionSpectra.length > 0) {
    regionSpectraCache[input.scanId] = downsampleRegionSpectraForPersist(
      input.regionSpectra,
    );
  }

  const traceCandidates = listStxmPreviewTraceCandidates({
    entries: nextSpectra,
    ingestionByScanId: ingestionCache,
    regionSpectraByScanId: regionSpectraCache,
  });
  const scanTraceKeys = defaultStxmPreviewTraceKeys(
    traceCandidates.filter((candidate) => candidate.scanId === input.scanId),
  );
  const compareTraceKeys = [
    ...new Set([
      ...(preview.compareTraceKeys ?? []).filter(
        (key) => !key.startsWith(`${input.scanId}::`),
      ),
      ...scanTraceKeys,
    ]),
  ];

  const compareScanIds = [
    ...new Set([...(preview.compareScanIds ?? []), input.scanId]),
  ];

  return {
    ...preview,
    spectra: nextSpectra,
    standardOverlays: input.standardOverlays ?? preview.standardOverlays,
    compareScanIds,
    compareTraceKeys,
    ingestionCache,
    regionSpectraCache,
  };
}
