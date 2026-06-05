"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Spinner,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { Wand2 } from "lucide-react";
import { KkBrowserConsentDialog } from "~/features/kk-calc/kk-browser-consent-dialog";
import {
  computeStxmIngestion,
  grantKkBrowserConsent,
  readKkBrowserConsentGranted,
  type StxmIngestionDisplayChannel,
  type StxmIngestionResult,
} from "~/features/dashboard/lib/computeStxmIngestion";
import { ingestionResultToPersisted } from "~/features/dashboard/lib/downsampleIngestionResult";
import { parseLocalStxmPair } from "~/features/dashboard/hooks/useStxmScanLoader";
import type {
  DashboardIngestionResult,
  DashboardReduceStepMetadata,
  DashboardRegionsStepMetadata,
  StxmNormalizationWindows,
  StxmRegionBounds,
} from "~/lib/dashboard-processing-session";
import { suggestNormalizationWindows } from "~/lib/stxm/normalization";
import { autoSampleIzeroRegions, sampleIzeroMasks } from "~/lib/stxm/regions";
import { regionSpectrumToRecord, reduceTwoRegion } from "~/lib/stxm/reduction";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import { showToast } from "~/components/ui/toast";
import {
  displayChannelToTraces,
  IngestionSpectrumChart,
  type IngestionSpectrumTraceId,
} from "./ingestion-spectrum-chart";
import { StxmRegionHeatmap } from "./stxm-region-heatmap";

const WEIGHTING_OPTIONS: Array<{ id: StxmWeightingMode; label: string }> = [
  { id: "poisson_mle", label: "Poisson MLE" },
  { id: "inverse_count", label: "Inverse count" },
  { id: "empirical", label: "Empirical" },
];

const CHANNEL_OPTIONS: Array<{ id: StxmIngestionDisplayChannel; label: string }> =
  [
    { id: "signal_i0", label: "I0" },
    { id: "signal_sample", label: "Sample" },
    { id: "signal_inv_i0", label: "1/I0" },
    { id: "od", label: "OD" },
    { id: "od_normalized", label: "Norm OD" },
    { id: "mass_absorption", label: "Mass abs" },
    { id: "beta", label: "Beta" },
    { id: "delta", label: "Delta" },
  ];

type IngestionTabProps = {
  hdrFile: File;
  ximFile: File;
  scanLabel: string;
  regionsMetadata: DashboardRegionsStepMetadata | undefined;
  reduceMetadata: DashboardReduceStepMetadata | undefined;
  ingestionMetadata: DashboardIngestionResult | undefined;
  onPersistRegions: (regions: DashboardRegionsStepMetadata) => Promise<void>;
  onPersistReduce: (reduce: DashboardReduceStepMetadata) => Promise<void>;
  onPersistIngestion: (ingestion: DashboardIngestionResult) => Promise<void>;
  isSaving: boolean;
};

function defaultBounds(spatial: Float64Array): StxmRegionBounds {
  const yMin = spatial[0] ?? 0;
  const yMax = spatial[spatial.length - 1] ?? 1;
  const span = yMax - yMin || 1;
  return {
    sampleLo: yMin + span * 0.55,
    sampleHi: yMax - span * 0.05,
    izeroLo: yMin + span * 0.05,
    izeroHi: yMin + span * 0.35,
  };
}

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

/**
 * Ingestion tab: draggable regions, full optical-constants pipeline, and spectrum comparison.
 */
export function IngestionTab({
  hdrFile,
  ximFile,
  scanLabel,
  regionsMetadata,
  reduceMetadata,
  ingestionMetadata,
  onPersistRegions,
  onPersistReduce,
  onPersistIngestion,
  isSaving,
}: IngestionTabProps) {
  const [loaded, setLoaded] = useState<Awaited<
    ReturnType<typeof parseLocalStxmPair>
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weightingMode, setWeightingMode] = useState<StxmWeightingMode>(
    regionsMetadata?.weightingMode ?? "poisson_mle",
  );
  const [bounds, setBounds] = useState<StxmRegionBounds | null>(
    regionsMetadata?.bounds ?? null,
  );
  const [normalization, setNormalization] =
    useState<StxmNormalizationWindows | null>(
      regionsMetadata?.normalization ?? null,
    );
  const [formula, setFormula] = useState(regionsMetadata?.formula ?? "C");
  const [thicknessCm, setThicknessCm] = useState(
    String(regionsMetadata?.thicknessCm ?? 1e-4),
  );
  const [displayChannel, setDisplayChannel] =
    useState<StxmIngestionDisplayChannel>("od");
  const [yScale, setYScale] = useState<"linear" | "log">("linear");
  const [compareOverlay, setCompareOverlay] = useState(false);
  const [result, setResult] = useState<StxmIngestionResult | null>(
    ingestionMetadata ? persistedToRuntime(ingestionMetadata) : null,
  );
  const [isReducing, setIsReducing] = useState(false);
  const [kkConsentOpen, setKkConsentOpen] = useState(false);
  const pendingRecomputeRef = useRef(false);
  const debouncePersistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    void parseLocalStxmPair(hdrFile, ximFile)
      .then((parseResult) => {
        if (!cancelled) {
          setLoaded(parseResult);
          if (!regionsMetadata?.bounds) {
            setBounds(defaultBounds(parseResult.oriented.spatial));
          }
          if (!regionsMetadata?.normalization) {
            setNormalization(
              suggestNormalizationWindows(parseResult.oriented.energyEv),
            );
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load scan",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hdrFile, regionsMetadata?.bounds, regionsMetadata?.normalization, ximFile]);

  const schedulePersistRegions = useCallback(
    (nextBounds: StxmRegionBounds) => {
      if (debouncePersistRef.current) {
        clearTimeout(debouncePersistRef.current);
      }
      debouncePersistRef.current = setTimeout(() => {
        void onPersistRegions({
          scanId: regionsMetadata?.scanId ?? scanLabel,
          bounds: nextBounds,
          weightingMode,
          formula: formula.trim() || undefined,
          thicknessCm: Number.parseFloat(thicknessCm) || undefined,
          normalization: normalization ?? undefined,
        });
      }, 600);
    },
    [
      formula,
      normalization,
      onPersistRegions,
      regionsMetadata?.scanId,
      scanLabel,
      thicknessCm,
      weightingMode,
    ],
  );

  const handleBoundsChange = useCallback(
    (nextBounds: StxmRegionBounds) => {
      setBounds(nextBounds);
      schedulePersistRegions(nextBounds);
    },
    [schedulePersistRegions],
  );

  const runPipeline = useCallback(async () => {
    if (!loaded || !bounds || !normalization) {
      return;
    }
    setIsReducing(true);
    try {
      const thickness = Number.parseFloat(thicknessCm);
      const pipelineResult = await computeStxmIngestion({
        image: loaded.oriented.image,
        spatial: loaded.oriented.spatial,
        energyEv: loaded.oriented.energyEv,
        bounds,
        weightingMode,
        normalization,
        formula: formula.trim() || null,
        thicknessCm: Number.isFinite(thickness) && thickness > 0 ? thickness : 1e-4,
        runKkDelta: Boolean(formula.trim()),
      });
      setResult(pipelineResult);
      const scanId = regionsMetadata?.scanId ?? scanLabel;
      await onPersistIngestion(ingestionResultToPersisted(pipelineResult, scanId));
      const { sampleMask, izeroMask } = sampleIzeroMasks(
        loaded.oriented.spatial,
        bounds.sampleLo,
        bounds.sampleHi,
        bounds.izeroLo,
        bounds.izeroHi,
      );
      const spectrum = reduceTwoRegion(
        loaded.oriented.image,
        sampleMask,
        izeroMask,
        loaded.oriented.energyEv,
        "sample",
        weightingMode,
      );
      await onPersistReduce({
        scanId,
        spectra: [regionSpectrumToRecord(spectrum)],
        computedAt: new Date().toISOString(),
        method: "two_region",
      });
      showToast("Spectra recomputed", "success");
    } catch (error) {
      if (error instanceof Error && error.message === "KK_CONSENT_REQUIRED") {
        pendingRecomputeRef.current = true;
        setKkConsentOpen(true);
        return;
      }
      showToast(
        error instanceof Error ? error.message : "Reduction failed",
        "error",
      );
    } finally {
      setIsReducing(false);
    }
  }, [
    bounds,
    formula,
    loaded,
    normalization,
    onPersistIngestion,
    onPersistReduce,
    regionsMetadata?.scanId,
    scanLabel,
    thicknessCm,
    weightingMode,
  ]);

  const handleAutoSuggest = useCallback(() => {
    if (!loaded) {
      return;
    }
    const [sampleLo, sampleHi, izeroLo, izeroHi] = autoSampleIzeroRegions(
      loaded.oriented.image,
      loaded.oriented.spatial,
    );
    const next = { sampleLo, sampleHi, izeroLo, izeroHi };
    setBounds(next);
    schedulePersistRegions(next);
    showToast("Auto-suggested region bounds", "success");
  }, [loaded, schedulePersistRegions]);

  const handleAutoNorm = useCallback(() => {
    if (!loaded) {
      return;
    }
    setNormalization(suggestNormalizationWindows(loaded.oriented.energyEv));
    showToast("Auto-suggested normalization windows", "success");
  }, [loaded]);

  const enabledTraces = useMemo(() => {
    const traces = new Set<IngestionSpectrumTraceId>(
      displayChannelToTraces(displayChannel),
    );
    if (compareOverlay) {
      traces.add("i0");
      traces.add("iSample");
    }
    return traces;
  }, [compareOverlay, displayChannel]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError || !loaded || !bounds || !normalization) {
    return (
      <p className="text-danger text-sm">{loadError ?? "Unable to load scan."}</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <KkBrowserConsentDialog
        isOpen={kkConsentOpen}
        onDismiss={() => {
          setKkConsentOpen(false);
          pendingRecomputeRef.current = false;
        }}
        onAccept={() => {
          grantKkBrowserConsent();
          setKkConsentOpen(false);
          if (pendingRecomputeRef.current) {
            pendingRecomputeRef.current = false;
            void runPipeline();
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={[weightingMode]}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (
              key === "poisson_mle" ||
              key === "inverse_count" ||
              key === "empirical"
            ) {
              setWeightingMode(key);
            }
          }}
        >
          {WEIGHTING_OPTIONS.map((option) => (
            <ToggleButton key={option.id} id={option.id} size="sm">
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={[displayChannel]}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (
              typeof key === "string" &&
              CHANNEL_OPTIONS.some((option) => option.id === key)
            ) {
              setDisplayChannel(key as StxmIngestionDisplayChannel);
            }
          }}
        >
          {CHANNEL_OPTIONS.map((option) => (
            <ToggleButton key={option.id} id={option.id} size="sm">
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={[yScale]}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (key === "linear" || key === "log") {
              setYScale(key);
            }
          }}
        >
          <ToggleButton id="linear" size="sm">
            Linear
          </ToggleButton>
          <ToggleButton id="log" size="sm">
            Log
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onPress={handleAutoSuggest}>
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Auto regions
        </Button>
        <Button variant="secondary" size="sm" onPress={handleAutoNorm}>
          Auto norm windows
        </Button>
        <Button
          variant="primary"
          size="sm"
          isDisabled={isSaving || isReducing}
          onPress={() => void runPipeline()}
        >
          {isReducing ? (
            <>
              <Spinner size="sm" />
              Recomputing...
            </>
          ) : (
            "Recompute spectra"
          )}
        </Button>
        <Checkbox isSelected={compareOverlay} onChange={setCompareOverlay}>
          Overlay I0 + sample
        </Checkbox>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <StxmRegionHeatmap
            image={loaded.oriented.image}
            spatialAxis={loaded.oriented.spatial}
            bounds={bounds}
            onBoundsChange={handleBoundsChange}
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["sampleLo", "Sample low"],
                ["sampleHi", "Sample high"],
                ["izeroLo", "Izero low"],
                ["izeroHi", "Izero high"],
              ] as const
            ).map(([key, label]) => (
              <TextField key={key}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  step="any"
                  value={String(bounds[key])}
                  onChange={(event) => {
                    const parsed = Number.parseFloat(event.target.value);
                    if (Number.isFinite(parsed)) {
                      handleBoundsChange({ ...bounds, [key]: parsed });
                    }
                  }}
                />
              </TextField>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {result ? (
            <IngestionSpectrumChart
              result={result}
              enabledTraces={enabledTraces}
              yScale={yScale}
            />
          ) : (
            <p className="text-muted text-sm">
              Drag region handles on the heatmap, then click Recompute spectra.
            </p>
          )}
        </div>
      </div>

      <div className="border-border grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField>
          <Label>Formula (bare atom / KK)</Label>
          <Input
            value={formula}
            onChange={(event) => setFormula(event.target.value)}
            placeholder="e.g. C8H8"
          />
        </TextField>
        <TextField>
          <Label>Thickness (cm)</Label>
          <Input
            type="number"
            step="any"
            value={thicknessCm}
            onChange={(event) => setThicknessCm(event.target.value)}
          />
        </TextField>
        {(
          [
            ["preLo", "Pre-edge low"],
            ["preHi", "Pre-edge high"],
            ["postLo", "Post-edge low"],
            ["postHi", "Post-edge high"],
          ] as const
        ).map(([key, label]) => (
          <TextField key={key}>
            <Label>{label} (eV)</Label>
            <Input
              type="number"
              step="any"
              value={String(normalization[key])}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value);
                if (Number.isFinite(parsed)) {
                  setNormalization({ ...normalization, [key]: parsed });
                }
              }}
            />
          </TextField>
        ))}
      </div>

      {reduceMetadata?.spectra.length ? (
        <p className="text-muted text-xs">
          Last reduce: {reduceMetadata.computedAt.slice(0, 19).replace("T", " ")}
          {result?.kkEngineLabel && readKkBrowserConsentGranted()
            ? ` | KK: ${result.kkEngineLabel}`
            : null}
        </p>
      ) : null}
    </div>
  );
}

export function PreviewSpectraPlaceholder() {
  return (
    <div className="border-border bg-default/30 rounded-lg border border-dashed px-5 py-8">
      <p className="text-foreground text-sm font-medium">Preview spectra</p>
      <p className="text-muted mt-2 text-sm">
        Multi-scan spectrum comparison arrives in a later phase.
      </p>
    </div>
  );
}

export { FitPlaceholderStep as LcfPlaceholder } from "./regions-step";
