import type { ReferenceCurve } from "~/components/plots/types";
import type { SpectrumPoint } from "~/components/plots/types";
import type { DashboardPlotDatasetInput } from "~/features/dashboard/plot-viewer/build-dashboard-plot-model";
import type { DashboardIngestionResult } from "~/lib/dashboard-processing-session";
import {
  bareAtomReferenceFromMatrix,
  type BareAtomRepresentationMatrix,
} from "~/features/process-nexafs/bare-atom-representation-matrix";
import { buildBareAtomRepresentationMatrix } from "~/features/process-nexafs/bare-atom-representation-matrix";
import type { NexafsPlotChannelId } from "~/features/process-nexafs/nexafs-plot-channels";
import { parseAtlasPreviewCompareTraceKey } from "./preview-compare-trace-key";
import { parseStxmPreviewTraceKey } from "./stxm-preview-trace-key";
import type { StxmPreviewCompareChannel } from "./stxm-preview-styled-traces";

/**
 * Maps preview compare Y channels to the Henke/CXRO bare-atom matrix channel used for overlay.
 * OD and mass-absorption views compare against bare-atom beta; delta uses bare-atom delta.
 */
export function previewBareAtomMatrixChannelForCompareChannel(
  channel: StxmPreviewCompareChannel,
): NexafsPlotChannelId | null {
  switch (channel) {
    case "od":
    case "od_normalized":
    case "mass_absorption":
    case "beta":
      return "beta";
    case "delta":
      return "delta";
    default:
      return null;
  }
}

/**
 * Returns whether the active preview compare channel can show a tabulated bare-atom overlay.
 */
export function previewBareAtomOverlaySupportedForChannel(
  channel: StxmPreviewCompareChannel,
): boolean {
  return previewBareAtomMatrixChannelForCompareChannel(channel) != null;
}

function strictlyAscendingUniqueEnergies(energies: readonly number[]): number[] {
  const sorted = [...energies]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const unique: number[] = [];
  for (const energy of sorted) {
    const last = unique[unique.length - 1];
    if (last == null || energy > last) {
      unique.push(energy);
    }
  }
  return unique;
}

/**
 * Resolves the chemical formula stored on a single preview compare trace key.
 */
export function resolvePreviewCompareTraceFormula(params: {
  traceKey: string;
  ingestionByScanId: Readonly<
    Record<string, DashboardIngestionResult | undefined>
  >;
  atlasDatasets: readonly DashboardPlotDatasetInput[];
}): string | null {
  const atlasParsed = parseAtlasPreviewCompareTraceKey(params.traceKey);
  if (atlasParsed) {
    const dataset = params.atlasDatasets.find(
      (row) => row.experimentId === atlasParsed.experimentId,
    );
    const formula = dataset?.chemicalFormula?.trim();
    return formula && formula.length > 0 ? formula : null;
  }
  const stxmParsed = parseStxmPreviewTraceKey(params.traceKey);
  if (!stxmParsed) {
    return null;
  }
  const formula = params.ingestionByScanId[stxmParsed.scanId]?.formula?.trim();
  return formula && formula.length > 0 ? formula : null;
}

export type PreviewCompareBareAtomContext = {
  supported: boolean;
  disabled: boolean;
  disabledReason: string;
  formula: string | null;
  energyEv: number[];
};

/**
 * Derives bare-atom overlay availability from visible compare traces, channel, and molecule formulas.
 */
export function resolvePreviewCompareBareAtomContext(params: {
  channel: StxmPreviewCompareChannel;
  visibleTraceKeys: readonly string[];
  visiblePoints: readonly SpectrumPoint[];
  ingestionByScanId: Readonly<
    Record<string, DashboardIngestionResult | undefined>
  >;
  atlasDatasets: readonly DashboardPlotDatasetInput[];
}): PreviewCompareBareAtomContext {
  const supported = previewBareAtomOverlaySupportedForChannel(params.channel);
  const energyEv = strictlyAscendingUniqueEnergies(
    params.visiblePoints.map((point) => point.energy),
  );

  if (!supported) {
    return {
      supported: false,
      disabled: true,
      disabledReason:
        "Switch to optical density, mass absorption, beta, or delta for bare atom.",
      formula: null,
      energyEv,
    };
  }

  if (params.visibleTraceKeys.length === 0 || energyEv.length < 2) {
    return {
      supported: true,
      disabled: true,
      disabledReason: "Select traces with at least two energy samples.",
      formula: null,
      energyEv,
    };
  }

  const formulas = new Set<string>();
  for (const traceKey of params.visibleTraceKeys) {
    const formula = resolvePreviewCompareTraceFormula({
      traceKey,
      ingestionByScanId: params.ingestionByScanId,
      atlasDatasets: params.atlasDatasets,
    });
    if (formula) {
      formulas.add(formula);
    }
  }

  if (formulas.size === 0) {
    return {
      supported: true,
      disabled: true,
      disabledReason: "Link a molecule with a chemical formula first.",
      formula: null,
      energyEv,
    };
  }

  if (formulas.size > 1) {
    return {
      supported: true,
      disabled: true,
      disabledReason:
        "Selected traces use different molecules; bare atom needs one formula.",
      formula: null,
      energyEv,
    };
  }

  const formula = [...formulas][0] ?? null;
  return {
    supported: true,
    disabled: false,
    disabledReason: "",
    formula,
    energyEv,
  };
}

/**
 * Builds a bare-atom reference curve on the preview compare experimental energy grid.
 */
export async function buildPreviewCompareBareAtomReferenceCurve(params: {
  chemicalFormula: string;
  energyEv: readonly number[];
  channel: StxmPreviewCompareChannel;
  isDark?: boolean;
  buildMatrix?: (
    formula: string,
    energyEv: readonly number[],
  ) => Promise<BareAtomRepresentationMatrix | null>;
}): Promise<ReferenceCurve | null> {
  const matrixChannel = previewBareAtomMatrixChannelForCompareChannel(
    params.channel,
  );
  if (!matrixChannel || params.energyEv.length < 2) {
    return null;
  }
  const buildMatrix =
    params.buildMatrix ?? buildBareAtomRepresentationMatrix;
  const matrix = await buildMatrix(
    params.chemicalFormula.trim(),
    params.energyEv,
  );
  if (!matrix) {
    return null;
  }
  return bareAtomReferenceFromMatrix(
    matrix,
    matrixChannel,
    params.isDark ?? false,
  );
}
