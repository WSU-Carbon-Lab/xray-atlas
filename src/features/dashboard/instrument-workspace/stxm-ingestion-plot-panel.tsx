"use client";

import { useMemo } from "react";
import { Spinner } from "@heroui/react";
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
  STXM_INGESTION_CHANNEL_OPTIONS,
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
  isComputing?: boolean;
  /** Label for the primary reduced trace (for example `OD (pure)`). */
  primaryTraceLabel?: string;
  /** Active pure/sample region display name when `primaryTraceLabel` is omitted. */
  pureRegionLabel?: string;
};

function buildPrimaryTraceLabel(
  channel: StxmIngestionPlotChannel,
  pureRegionLabel: string,
): string {
  const channelLabel =
    STXM_INGESTION_CHANNEL_OPTIONS.find((option) => option.id === channel)
      ?.label ?? channel;
  const regionLabel = pureRegionLabel.trim() || "sample";
  return `${channelLabel} (${regionLabel})`;
}

function plotHasDisplayableData(
  result: StxmIngestionResult | null,
  regionSpectra: StxmRegionSpectrumSeries[],
): boolean {
  if (result && result.energyEv.length > 0) {
    return true;
  }
  return regionSpectra.length > 0;
}

function PlotComputingOverlay() {
  return (
    <div
      className="bg-surface/60 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="md" aria-label="Computing spectra" />
    </div>
  );
}

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
  isComputing = false,
  primaryTraceLabel,
  pureRegionLabel,
}: StxmIngestionPlotPanelProps) {
  const resolvedPrimaryTraceLabel = useMemo(() => {
    if (primaryTraceLabel?.trim()) {
      return primaryTraceLabel.trim();
    }
    if (pureRegionLabel?.trim()) {
      return buildPrimaryTraceLabel(channel, pureRegionLabel);
    }
    return undefined;
  }, [channel, primaryTraceLabel, pureRegionLabel]);

  const showComputingOverlay =
    isComputing && !plotHasDisplayableData(result, regionSpectra);

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
    if (regionSpectra.length > 0) {
      const enabledTraces = displayChannelToTraceIds(channel);
      return (
        <div className="relative">
          <IngestionSpectrumChart
            result={null}
            enabledTraces={
              ingestionChannelUsesRawSignal(channel) ? enabledTraces : new Set()
            }
            yScale={yScale}
            height={height}
            regionOverlaySpectra={showRegionOverlays ? regionSpectra : []}
            channel={channel}
            standards={standards}
          />
          {showComputingOverlay ? <PlotComputingOverlay /> : null}
        </div>
      );
    }
    return (
      <div
        className="border-border bg-default/20 relative flex items-center justify-center rounded-md border"
        style={{ minHeight: height }}
      >
        {showComputingOverlay ? (
          <Spinner size="md" aria-label="Computing spectra" />
        ) : (
          <p className="text-muted px-4 text-center text-sm">
            Configure sample and izero regions to compute spectra.
          </p>
        )}
      </div>
    );
  }

  if (useSpectrumPlot) {
    const points = buildMainPoints(result, channel, false);
    return (
      <div className="relative">
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
          emptyStateMessage="Computing spectra for this channel."
          primaryTraceLabel={resolvedPrimaryTraceLabel}
        />
        {showComputingOverlay ? <PlotComputingOverlay /> : null}
      </div>
    );
  }

  const enabledTraces = displayChannelToTraceIds(channel);
  if (ingestionChannelUsesRawSignal(channel) && showRegionOverlays) {
    return (
      <div className="relative">
        <IngestionSpectrumChart
          result={result}
          enabledTraces={enabledTraces}
          yScale={yScale}
          height={height}
          regionOverlaySpectra={regionSpectra}
          channel={channel}
          standards={standards}
        />
        {showComputingOverlay ? <PlotComputingOverlay /> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <IngestionSpectrumChart
        result={result}
        enabledTraces={enabledTraces}
        yScale={yScale}
        height={height}
        standards={standards}
      />
      {showComputingOverlay ? <PlotComputingOverlay /> : null}
    </div>
  );
}
