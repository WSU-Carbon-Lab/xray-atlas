"use client";

import { useMemo } from "react";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import type { ReferenceCurve } from "~/components/plots/types";
import type { DifferenceSpectrum } from "~/components/plots/types";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import {
  ingestionChannelAllowsLogY,
  ingestionChannelUsesRawSignal,
  ingestionResultChannelValue,
  regionSpectrumChannelValue,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import {
  IngestionSpectrumChart,
  type IngestionSpectrumTraceId,
} from "./ingestion-spectrum-chart";

export type StxmPlotStandardOverlay = {
  id: string;
  label: string;
  energyEv: number[];
  values: number[];
  color: string;
  enabled: boolean;
};

type StxmIngestionPlotPanelProps = {
  result: StxmIngestionResult | null;
  regionSpectra: StxmRegionSpectrumSeries[];
  channel: StxmIngestionPlotChannel;
  yScale: "linear" | "log";
  standards: StxmPlotStandardOverlay[];
  bareAtomCurve: ReferenceCurve | null;
  showRegionOverlays: boolean;
  height?: number;
};

function channelToYAxisQuantity(
  channel: StxmIngestionPlotChannel,
): "intensity" | "optical-density" | "mass-absorption" | "beta" | "delta" | "scattering-f1" {
  switch (channel) {
    case "od":
    case "od_normalized":
      return "optical-density";
    case "mass_absorption":
    case "bare_atom":
      return "mass-absorption";
    case "beta":
    case "chi":
      return "beta";
    case "delta":
    case "f1":
      return "delta";
    default:
      return "intensity";
  }
}

function applyLogTransform(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return Number.NaN;
  }
  return Math.log10(value);
}

function buildMainPoints(
  result: StxmIngestionResult,
  channel: StxmIngestionPlotChannel,
  logY: boolean,
) {
  return result.energyEv.map((energy, index) => {
    let absorption = ingestionResultChannelValue(result, channel, index);
    if (logY && ingestionChannelAllowsLogY(channel)) {
      absorption = applyLogTransform(absorption);
    }
    return { energy, absorption };
  });
}

function displayChannelToTraceIds(
  channel: StxmIngestionPlotChannel,
): Set<IngestionSpectrumTraceId> {
  switch (channel) {
    case "signal_i0":
      return new Set(["i0"]);
    case "signal_sample":
      return new Set(["iSample"]);
    case "signal_inv_i0":
      return new Set(["invI0"]);
    case "od":
      return new Set(["od"]);
    case "od_normalized":
      return new Set(["odNormalized"]);
    case "mass_absorption":
    case "bare_atom":
      return new Set(["massAbsorption"]);
    case "beta":
    case "chi":
      return new Set(["beta"]);
    case "delta":
    case "f1":
      return new Set(["delta"]);
    default:
      return new Set(["od"]);
  }
}

/**
 * Wraps NEXAFS `SpectrumPlot` for reduced channels and falls back to the ingestion chart for log/raw overlays.
 */
export function StxmIngestionPlotPanel({
  result,
  regionSpectra,
  channel,
  yScale,
  standards,
  bareAtomCurve,
  showRegionOverlays,
  height = 320,
}: StxmIngestionPlotPanelProps) {
  const useSpectrumPlot =
    result !== null &&
    !ingestionChannelUsesRawSignal(channel) &&
    !(yScale === "log" && ingestionChannelAllowsLogY(channel));

  const referenceCurves = useMemo((): ReferenceCurve[] => {
    const curves: ReferenceCurve[] = [];
    if (bareAtomCurve && (channel === "bare_atom" || channel === "mass_absorption")) {
      curves.push({ ...bareAtomCurve, showInLegend: true });
    }
    for (const standard of standards) {
      if (!standard.enabled) {
        continue;
      }
      curves.push({
        label: standard.label,
        color: standard.color,
        lineDash: "dash",
        points: standard.energyEv.map((energy, index) => ({
          energy,
          absorption: standard.values[index] ?? 0,
        })),
      });
    }
    return curves;
  }, [bareAtomCurve, channel, standards]);

  const companionSpectra = useMemo((): DifferenceSpectrum[] => {
    if (!showRegionOverlays || !ingestionChannelUsesRawSignal(channel)) {
      return [];
    }
    const logY = yScale === "log";
    return regionSpectra
      .filter((series) => !series.isIzero || channel === "signal_i0")
      .map((series, index) => ({
        label: series.spotLabel,
        preferred: index === 0,
        points: series.energyEv.map((energy, pointIndex) => {
          let absorption = regionSpectrumChannelValue(series, channel, pointIndex);
          if (logY) {
            absorption = applyLogTransform(absorption);
          }
          return { energy, absorption };
        }),
      }));
  }, [channel, regionSpectra, showRegionOverlays, yScale]);

  if (!result) {
    return (
      <p className="text-muted text-sm">
        Adjust regions, then click Recompute spectra.
      </p>
    );
  }

  if (useSpectrumPlot) {
    const points = buildMainPoints(result, channel, false);
    return (
      <SpectrumPlot
        points={points}
        height={height}
        yAxisQuantity={channelToYAxisQuantity(channel)}
        referenceCurves={referenceCurves}
        companionSpectra={companionSpectra}
        showNormalizationShading
        normalizationRegions={{
          pre: [result.normalization.preLo, result.normalization.preHi],
          post: [result.normalization.postLo, result.normalization.postHi],
        }}
        emptyStateMessage="Recompute spectra to preview this channel."
      />
    );
  }

  const enabledTraces = displayChannelToTraceIds(channel);
  if (ingestionChannelUsesRawSignal(channel) && showRegionOverlays) {
    return (
      <IngestionSpectrumChart
        result={result}
        enabledTraces={enabledTraces}
        yScale={yScale}
        height={height}
        regionOverlaySpectra={regionSpectra}
        channel={channel}
        standards={standards}
      />
    );
  }

  return (
    <IngestionSpectrumChart
      result={result}
      enabledTraces={enabledTraces}
      yScale={yScale}
      height={height}
      standards={standards}
    />
  );
}
