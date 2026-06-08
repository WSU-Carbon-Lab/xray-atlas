import type { DashboardPreviewRegionSpectrum } from "~/lib/dashboard-processing-session";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

function downsampleArray(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) {
    return values;
  }
  const stride = values.length / maxPoints;
  const out: number[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(values[Math.floor(i * stride)] ?? 0);
  }
  return out;
}

function downsampleOptional(
  values: number[] | undefined,
  maxPoints: number,
): number[] | undefined {
  if (values == null) {
    return undefined;
  }
  return downsampleArray(values, maxPoints);
}

/**
 * Downsamples per-region STXM spectra before persisting them on the preview cache.
 */
export function downsampleRegionSpectraForPersist(
  regionSpectra: readonly StxmRegionSpectrumSeries[],
  maxPoints = 400,
): DashboardPreviewRegionSpectrum[] {
  return regionSpectra.map((series) => ({
    regionId: series.regionId,
    spotLabel: series.spotLabel,
    isIzero: series.isIzero,
    color: series.color,
    energyEv: downsampleArray(series.energyEv, maxPoints),
    signal: downsampleArray(series.signal, maxPoints),
    signalErr: downsampleArray(series.signalErr, maxPoints),
    od: downsampleOptional(series.od, maxPoints),
    odErr: downsampleOptional(series.odErr, maxPoints),
    odNormalized: downsampleOptional(series.odNormalized, maxPoints),
    massAbsorption: downsampleOptional(series.massAbsorption, maxPoints),
    beta: downsampleOptional(series.beta, maxPoints),
    delta: downsampleOptional(series.delta, maxPoints),
  }));
}

/**
 * Rehydrates ingestion-tab region spectrum series from downsampled preview cache rows.
 *
 * Spatial bounds default to zero because preview cache omits them; plot channels and KK enrichment
 * (`beta`, `delta`, normalized OD) are restored when present on the cached row.
 */
export function previewRegionSpectraToSeries(
  cached: readonly DashboardPreviewRegionSpectrum[],
): StxmRegionSpectrumSeries[] {
  return cached.map((row) => ({
    regionId: row.regionId,
    spotLabel: row.spotLabel,
    sampleLo: 0,
    sampleHi: 0,
    energyEv: row.energyEv,
    signal: row.signal ?? [],
    signalErr: row.signalErr ?? [],
    od: row.od,
    odErr: row.odErr,
    odNormalized: row.odNormalized,
    massAbsorption: row.massAbsorption,
    beta: row.beta,
    delta: row.delta,
    color: row.color ?? "",
    isIzero: row.isIzero,
  }));
}
