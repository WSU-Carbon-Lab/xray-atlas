import type { DashboardIngestionResult } from "~/lib/dashboard-processing-session";
import type { StxmIngestionResult } from "./computeStxmIngestion";

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

/**
 * Downsamples channel arrays before persisting to session JSON to limit payload size.
 */
export function downsampleIngestionForPersist(
  result: StxmIngestionResult,
  scanId: string,
  maxPoints = 400,
): DashboardIngestionResult {
  const down = (values: number[] | null | undefined) =>
    values ? downsampleArray(values, maxPoints) : undefined;
  return {
    scanId,
    computedAt: new Date().toISOString(),
    weightingMode: result.weightingMode,
    formula: result.formula,
    thicknessCm: result.thicknessCm,
    normalization: result.normalization,
    normalizationScale: result.normalizationScale,
    energyEv: downsampleArray(result.energyEv, maxPoints),
    i0: down(result.i0),
    iSample: down(result.iSample),
    od: downsampleArray(result.od, maxPoints),
    odErr: downsampleArray(result.odErr, maxPoints),
    odNormalized: down(result.odNormalized),
    massAbsorption: down(result.massAbsorption ?? null),
    beta: down(result.beta ?? null),
    delta: down(result.delta ?? null),
    kkEngineLabel: result.kkEngineLabel,
  };
}

export function ingestionResultToPersisted(
  result: StxmIngestionResult,
  scanId: string,
): DashboardIngestionResult {
  return downsampleIngestionForPersist(result, scanId);
}
