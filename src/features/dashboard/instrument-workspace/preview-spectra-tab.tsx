"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Checkbox } from "@heroui/react";
import type {
  DashboardIngestionResult,
  DashboardPreviewSpectrumEntry,
} from "~/lib/dashboard-processing-session";
import { buildStxmSpectrumPlotModel } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";

type PreviewSpectraTabProps = {
  entries: DashboardPreviewSpectrumEntry[];
  activeScanId: string | null;
  ingestionByScanId: Record<string, DashboardIngestionResult | undefined>;
  compareScanIds: string[];
  onCompareScanIdsChange: (scanIds: string[]) => void;
  onSelectScan: (scanId: string) => void;
  onRemoveEntry: (scanId: string) => void;
};

function persistedToRuntime(
  persisted: DashboardIngestionResult,
): StxmIngestionResult {
  return {
    energyEv: persisted.energyEv,
    i0: persisted.i0 ?? [],
    i0Err: [],
    iSample: persisted.iSample ?? [],
    iSampleErr: [],
    od: persisted.od,
    odErr: persisted.odErr,
    odNormalized: persisted.odNormalized ?? persisted.od,
    massAbsorption: persisted.massAbsorption ?? null,
    massAbsorptionErr: null,
    beta: persisted.beta ?? null,
    betaErr: null,
    delta: persisted.delta ?? null,
    normalization: persisted.normalization,
    normalizationScale: persisted.normalizationScale ?? 1,
    bareAtomScale: null,
    bareAtomOffset: null,
    thicknessCm: persisted.thicknessCm ?? 1e-4,
    formula: persisted.formula ?? null,
    weightingMode: persisted.weightingMode,
    kkEngineLabel: persisted.kkEngineLabel ?? null,
  };
}

const COMPARE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Lists scans kept in session cache with multi-select compare overlay on one spectrum plot.
 */
export function PreviewSpectraTab({
  entries,
  activeScanId,
  ingestionByScanId,
  compareScanIds,
  onCompareScanIdsChange,
  onSelectScan,
  onRemoveEntry,
}: PreviewSpectraTabProps) {
  const [showComparePlot, setShowComparePlot] = useState(
    compareScanIds.length > 0,
  );

  const selectedSet = useMemo(
    () => new Set(compareScanIds),
    [compareScanIds],
  );

  const toggleSelection = useCallback(
    (scanId: string, selected: boolean) => {
      if (selected) {
        onCompareScanIdsChange([...compareScanIds, scanId]);
        return;
      }
      onCompareScanIdsChange(compareScanIds.filter((id) => id !== scanId));
    },
    [compareScanIds, onCompareScanIdsChange],
  );

  const comparePlotModel = useMemo(() => {
    const ids = compareScanIds.filter((id) => ingestionByScanId[id]);
    if (ids.length === 0) {
      return null;
    }
    const primaryId = ids[0]!;
    const primary = persistedToRuntime(ingestionByScanId[primaryId]!);
    const overlays = ids.slice(1).map((id, index) => ({
      id,
      label: entries.find((row) => row.scanId === id)?.scanLabel ?? id,
      ingestion: ingestionByScanId[id]!,
      color: COMPARE_COLORS[(index + 1) % COMPARE_COLORS.length] ?? "var(--chart-2)",
    }));
    return buildStxmSpectrumPlotModel({
      result: primary,
      regionSpectra: [],
      channel: "od",
      i0PlotScale: "linear",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: false,
      compareOverlays: overlays,
      primaryTraceLabel:
        entries.find((row) => row.scanId === primaryId)?.scanLabel ?? primaryId,
    });
  }, [compareScanIds, entries, ingestionByScanId]);

  if (entries.length === 0) {
    return (
      <div className="border-border bg-default/30 rounded-lg border border-dashed px-5 py-8">
        <p className="text-foreground text-sm font-medium">Preview spectra</p>
        <p className="text-muted mt-2 text-sm">
          Mark scans as kept in cache from Ingestion to compare reduced spectra here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-sm">
          {entries.length} scan{entries.length === 1 ? "" : "s"} in session cache.
        </p>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={compareScanIds.length < 2}
          onPress={() => {
            setShowComparePlot(true);
            onCompareScanIdsChange(compareScanIds);
          }}
        >
          Compare selected ({compareScanIds.length})
        </Button>
      </div>

      <ul className="divide-border divide-y rounded-lg border">
        {entries.map((entry) => {
          const ingestion = ingestionByScanId[entry.scanId];
          const pointCount = ingestion?.energyEv.length ?? 0;
          const isActive = entry.scanId === activeScanId;
          const isSelected = selectedSet.has(entry.scanId);
          return (
            <li
              key={entry.scanId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Checkbox
                  aria-label={`Select ${entry.scanLabel} for compare`}
                  isSelected={isSelected}
                  onChange={(selected) =>
                    toggleSelection(entry.scanId, selected)
                  }
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {entry.scanLabel}
                  </p>
                  <p className="text-muted text-xs">
                    {entry.edgeLabel ?? "Edge unknown"}
                    {pointCount > 0
                      ? ` | ${pointCount} energy points`
                      : " | not reduced"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isActive ? "primary" : "secondary"}
                  onPress={() => onSelectScan(entry.scanId)}
                >
                  Open in Ingestion
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    onRemoveEntry(entry.scanId);
                    onCompareScanIdsChange(
                      compareScanIds.filter((id) => id !== entry.scanId),
                    );
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {showComparePlot && comparePlotModel ? (
        <section className="border-border bg-surface rounded-lg border p-4">
          <p className="text-foreground mb-2 text-sm font-medium">
            Compare overlay (OD)
          </p>
          <SpectrumPlot
            points={comparePlotModel.points}
            height={360}
            yAxisQuantity={comparePlotModel.yAxisQuantity}
            companionSpectra={comparePlotModel.companionSpectra}
            primaryTraceLabel={comparePlotModel.primaryTraceLabel}
            emptyStateMessage="Selected scans need reduced spectra in cache."
          />
        </section>
      ) : null}
    </div>
  );
}
