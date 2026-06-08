"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Label,
  ListBox,
  Select,
  Slider,
  TextField,
} from "@heroui/react";
import { X } from "lucide-react";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import type {
  DashboardLcfStepMetadata,
  DashboardPreviewStepMetadata,
} from "~/lib/dashboard-processing-session";
import { useDashboardPlotSpectra } from "~/features/dashboard/plot-viewer/use-dashboard-plot-spectra";
import { geometryKeysForPoints } from "~/features/dashboard/plot-viewer/geometry-selection";
import {
  plotViewerCheckboxControlClassName,
  plotViewerCheckboxIndicatorClassName,
} from "~/features/dashboard/plot-viewer/plot-viewer-checkbox";
import { trpc } from "~/trpc/client";
import { channelDefinitionById } from "~/components/plots/data-rail";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import {
  fitLcf,
  fitSingleReferenceScale,
  lcfEnergyOverlapRange,
  type LcfFitResult,
  type LcfSpectrum,
} from "~/lib/stxm/lcf";
import { StxmPreviewChannelSelect } from "./stxm-preview-channel-select";
import { LcfAddComponentPicker } from "./lcf-add-component-picker";
import {
  buildLcfLivePlotOverlay,
  buildLcfPlotSeries,
  describeLcfPlotPreviewUnavailable,
  filterLcfPlotSeriesByHiddenIds,
  LCF_TARGET_TRACE_ID,
  parseLcfEnergyRange,
  resolveLcfFitEnergyGrid,
  resolveLcfPlotLegendFractions,
  resolveLcfPreviewWeights,
} from "./lcf-fitting-preview";
import { togglePlotViewerHiddenTraceId } from "~/features/dashboard/plot-viewer/plot-viewer-hidden-traces";
import {
  listLcfTraceCandidates,
  resolveLcfSpectrumFromTraceKey,
} from "./stxm-lcf-spectrum-source";
import type { StxmPreviewCompareChannel } from "./stxm-preview-styled-traces";

export type LcfFittingTabProps = {
  previewMetadata: DashboardPreviewStepMetadata;
  lcfMetadata: DashboardLcfStepMetadata | undefined;
  onPersistPreview: (preview: DashboardPreviewStepMetadata) => Promise<void>;
  onPersistLcf: (lcf: DashboardLcfStepMetadata) => Promise<void>;
};

const COMPONENT_COLORS = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

function channelToYAxisQuantity(
  channel: StxmPreviewCompareChannel,
): "optical-density" | "mass-absorption" | "beta" | "delta" {
  switch (channel) {
    case "od":
    case "od_normalized":
      return "optical-density";
    case "mass_absorption":
      return "mass-absorption";
    case "beta":
      return "beta";
    case "delta":
      return "delta";
    default:
      return "optical-density";
  }
}

function defaultWeightsForComponentCount(
  count: number,
  sumToOne: boolean,
): number[] {
  if (count <= 0) {
    return [];
  }
  if (sumToOne) {
    return Array.from({ length: count }, () => 1 / count);
  }
  if (count === 1) {
    return [1];
  }
  return Array.from({ length: count }, () => 0);
}

/**
 * LC fitting workspace tab: pick a target spectrum, add standard components with composition
 * sliders, and preview target, scaled standards, fitted sum, and residual live on the plot.
 */
export function LcfFittingTab({
  previewMetadata,
  lcfMetadata,
  onPersistPreview,
  onPersistLcf,
}: LcfFittingTabProps) {
  const entries = previewMetadata.spectra;
  const atlasEntries = previewMetadata.atlasExperiments ?? [];
  const atlasGeometryByExperimentId =
    previewMetadata.atlasGeometryByExperimentId ?? {};
  const ingestionByScanId = previewMetadata.ingestionCache ?? {};
  const regionSpectraByScanId = previewMetadata.regionSpectraCache ?? {};

  const [channel, setChannel] = useState<StxmPreviewCompareChannel>(
    lcfMetadata?.channel ?? "od",
  );
  const [targetTraceKey, setTargetTraceKey] = useState<string | null>(
    lcfMetadata?.targetTraceKey ?? null,
  );
  const [componentTraceKeys, setComponentTraceKeys] = useState<string[]>(
    lcfMetadata?.componentTraceKeys ?? [],
  );
  const [componentWeights, setComponentWeights] = useState<number[]>(
    lcfMetadata?.initialWeights ??
      defaultWeightsForComponentCount(
        lcfMetadata?.componentTraceKeys?.length ?? 0,
        lcfMetadata?.sumToOne ?? true,
      ),
  );
  const [energyMinEv, setEnergyMinEv] = useState<string>(
    lcfMetadata?.energyMinEv != null ? String(lcfMetadata.energyMinEv) : "",
  );
  const [energyMaxEv, setEnergyMaxEv] = useState<string>(
    lcfMetadata?.energyMaxEv != null ? String(lcfMetadata.energyMaxEv) : "",
  );
  const [sumToOne, setSumToOne] = useState(lcfMetadata?.sumToOne ?? true);
  const [fitResult, setFitResult] = useState<LcfFitResult | null>(null);
  const [fitError, setFitError] = useState<string | null>(null);
  const [isFitting, setIsFitting] = useState(false);
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const [hiddenTraceIds, setHiddenTraceIds] = useState<string[]>([]);

  const atlasExperimentIds = useMemo(
    () => atlasEntries.map((entry) => entry.experimentId),
    [atlasEntries],
  );

  const browseListQuery = trpc.experiments.browseList.useQuery(
    {
      experimentIds: atlasExperimentIds,
      limit: Math.max(atlasExperimentIds.length, 1),
      offset: 0,
      sortBy: "favorites",
    },
    { enabled: atlasExperimentIds.length > 0, staleTime: 30_000 },
  );

  const groupByExperimentId = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof browseListQuery.data>["groups"][number]
    >();
    for (const group of browseListQuery.data?.groups ?? []) {
      map.set(group.experimentId, group);
    }
    return map;
  }, [browseListQuery.data?.groups]);

  const catalogSelections = useMemo(
    () =>
      atlasEntries.map((entry) => {
        const group = groupByExperimentId.get(entry.experimentId);
        return {
          experimentId: entry.experimentId,
          label: entry.label,
          chemicalFormula: group?.molecule.chemicalformula ?? null,
        };
      }),
    [atlasEntries, groupByExperimentId],
  );

  const { datasets: atlasDatasets, spectraByExperimentId, isLoading: atlasSpectraLoading } =
    useDashboardPlotSpectra(catalogSelections);

  useEffect(() => {
    if (atlasExperimentIds.length === 0) {
      return;
    }
    let changed = false;
    const nextGeometry: Record<string, string[]> = {
      ...Object.fromEntries(
        Object.entries(atlasGeometryByExperimentId).map(([key, value]) => [
          key,
          [...(value ?? [])],
        ]),
      ),
    };
    for (const experimentId of atlasExperimentIds) {
      const points = spectraByExperimentId.get(experimentId);
      if (!points || points.length === 0) {
        continue;
      }
      if ((nextGeometry[experimentId]?.length ?? 0) > 0) {
        continue;
      }
      const geometryKeys = geometryKeysForPoints(points);
      if (geometryKeys.length === 0) {
        continue;
      }
      nextGeometry[experimentId] = geometryKeys;
      changed = true;
    }
    if (!changed) {
      return;
    }
    void onPersistPreview({
      ...previewMetadata,
      atlasGeometryByExperimentId: nextGeometry,
    });
  }, [
    atlasExperimentIds,
    atlasGeometryByExperimentId,
    onPersistPreview,
    previewMetadata,
    spectraByExperimentId,
  ]);

  const resolveParams = useMemo(
    () => ({
      channel,
      entries,
      ingestionByScanId,
      regionSpectraByScanId,
      atlasEntries,
      atlasDatasets,
      geometryByExperimentId: atlasGeometryByExperimentId,
    }),
    [
      atlasDatasets,
      atlasEntries,
      atlasGeometryByExperimentId,
      channel,
      entries,
      ingestionByScanId,
      regionSpectraByScanId,
    ],
  );

  const candidates = useMemo(
    () => listLcfTraceCandidates(resolveParams),
    [resolveParams],
  );

  const candidateByKey = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.traceKey, candidate])),
    [candidates],
  );

  const targetSpectrum = useMemo(() => {
    if (!targetTraceKey) {
      return null;
    }
    return resolveLcfSpectrumFromTraceKey({
      traceKey: targetTraceKey,
      ...resolveParams,
    });
  }, [resolveParams, targetTraceKey]);

  const componentSpectra = useMemo(
    () =>
      componentTraceKeys
        .map((traceKey) =>
          traceKey
            ? resolveLcfSpectrumFromTraceKey({ traceKey, ...resolveParams })
            : null,
        )
        .filter((spectrum): spectrum is LcfSpectrum => Boolean(spectrum)),
    [componentTraceKeys, resolveParams],
  );

  const effectiveSumToOne = sumToOne && componentSpectra.length > 1;

  useEffect(() => {
    setComponentWeights((current) => {
      if (current.length === componentTraceKeys.length) {
        return current;
      }
      if (componentTraceKeys.length > current.length) {
        const defaults = defaultWeightsForComponentCount(
          componentTraceKeys.length,
          effectiveSumToOne,
        );
        return defaults;
      }
      return current.slice(0, componentTraceKeys.length);
    });
  }, [componentTraceKeys.length, effectiveSumToOne]);

  const defaultOverlap = useMemo(() => {
    if (!targetSpectrum || componentSpectra.length === 0) {
      return null;
    }
    return lcfEnergyOverlapRange(targetSpectrum, componentSpectra);
  }, [componentSpectra, targetSpectrum]);

  useEffect(() => {
    if (!defaultOverlap || (energyMinEv !== "" && energyMaxEv !== "")) {
      return;
    }
    setEnergyMinEv(String(defaultOverlap[0]));
    setEnergyMaxEv(String(defaultOverlap[1]));
  }, [defaultOverlap, energyMaxEv, energyMinEv]);

  const energyGrid = useMemo(() => {
    if (!targetSpectrum || componentSpectra.length === 0) {
      return undefined;
    }
    return resolveLcfFitEnergyGrid(
      targetSpectrum,
      componentSpectra,
      energyMinEv,
      energyMaxEv,
    );
  }, [componentSpectra, energyMaxEv, energyMinEv, targetSpectrum]);

  const previewWeights = useMemo(
    () =>
      resolveLcfPreviewWeights(
        componentWeights,
        componentSpectra.length,
        effectiveSumToOne,
      ),
    [componentSpectra.length, componentWeights, effectiveSumToOne],
  );

  const liveOverlay = useMemo(() => {
    if (!targetSpectrum || componentSpectra.length === 0) {
      return null;
    }
    return buildLcfLivePlotOverlay(
      targetSpectrum,
      componentSpectra,
      previewWeights,
      energyGrid,
    );
  }, [componentSpectra, energyGrid, previewWeights, targetSpectrum]);

  const plotPreviewUnavailableMessage = useMemo(
    () =>
      describeLcfPlotPreviewUnavailable({
        targetTraceKey,
        componentTraceKeys,
        targetSpectrum,
        componentSpectra,
        liveOverlay,
      }),
    [
      componentSpectra,
      componentTraceKeys,
      liveOverlay,
      targetSpectrum,
      targetTraceKey,
    ],
  );

  const channelGlyph = channelDefinitionById(
    STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
    channel,
  ).label;

  const persistLcfState = useCallback(
    async (result: LcfFitResult | null) => {
      const { min, max } = parseLcfEnergyRange(energyMinEv, energyMaxEv);
      await onPersistLcf({
        targetTraceKey,
        componentTraceKeys,
        initialWeights: componentWeights.slice(0, componentTraceKeys.length),
        channel,
        energyMinEv: min != null && Number.isFinite(min) ? min : undefined,
        energyMaxEv: max != null && Number.isFinite(max) ? max : undefined,
        sumToOne,
        lastResult: result
          ? {
              fractions: result.fractions,
              referenceLabels: result.referenceLabels,
              reducedChiSquare: result.reducedChiSquare,
              computedAt: new Date().toISOString(),
            }
          : lcfMetadata?.lastResult,
      });
    },
    [
      channel,
      componentTraceKeys,
      componentWeights,
      energyMaxEv,
      energyMinEv,
      lcfMetadata?.lastResult,
      onPersistLcf,
      sumToOne,
      targetTraceKey,
    ],
  );

  const runFit = useCallback(() => {
    setFitError(null);
    if (!targetSpectrum) {
      setFitResult(null);
      setFitError("Select a target spectrum to fit.");
      return;
    }
    if (componentSpectra.length === 0) {
      setFitResult(null);
      setFitError("Add at least one standard component.");
      return;
    }
    const initialFractions = previewWeights;
    setIsFitting(true);
    try {
      const fit =
        componentSpectra.length === 1
          ? fitSingleReferenceScale(targetSpectrum, componentSpectra[0]!, {
              energyGrid,
            })
          : fitLcf(targetSpectrum, componentSpectra, {
              nonNegative: true,
              sumToOne: effectiveSumToOne,
              initialFractions,
              energyGrid,
            });
      setFitResult(fit);
      setComponentWeights(fit.fractions);
      void persistLcfState(fit);
    } catch (error) {
      setFitResult(null);
      setFitError(
        error instanceof Error ? error.message : "Linear combination fit failed.",
      );
    } finally {
      setIsFitting(false);
    }
  }, [
    componentSpectra,
    effectiveSumToOne,
    energyGrid,
    persistLcfState,
    previewWeights,
    targetSpectrum,
  ]);

  useEffect(() => {
    if (!targetSpectrum || componentSpectra.length === 0) {
      setFitResult(null);
      setFitError(null);
    }
  }, [componentSpectra.length, targetSpectrum]);

  useEffect(() => {
    setFitResult(null);
    setFitError(null);
  }, [
    targetTraceKey,
    channel,
    energyMinEv,
    energyMaxEv,
    sumToOne,
    componentTraceKeys.join("|"),
  ]);

  const plotSeries = useMemo(() => {
    if (!liveOverlay) {
      return null;
    }
    const fractions = resolveLcfPlotLegendFractions(
      previewWeights,
      fitResult?.fractions,
    );
    return buildLcfPlotSeries({
      overlay: liveOverlay,
      componentSpectra,
      fractions,
      componentColors: COMPONENT_COLORS,
    });
  }, [componentSpectra, fitResult?.fractions, liveOverlay, previewWeights]);

  const visiblePlotSeries = useMemo(() => {
    if (!plotSeries) {
      return null;
    }
    return filterLcfPlotSeriesByHiddenIds(plotSeries, hiddenTraceIds);
  }, [hiddenTraceIds, plotSeries]);

  const toggleHiddenTrace = useCallback((traceId: string) => {
    setHiddenTraceIds((current) =>
      togglePlotViewerHiddenTraceId(current, traceId),
    );
  }, []);

  const addComponent = (traceKey: string) => {
    if (!traceKey || traceKey === targetTraceKey) {
      return;
    }
    if (componentTraceKeys.includes(traceKey)) {
      return;
    }
    setComponentTraceKeys((current) => [...current, traceKey]);
  };

  const removeComponentRow = (index: number) => {
    setComponentTraceKeys((current) => current.filter((_, row) => row !== index));
    setComponentWeights((current) => current.filter((_, row) => row !== index));
  };

  const updateComponentTraceKey = (index: number, traceKey: string) => {
    setComponentTraceKeys((current) =>
      current.map((key, row) => (row === index ? traceKey : key)),
    );
  };

  const updateComponentWeight = (index: number, value: number) => {
    setFitResult(null);
    setFitError(null);
    setComponentWeights((current) =>
      current.map((weight, row) => (row === index ? value : weight)),
    );
  };

  const hasCachedSpectra = entries.length > 0 || atlasEntries.length > 0;
  const singleComponentMode = componentSpectra.length === 1;
  const sliderMax = singleComponentMode ? 2 : 1;
  const sliderStep = singleComponentMode ? 0.01 : 0.01;

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] w-full min-w-0 flex-col gap-4 lg:flex-row">
      <aside className="border-border bg-surface relative z-30 flex w-full shrink-0 flex-col gap-4 rounded-lg border p-4 lg:w-80 xl:w-96">
        <div>
          <h2 className="text-foreground text-sm font-semibold">LC fitting</h2>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Fit the <span className="text-foreground font-medium">target</span> spectrum
            as a non-negative blend of{" "}
            <span className="text-foreground font-medium">standard</span> reference
            traces on raw optical density (or another channel) over a shared energy grid.
          </p>
        </div>

        <StxmPreviewChannelSelect channel={channel} onChannelChange={setChannel} />

        <div className="flex flex-col gap-2">
          <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
            Target (unknown spectrum)
          </Label>
          {!hasCachedSpectra ? (
            <p className="text-muted text-xs">
              Reduce scans on Ingestion or keep spectra in Preview to populate targets.
            </p>
          ) : (
            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto">
              {candidates.map((candidate) => (
                <label
                  key={`target-${candidate.traceKey}`}
                  className="hover:bg-default/40 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5"
                >
                  <input
                    type="radio"
                    name="lcf-target"
                    className="mt-0.5"
                    checked={targetTraceKey === candidate.traceKey}
                    onChange={() => {
                      setTargetTraceKey(candidate.traceKey);
                      setComponentTraceKeys((current) =>
                        current.filter((key) => key !== candidate.traceKey),
                      );
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-xs">
                      {candidate.label}
                    </span>
                    <span className="text-muted text-[10px] capitalize">
                      {candidate.source}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-muted text-[10px] font-medium uppercase tracking-wide">
              Standards / components
            </Label>
            <LcfAddComponentPicker
              targetTraceKey={targetTraceKey}
              componentTraceKeys={componentTraceKeys}
              candidates={candidates}
              atlasEntries={atlasEntries}
              geometryByExperimentId={atlasGeometryByExperimentId}
              spectraByExperimentId={spectraByExperimentId}
              onAddComponent={addComponent}
              onAtlasEntriesChange={(nextEntries) => {
                void onPersistPreview({
                  ...previewMetadata,
                  atlasExperiments: nextEntries,
                });
              }}
              onGeometryByExperimentIdChange={(nextGeometry) => {
                void onPersistPreview({
                  ...previewMetadata,
                  atlasGeometryByExperimentId: nextGeometry,
                });
              }}
              isDisabled={!targetTraceKey || !hasCachedSpectra}
            />
          </div>
          {componentTraceKeys.length === 0 ? (
            <p className="text-muted text-xs">
              Add reference spectra to build the linear combination model.
            </p>
          ) : (
            <ul className="space-y-3">
              {componentTraceKeys.map((traceKey, index) => {
                const label =
                  candidateByKey.get(traceKey)?.label ?? "Select standard…";
                const weight = componentWeights[index] ?? 0;
                const sliderValue = Math.min(sliderMax, Math.max(0, weight));
                return (
                  <li
                    key={`lcf-component-row-${index}`}
                    className="border-border rounded-md border px-2 py-2"
                  >
                    <div className="flex items-start gap-1">
                      <Select
                        selectedKey={traceKey || null}
                        onSelectionChange={(key) => {
                          if (typeof key === "string") {
                            updateComponentTraceKey(index, key);
                          }
                        }}
                        aria-label={`Standard component ${index + 1}`}
                        className="min-w-0 flex-1"
                      >
                        <Select.Trigger className="border-border bg-field-background min-h-8 rounded-lg border px-2 shadow-none">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {candidates
                              .filter(
                                (candidate) =>
                                  candidate.traceKey !== targetTraceKey &&
                                  (candidate.traceKey === traceKey ||
                                    !componentTraceKeys.includes(
                                      candidate.traceKey,
                                    )),
                              )
                              .map((candidate) => (
                                <ListBox.Item
                                  key={candidate.traceKey}
                                  id={candidate.traceKey}
                                  textValue={candidate.label}
                                >
                                  {candidate.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="pointer-events-auto shrink-0"
                        aria-label={`Remove component ${index + 1}`}
                        onPress={() => removeComponentRow(index)}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Slider
                        minValue={0}
                        maxValue={sliderMax}
                        step={sliderStep}
                        value={sliderValue}
                        onChange={(value) => {
                          const next =
                            typeof value === "number"
                              ? value
                              : Array.isArray(value)
                                ? (value[0] ?? 0)
                                : 0;
                          updateComponentWeight(index, next);
                        }}
                        aria-label={
                          singleComponentMode
                            ? `Scale for ${label}`
                            : `Fraction for ${label}`
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-muted text-[10px]">
                            {singleComponentMode ? "Scale" : "Fraction"}
                          </Label>
                          <Slider.Output className="text-foreground text-[10px] tabular-nums" />
                        </div>
                        <Slider.Track className="mt-1">
                          <Slider.Fill />
                          <Slider.Thumb />
                        </Slider.Track>
                      </Slider>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TextField>
            <Label>Fit E min (eV)</Label>
            <Input
              type="number"
              step="any"
              value={energyMinEv}
              onChange={(event) => setEnergyMinEv(event.target.value)}
            />
          </TextField>
          <TextField>
            <Label>Fit E max (eV)</Label>
            <Input
              type="number"
              step="any"
              value={energyMaxEv}
              onChange={(event) => setEnergyMaxEv(event.target.value)}
            />
          </TextField>
        </div>

        <Checkbox
          isSelected={sumToOne}
          isDisabled={singleComponentMode}
          onChange={() => setSumToOne((current) => !current)}
        >
          <Checkbox.Control className={plotViewerCheckboxControlClassName}>
            <Checkbox.Indicator className={plotViewerCheckboxIndicatorClassName} />
          </Checkbox.Control>
          <Checkbox.Content>
            <span className="text-foreground text-sm">
              Fractions sum to 1
              {singleComponentMode ? " (scale-only with one standard)" : ""}
            </span>
          </Checkbox.Content>
        </Checkbox>

        <Button
          variant="primary"
          onPress={() => runFit()}
          isDisabled={isFitting || !targetTraceKey || componentTraceKeys.length === 0}
        >
          {isFitting ? "Refining fit…" : "Refine fit now"}
        </Button>

        {fitError ? (
          <p className="text-danger text-xs" role="alert">
            {fitError}
          </p>
        ) : null}

        {fitResult ? (
          <div className="border-border rounded-md border p-3">
            <p className="text-foreground text-xs font-medium">Optimized composition</p>
            <ul className="mt-2 space-y-1">
              {fitResult.referenceLabels.map((label, index) => (
                <li key={label} className="text-muted flex justify-between text-xs">
                  <span className="truncate pr-2">{label}</span>
                  <span className="text-foreground tabular-nums">
                    {singleComponentMode
                      ? fitResult.fractions[index]!.toFixed(4)
                      : `${(fitResult.fractions[index]! * 100).toFixed(1)}%`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted mt-2 text-xs">
              Reduced χ²: {fitResult.reducedChiSquare.toFixed(4)}
            </p>
          </div>
        ) : null}

        {atlasSpectraLoading ? (
          <p className="text-muted text-xs">Loading Atlas spectra…</p>
        ) : null}
      </aside>

      <section className="border-border bg-surface flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="border-border flex flex-col gap-2 border-b px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground text-sm font-medium">
              Target vs standards ({channelGlyph})
            </p>
            <p className="text-muted text-xs">
              {componentSpectra.length > 0
                ? "Live preview updates as sliders move"
                : "Add components to preview"}
            </p>
          </div>
          {plotSeries ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {plotSeries.visibilityRows.map((row) => {
                const hidden = hiddenTraceIds.includes(row.id);
                return (
                  <Checkbox
                    key={row.id}
                    isSelected={!hidden}
                    onChange={() => toggleHiddenTrace(row.id)}
                  >
                    <Checkbox.Control className={plotViewerCheckboxControlClassName}>
                      <Checkbox.Indicator
                        className={plotViewerCheckboxIndicatorClassName}
                      />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <span className="text-foreground text-xs">{row.label}</span>
                    </Checkbox.Content>
                  </Checkbox>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="pointer-events-auto flex min-h-[min(55vh,720px)] flex-1 flex-col overflow-hidden p-2">
          {visiblePlotSeries && visiblePlotSeries.targetPoints.length > 0 ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col self-stretch">
              <SpectrumPlot
                points={visiblePlotSeries.targetPoints}
                yAxisQuantity={channelToYAxisQuantity(channel)}
                primaryTraceLabel="Target"
                primaryTraceColor="var(--foreground)"
                primaryTraceLegendId={LCF_TARGET_TRACE_ID}
                companionSpectra={visiblePlotSeries.companions}
                residualSubplotSplitView={visiblePlotSeries.residual != null}
                residualSubplot={visiblePlotSeries.residual ?? undefined}
                hideGeometryLegend
                suppressInPlotLegend={false}
                plotContext={{ kind: "explore" }}
                suppressAnalysisRailLeadingGrip
                channelLegendGlyph={channelGlyph}
                cursorMode={cursorMode}
                onCursorModeChange={setCursorMode}
                emptyStateMessage="No finite points on the selected energy range for this channel."
              />
            </div>
          ) : (
            <div className="text-muted flex min-h-[20rem] flex-1 items-center justify-center px-6 text-center text-sm">
              {plotPreviewUnavailableMessage ??
                "Select a target and add at least one standard to preview the fit overlay and residual."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
