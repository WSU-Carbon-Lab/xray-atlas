"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Input,
  Label,
  Spinner,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { Upload, Wand2 } from "lucide-react";
import { KkBrowserConsentDialog } from "~/features/kk-calc/kk-browser-consent-dialog";
import {
  computeStxmIngestion,
  grantKkBrowserConsent,
  readKkBrowserConsentGranted,
  type StxmIngestionResult,
} from "~/features/dashboard/lib/computeStxmIngestion";
import { ingestionResultToPersisted } from "~/features/dashboard/lib/downsampleIngestionResult";
import { parseLocalStxmPair } from "~/features/dashboard/hooks/useStxmScanLoader";
import type {
  DashboardIngestionResult,
  DashboardPreviewSpectrumEntry,
  DashboardPreviewStepMetadata,
  DashboardReduceStepMetadata,
  DashboardRegionsStepMetadata,
  DashboardStandardOverlay,
  StxmNormalizationWindows,
} from "~/lib/dashboard-processing-session";
import { suggestNormalizationWindows } from "~/lib/stxm/normalization";
import { regionSpectrumToRecord, reduceTwoRegion } from "~/lib/stxm/reduction";
import { sampleIzeroMasks } from "~/lib/stxm/regions";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import { float64ImageToMatrix } from "~/lib/stxm/image-matrix";
import { inferStxmEdgeFromEnergyRange } from "~/lib/stxm/infer-edge-from-energy";
import {
  autoMultiRegionFromImage,
  legacyBoundsToMultiRegion,
  multiRegionToLegacyBounds,
} from "~/lib/stxm/multi-region-state";
import { regionRawSpectraFromScan } from "~/lib/stxm/raw-spectrum";
import { setPureRegionRole } from "~/lib/stxm/region-editor-utils";
import { STXM_INGESTION_CHANNEL_OPTIONS } from "~/lib/stxm/stxm-ingestion-display";
import type {
  StxmIzeroBounds,
  StxmPlotScaleMode,
  StxmRegionSpectrumSeries,
  StxmSampleRegion,
} from "~/lib/stxm/stxm-region-types";
import { showToast } from "~/components/ui/toast";
import { StxmMultiRegionEditor } from "./stxm-multi-region-editor";
import {
  StxmIngestionPlotPanel,
  type StxmPlotStandardOverlay,
} from "./stxm-ingestion-plot-panel";
import { StxmStandardsPicker } from "./stxm-standards-picker";
import { StxmUploadDialog } from "./stxm-upload-dialog";
import type { StxmIngestionPlotChannel } from "~/lib/stxm/stxm-ingestion-display";

const WEIGHTING_OPTIONS: Array<{ id: StxmWeightingMode; label: string }> = [
  { id: "poisson_mle", label: "Poisson MLE" },
  { id: "inverse_count", label: "Inverse count" },
  { id: "empirical", label: "Empirical" },
];

type IngestionTabProps = {
  hdrFile: File;
  ximFile: File;
  scanLabel: string;
  scanId: string;
  energyMinEv: number | null;
  energyMaxEv: number | null;
  regionsMetadata: DashboardRegionsStepMetadata | undefined;
  reduceMetadata: DashboardReduceStepMetadata | undefined;
  ingestionMetadata: DashboardIngestionResult | undefined;
  previewMetadata: DashboardPreviewStepMetadata | undefined;
  onPersistRegions: (regions: DashboardRegionsStepMetadata) => Promise<void>;
  onPersistReduce: (reduce: DashboardReduceStepMetadata) => Promise<void>;
  onPersistIngestion: (ingestion: DashboardIngestionResult) => Promise<void>;
  onPersistPreview: (preview: DashboardPreviewStepMetadata) => Promise<void>;
  isSaving: boolean;
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

function initialMultiRegion(
  regionsMetadata: DashboardRegionsStepMetadata | undefined,
  spatial: Float64Array,
  image: Float64Array[],
): {
  regions: StxmSampleRegion[];
  izero: StxmIzeroBounds;
  pureRegionId: string;
} {
  if (regionsMetadata?.sampleRegions?.length && regionsMetadata.izeroBounds) {
    return {
      regions: regionsMetadata.sampleRegions,
      izero: regionsMetadata.izeroBounds,
      pureRegionId:
        regionsMetadata.pureRegionId ?? regionsMetadata.sampleRegions[0]!.id,
    };
  }
  if (regionsMetadata?.bounds) {
    return legacyBoundsToMultiRegion(regionsMetadata.bounds);
  }
  return autoMultiRegionFromImage(image, spatial);
}

/**
 * Ingestion tab with multi-region editor, linked plot scaling, standards overlays, and upload gate.
 */
export function IngestionTab({
  hdrFile,
  ximFile,
  scanLabel,
  scanId,
  energyMinEv,
  energyMaxEv,
  regionsMetadata,
  reduceMetadata,
  ingestionMetadata,
  previewMetadata,
  onPersistRegions,
  onPersistReduce,
  onPersistIngestion,
  onPersistPreview,
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
  const [regions, setRegions] = useState<StxmSampleRegion[]>([]);
  const [izero, setIzero] = useState<StxmIzeroBounds | null>(null);
  const [pureRegionId, setPureRegionId] = useState<string | null>(null);
  const [plotScaleMode, setPlotScaleMode] = useState<StxmPlotScaleMode>(
    regionsMetadata?.plotScaleMode ?? "log",
  );
  const [displayChannel, setDisplayChannel] =
    useState<StxmIngestionPlotChannel>("od");
  const [normalization, setNormalization] =
    useState<StxmNormalizationWindows | null>(
      regionsMetadata?.normalization ?? null,
    );
  const [formula, setFormula] = useState(regionsMetadata?.formula ?? "C");
  const [thicknessCm, setThicknessCm] = useState(
    String(regionsMetadata?.thicknessCm ?? 1e-4),
  );
  const [result, setResult] = useState<StxmIngestionResult | null>(
    ingestionMetadata ? persistedToRuntime(ingestionMetadata) : null,
  );
  const [regionSpectra, setRegionSpectra] = useState<StxmRegionSpectrumSeries[]>(
    [],
  );
  const [standardOverlays, setStandardOverlays] = useState<
    DashboardStandardOverlay[]
  >(previewMetadata?.standardOverlays ?? []);
  const [plotStandards, setPlotStandards] = useState<StxmPlotStandardOverlay[]>(
    [],
  );
  const [isReducing, setIsReducing] = useState(false);
  const [kkConsentOpen, setKkConsentOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const pendingRecomputeRef = useRef(false);
  const debouncePersistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRawRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inferredEdge = useMemo(
    () => inferStxmEdgeFromEnergyRange(energyMinEv, energyMaxEv),
    [energyMaxEv, energyMinEv],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    void parseLocalStxmPair(hdrFile, ximFile)
      .then((parseResult) => {
        if (cancelled) {
          return;
        }
        setLoaded(parseResult);
        const initial = initialMultiRegion(
          regionsMetadata,
          parseResult.oriented.spatial,
          parseResult.oriented.image,
        );
        setRegions(initial.regions);
        setIzero(initial.izero);
        setPureRegionId(initial.pureRegionId);
        if (!regionsMetadata?.normalization) {
          setNormalization(
            suggestNormalizationWindows(parseResult.oriented.energyEv),
          );
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
  }, [hdrFile, regionsMetadata, ximFile]);

  const imageMatrix = useMemo(
    () => (loaded ? float64ImageToMatrix(loaded.oriented.image) : []),
    [loaded],
  );

  const qaxisPoints = useMemo(
    () => (loaded ? Array.from(loaded.oriented.spatial) : []),
    [loaded],
  );

  const schedulePersistRegions = useCallback(() => {
    if (!izero || regions.length === 0) {
      return;
    }
    if (debouncePersistRef.current) {
      clearTimeout(debouncePersistRef.current);
    }
    debouncePersistRef.current = setTimeout(() => {
      void onPersistRegions({
        scanId,
        bounds: multiRegionToLegacyBounds(regions, izero, pureRegionId),
        sampleRegions: regions,
        izeroBounds: izero,
        pureRegionId: pureRegionId ?? undefined,
        plotScaleMode,
        weightingMode,
        formula: formula.trim() || undefined,
        thicknessCm: Number.parseFloat(thicknessCm) || undefined,
        normalization: normalization ?? undefined,
      });
    }, 600);
  }, [
    formula,
    izero,
    normalization,
    onPersistRegions,
    plotScaleMode,
    pureRegionId,
    regions,
    scanId,
    thicknessCm,
    weightingMode,
  ]);

  const recomputeRawSpectra = useCallback(() => {
    if (!loaded || !izero || regions.length === 0) {
      return;
    }
    try {
      const spectra = regionRawSpectraFromScan(
        loaded.oriented.image,
        loaded.oriented.energyEv,
        loaded.oriented.spatial,
        regions,
        izero,
        weightingMode,
      );
      setRegionSpectra(spectra);
    } catch {
      setRegionSpectra([]);
    }
  }, [izero, loaded, regions, weightingMode]);

  useEffect(() => {
    if (!loaded || !izero) {
      return;
    }
    if (debounceRawRef.current) {
      clearTimeout(debounceRawRef.current);
    }
    debounceRawRef.current = setTimeout(() => {
      recomputeRawSpectra();
      schedulePersistRegions();
    }, 300);
    return () => {
      if (debounceRawRef.current) {
        clearTimeout(debounceRawRef.current);
      }
    };
  }, [izero, loaded, recomputeRawSpectra, regions, schedulePersistRegions, weightingMode]);

  const runPipeline = useCallback(async () => {
    if (!loaded || !izero || regions.length === 0 || !normalization) {
      return;
    }
    setIsReducing(true);
    try {
      const bounds = multiRegionToLegacyBounds(regions, izero, pureRegionId);
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
      recomputeRawSpectra();
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
    formula,
    izero,
    loaded,
    normalization,
    onPersistIngestion,
    onPersistReduce,
    pureRegionId,
    recomputeRawSpectra,
    regions,
    scanId,
    thicknessCm,
    weightingMode,
  ]);

  const handleAutoSuggest = useCallback(() => {
    if (!loaded) {
      return;
    }
    const initial = autoMultiRegionFromImage(
      loaded.oriented.image,
      loaded.oriented.spatial,
    );
    setRegions(initial.regions);
    setIzero(initial.izero);
    setPureRegionId(initial.pureRegionId);
    showToast("Auto-suggested region bounds", "success");
  }, [loaded]);

  const handleAutoNorm = useCallback(() => {
    if (!loaded) {
      return;
    }
    setNormalization(suggestNormalizationWindows(loaded.oriented.energyEv));
    showToast("Auto-suggested normalization windows", "success");
  }, [loaded]);

  const handleKeepInCache = useCallback(async () => {
    const entry: DashboardPreviewSpectrumEntry = {
      scanId,
      scanLabel,
      keptAt: new Date().toISOString(),
      edgeLabel: inferredEdge?.label,
      hdrFileName: hdrFile.name,
      ximFileName: ximFile.name,
    };
    const existing = previewMetadata?.spectra ?? [];
    const nextSpectra = [
      ...existing.filter((row) => row.scanId !== scanId),
      entry,
    ];
    const ingestionCache = {
      ...(previewMetadata?.ingestionCache ?? {}),
    };
    if (result) {
      ingestionCache[scanId] = ingestionResultToPersisted(result, scanId);
    }
    await onPersistPreview({
      spectra: nextSpectra,
      standardOverlays,
      ingestionCache,
    });
  }, [
    hdrFile.name,
    inferredEdge?.label,
    onPersistPreview,
    previewMetadata?.ingestionCache,
    previewMetadata?.spectra,
    result,
    scanId,
    scanLabel,
    standardOverlays,
    ximFile.name,
  ]);

  const handleRegionChange = useCallback(
    (index: number, region: StxmSampleRegion) => {
      setRegions((current) => {
        const next = [...current];
        next[index] = region;
        return next;
      });
    },
    [],
  );

  const handleSetPureRegion = useCallback((regionId: string) => {
    setPureRegionId(regionId);
    setRegions((current) => setPureRegionRole(current, regionId));
  }, []);

  const yScale = plotScaleMode;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError || !loaded || !izero || !normalization) {
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

      <StxmUploadDialog
        isOpen={uploadOpen}
        scanLabel={scanLabel}
        onClose={() => setUploadOpen(false)}
        onKeepInCache={() => void handleKeepInCache()}
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
              STXM_INGESTION_CHANNEL_OPTIONS.some((option) => option.id === key)
            ) {
              setDisplayChannel(key as StxmIngestionPlotChannel);
            }
          }}
        >
          {STXM_INGESTION_CHANNEL_OPTIONS.map((option) => (
            <ToggleButton key={option.id} id={option.id} size="sm">
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={[plotScaleMode]}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (key === "linear" || key === "log") {
              setPlotScaleMode(key);
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
        <Button
          variant="secondary"
          size="sm"
          isDisabled={!result}
          onPress={() => setUploadOpen(true)}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Upload / keep
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <StxmMultiRegionEditor
            image={imageMatrix}
            qaxisPoints={qaxisPoints}
            regions={regions}
            izero={izero}
            imageScaleMode={plotScaleMode}
            onRegionsChange={setRegions}
            onRegionChange={handleRegionChange}
            onIzeroChange={setIzero}
          />
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => (
              <Button
                key={region.id}
                size="sm"
                variant={pureRegionId === region.id ? "primary" : "secondary"}
                onPress={() => handleSetPureRegion(region.id)}
              >
                I0/sample: {region.spotLabel || "region"}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <StxmIngestionPlotPanel
            result={result}
            regionSpectra={regionSpectra}
            channel={displayChannel}
            yScale={yScale}
            standards={plotStandards}
            bareAtomCurve={null}
            showRegionOverlays
            height={360}
          />
        </div>
      </div>

      <StxmStandardsPicker
        edgeLabel={inferredEdge?.label ?? null}
        overlays={standardOverlays}
        onOverlaysChange={setStandardOverlays}
        onPlotStandardsChange={setPlotStandards}
      />

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
        Keep scans from Ingestion to list them here.
      </p>
    </div>
  );
}

export { FitPlaceholderStep as LcfPlaceholder } from "./regions-step";
