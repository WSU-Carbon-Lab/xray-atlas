"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ErrorMessage, Spinner } from "@heroui/react";
import { KkBrowserConsentDialog } from "~/features/kk-calc/kk-browser-consent-dialog";
import {
  computeStxmIngestion,
  enrichRegionSpectraWithReduction,
  grantKkBrowserConsent,
  readKkBrowserConsentGranted,
  type StxmIngestionResult,
} from "~/features/dashboard/lib/computeStxmIngestion";
import { readStxmComputeConsentGranted } from "~/lib/stxm/compute-consent";
import { ingestionResultToPersisted } from "~/features/dashboard/lib/downsampleIngestionResult";
import { buildStxmPreviewCacheUpdate } from "./sync-stxm-preview-cache";
import { previewRegionSpectraToSeries } from "./downsample-region-spectra-for-persist";
import { parseLocalStxmPair } from "~/features/dashboard/hooks/useStxmScanLoader";
import {
  mergeLinkedMoleculeIntoRegionsMetadata,
  resolveLinkedMoleculeForScan,
  type DashboardIngestionResult,
  type DashboardPreviewStepMetadata,
  type DashboardReduceStepMetadata,
  type DashboardRegionsStepMetadata,
  type StxmIntensityGlitchRecord,
  type DashboardStandardOverlay,
  type StxmNormalizationWindows,
} from "~/lib/dashboard-processing-session";
import { suggestNormalizationWindows } from "~/lib/stxm/normalization";
import { regionSpectrumToRecord, reduceTwoRegion } from "~/lib/stxm/reduction";
import { sampleIzeroMasks } from "~/lib/stxm/regions";
import { float64ImageToMatrix } from "~/lib/stxm/image-matrix";
import { inferStxmEdgeFromEnergyRange } from "~/lib/stxm/infer-edge-from-energy";
import {
  autoMultiRegionFromImage,
  legacyBoundsToMultiRegion,
  multiRegionToLegacyBounds,
} from "~/lib/stxm/multi-region-state";
import { detectStxmIntensityGlitches } from "~/lib/stxm/detect-stxm-intensity-glitches";
import { regionRawSpectraFromScan } from "~/lib/stxm/raw-spectrum";
import type {
  StxmIzeroBounds,
  StxmPlotScaleMode,
  StxmRegionSpectrumSeries,
  StxmSampleRegion,
} from "~/lib/stxm/stxm-region-types";
import { showToast } from "~/components/ui/toast";
import { STXM_INGESTION_SPECTRUM_HEIGHT_PX } from "./stxm-ingestion-layout";
import {
  StxmIngestionPlotPanel,
  type StxmPlotStandardOverlay,
} from "./stxm-ingestion-plot-panel";
import { StxmStandardsPicker } from "./stxm-standards-picker";
import { StxmUploadDialog } from "./stxm-upload-dialog";
import {
  StxmIngestionAttributionSection,
  StxmIngestionSampleSection,
  StxmMoleculeField,
} from "./stxm-ingestion-context-panel";
import {
  attributionsFromStxmExportMetadata,
  buildStxmExportStepMetadata,
  defaultStxmSampleInfo,
  parseStxmExportStepMetadata,
  type StxmExportStepMetadata,
  type StxmPeak,
  type StxmSampleInfo,
} from "~/features/dashboard/lib/stxm-export-metadata";
import type { MoleculeSearchResult } from "~/features/process-nexafs/types";
import type { DatasetAttributionEntry } from "~/lib/nexafs-attribution";
import type { Peak } from "~/components/plots/types";
import { trpc } from "~/trpc/client";
import type { StreamBeamtimeCatalogPhase } from "~/features/dashboard/lib/buildBeamtimeCatalog";
import { LineScanBrowserStrip } from "./line-scan-browser-strip";
import {
  shouldHydrateNormalizationFromSession,
  shouldHydrateRegionsFromSession,
  stxmNormalizationHydrationAfterApply,
  stxmRegionHydrationAfterApply,
  stxmSessionHasNormalization,
  stxmSessionHasRegionBounds,
  type StxmNormalizationHydrationState,
  type StxmRegionHydrationState,
} from "./stxm-region-session-sync";
import type { StxmCatalogEntry } from "~/lib/stxm";
import type { StxmIngestionPlotChannel } from "~/lib/stxm/stxm-ingestion-display";
import {
  migrateStxmRawSignalTransformMode,
  type StxmRawSignalTransformMode,
} from "~/lib/stxm/stxm-raw-signal-transform";
import {
  inferStxmTeyExperiment,
  parseTeyDrainSeriesFromHdr,
  stxmIeChannelAvailable,
} from "~/lib/stxm/stxm-tey-intensity";
import type { DatasetAttributionChange } from "~/features/process-nexafs/ui/dataset-attribution-editor";

const RAW_SPECTRA_DEBOUNCE_MS = 300;
const PIPELINE_DEBOUNCE_MS = 400;
/** Throttled preview interval while region, izero, or normalization bounds are dragged. */
const DRAG_PREVIEW_THROTTLE_MS = 75;
const POISSON_WEIGHTING = "poisson_mle" as const;

type RunPipelineOptions = {
  /** When true, updates plot state only; skips session ingestion/reduce persistence. */
  previewOnly?: boolean;
};

type IngestionTabProps = {
  exportMetadata: unknown;
  hdrFile: File;
  ximFile: File;
  scanLabel: string;
  scanId: string;
  energyMinEv: number | null;
  energyMaxEv: number | null;
  catalogEntries: StxmCatalogEntry[];
  selectedScanRelativePath: string | null;
  catalogLoading?: boolean;
  catalogEnriching?: boolean;
  catalogScanPhase?: StreamBeamtimeCatalogPhase | null;
  isSelectingScan?: boolean;
  selectingScanRelativePath?: string | null;
  onSelectCatalogScan: (entry: StxmCatalogEntry) => void;
  scanRegionsMetadata: DashboardRegionsStepMetadata | undefined;
  sessionReady: boolean;
  reduceMetadata: DashboardReduceStepMetadata | undefined;
  scanIngestionMetadata: DashboardIngestionResult | undefined;
  previewMetadata: DashboardPreviewStepMetadata;
  onPersistRegions: (regions: DashboardRegionsStepMetadata) => Promise<void>;
  onPersistReduce: (reduce: DashboardReduceStepMetadata) => Promise<void>;
  onPersistIngestion: (ingestion: DashboardIngestionResult) => Promise<void>;
  onPersistPreview: (preview: DashboardPreviewStepMetadata) => Promise<void>;
  onPersistExport: (exportMeta: StxmExportStepMetadata) => Promise<void>;
  onFlushSession: () => Promise<void>;
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
    iTe: null,
    iTeErr: null,
    od: persisted.od,
    odErr: persisted.odErr,
    odNormalized: persisted.odNormalized ?? [],
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
  exportMetadata,
  hdrFile,
  ximFile,
  scanLabel,
  scanId,
  energyMinEv,
  energyMaxEv,
  catalogEntries,
  selectedScanRelativePath,
  catalogLoading = false,
  catalogEnriching = false,
  catalogScanPhase = null,
  isSelectingScan = false,
  selectingScanRelativePath = null,
  onSelectCatalogScan,
  scanRegionsMetadata,
  sessionReady,
  reduceMetadata,
  scanIngestionMetadata,
  previewMetadata,
  onPersistRegions,
  onPersistReduce,
  onPersistIngestion,
  onPersistPreview,
  onPersistExport,
  onFlushSession,
  isSaving: _isSaving,
}: IngestionTabProps) {
  const linkedMoleculeSeed = useMemo(
    () =>
      resolveLinkedMoleculeForScan(
        {
          regionsCache: scanRegionsMetadata
            ? { [scanId]: scanRegionsMetadata }
            : undefined,
          preview: previewMetadata,
        },
        scanId,
      ),
    [previewMetadata, scanId, scanRegionsMetadata],
  );
  const [loaded, setLoaded] = useState<Awaited<
    ReturnType<typeof parseLocalStxmPair>
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const weightingMode = POISSON_WEIGHTING;
  const parsedExport = useMemo(
    () => parseStxmExportStepMetadata(exportMetadata),
    [exportMetadata],
  );
  const [regions, setRegions] = useState<StxmSampleRegion[]>([]);
  const [izero, setIzero] = useState<StxmIzeroBounds | null>(null);
  const [pureRegionId, setPureRegionId] = useState<string | null>(null);
  const [plotScaleMode, setPlotScaleMode] = useState<StxmPlotScaleMode>(
    scanRegionsMetadata?.plotScaleMode ?? "log",
  );
  const [rawSignalTransform, setRawSignalTransform] =
    useState<StxmRawSignalTransformMode>(() =>
      migrateStxmRawSignalTransformMode(
        scanRegionsMetadata?.rawSignalTransform ?? scanRegionsMetadata?.i0PlotScale,
      ),
    );
  const [displayChannel, setDisplayChannel] =
    useState<StxmIngestionPlotChannel>("od");
  const [regionEditorTrayOpen, setRegionEditorTrayOpen] = useState(
    () => scanRegionsMetadata?.regionEditorTrayOpen ?? true,
  );
  const [normalization, setNormalization] =
    useState<StxmNormalizationWindows | null>(
      scanRegionsMetadata?.normalization ?? null,
    );
  const [thicknessCm, setThicknessCm] = useState(
    String(scanRegionsMetadata?.thicknessCm ?? 1e-4),
  );
  const [result, setResult] = useState<StxmIngestionResult | null>(
    scanIngestionMetadata ? persistedToRuntime(scanIngestionMetadata) : null,
  );
  const [regionSpectra, setRegionSpectra] = useState<StxmRegionSpectrumSeries[]>(
    [],
  );
  const [intensityGlitches, setIntensityGlitches] = useState<
    StxmIntensityGlitchRecord[]
  >(scanRegionsMetadata?.intensityGlitches ?? []);
  const [standardOverlays, setStandardOverlays] = useState<
    DashboardStandardOverlay[]
  >(previewMetadata?.standardOverlays ?? []);
  const [plotStandards, setPlotStandards] = useState<StxmPlotStandardOverlay[]>(
    [],
  );
  const [isReducing, setIsReducing] = useState(false);
  const [kkConsentOpen, setKkConsentOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [attributions, setAttributions] = useState<DatasetAttributionEntry[]>(
    () => attributionsFromStxmExportMetadata(parsedExport),
  );
  const [linkedMolecule, setLinkedMolecule] =
    useState<MoleculeSearchResult | null>(null);
  const [sampleInfo, setSampleInfo] = useState<StxmSampleInfo>(
    () => parsedExport.sampleInfo ?? defaultStxmSampleInfo(),
  );
  const [peaks, setPeaks] = useState<Peak[]>(() =>
    (parsedExport.peaks ?? []).map((peak, index) => ({
      ...peak,
      id: peak.id ?? `peak-${index}-${peak.energy}`,
    })),
  );

  const linkedMoleculeQuery = trpc.molecules.getById.useQuery(
    { id: linkedMoleculeSeed.linkedMoleculeId ?? "" },
    {
      enabled:
        Boolean(linkedMoleculeSeed.linkedMoleculeId) &&
        linkedMolecule?.id !== linkedMoleculeSeed.linkedMoleculeId,
    },
  );

  useEffect(() => {
    const nextId = linkedMoleculeSeed.linkedMoleculeId;
    if (!nextId) {
      setLinkedMolecule(null);
      return;
    }
    const row = linkedMoleculeQuery.data;
    if (row && row.id === nextId) {
      setLinkedMolecule((current) => {
        if (current?.id === nextId) {
          return current;
        }
        return {
          id: row.id,
          iupacName: row.iupacName,
          commonName: row.name,
          synonyms: row.commonName ?? [],
          inchi: row.InChI,
          smiles: row.SMILES,
          chemicalFormula: row.chemicalFormula,
          casNumber: row.casNumber ?? null,
          pubChemCid: row.pubChemCid ?? null,
          imageUrl: row.imageUrl,
        };
      });
      return;
    }
    if (linkedMoleculeSeed.linkedMoleculeLabel) {
      setLinkedMolecule((current) => {
        if (current?.id === nextId) {
          return current;
        }
        return {
          id: nextId,
          iupacName: linkedMoleculeSeed.linkedMoleculeLabel ?? "",
          commonName: linkedMoleculeSeed.linkedMoleculeLabel ?? "",
          synonyms: [],
          inchi: "",
          smiles: "",
          chemicalFormula: linkedMoleculeSeed.linkedMoleculeFormula ?? "",
          casNumber: null,
          pubChemCid: null,
          imageUrl: undefined,
        };
      });
    }
  }, [
    linkedMoleculeQuery.data,
    linkedMoleculeSeed.linkedMoleculeFormula,
    linkedMoleculeSeed.linkedMoleculeId,
    linkedMoleculeSeed.linkedMoleculeLabel,
    scanId,
  ]);

  const linkedFormula = linkedMolecule?.chemicalFormula?.trim() ?? null;
  const resolvedFormula = linkedFormula;
  const pendingRecomputeRef = useRef(false);
  const debouncePersistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRawRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncePipelineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const regionHydrationRef = useRef<StxmRegionHydrationState>(null);
  const normalizationHydrationRef = useRef<StxmNormalizationHydrationState>(null);
  const pipelineGenerationRef = useRef(0);
  const pipelineInflightRef = useRef(0);
  const regionSpectraGenerationRef = useRef(0);
  const [regionSpectraEpoch, setRegionSpectraEpoch] = useState(0);
  const [pipelineEpoch, setPipelineEpoch] = useState(0);
  const activeScanIdRef = useRef(scanId);
  const sessionReadyRef = useRef(sessionReady);
  sessionReadyRef.current = sessionReady;
  const regionPersistEnabledRef = useRef(false);
  const buildRegionsPersistPayloadRef = useRef<
    ((targetScanId: string) => DashboardRegionsStepMetadata | null) | null
  >(null);
  const resultRef = useRef(result);
  resultRef.current = result;
  const regionSpectraRef = useRef(regionSpectra);
  regionSpectraRef.current = regionSpectra;
  const previewMetadataRef = useRef(previewMetadata);
  previewMetadataRef.current = previewMetadata;
  const linkedMoleculeRef = useRef(linkedMolecule);
  linkedMoleculeRef.current = linkedMolecule;
  const standardOverlaysRef = useRef(standardOverlays);
  standardOverlaysRef.current = standardOverlays;

  const buildRegionsPersistPayload = useCallback(
    (targetScanId: string = scanId): DashboardRegionsStepMetadata | null => {
      const moleculeLabel =
        linkedMolecule?.commonName?.trim() ??
        linkedMolecule?.iupacName?.trim() ??
        undefined;
      const linkedMoleculeFields = linkedMolecule
        ? {
            id: linkedMolecule.id,
            label: moleculeLabel,
            formula: linkedMolecule.chemicalFormula?.trim() || undefined,
          }
        : null;
      if (!izero || regions.length === 0) {
        if (
          !linkedMoleculeFields &&
          !scanRegionsMetadata?.linkedMoleculeId
        ) {
          return null;
        }
        return mergeLinkedMoleculeIntoRegionsMetadata(
          targetScanId,
          scanRegionsMetadata,
          weightingMode,
          linkedMoleculeFields,
        );
      }
      return mergeLinkedMoleculeIntoRegionsMetadata(
        targetScanId,
        {
          bounds: multiRegionToLegacyBounds(regions, izero, pureRegionId),
          sampleRegions: regions,
          izeroBounds: izero,
          pureRegionId: pureRegionId ?? undefined,
          plotScaleMode,
          rawSignalTransform,
          weightingMode,
          formula: linkedFormula ?? undefined,
          thicknessCm: Number.parseFloat(thicknessCm) || undefined,
          normalization: normalization ?? undefined,
          regionEditorTrayOpen,
          intensityGlitches:
            intensityGlitches.length > 0 ? intensityGlitches : undefined,
        },
        weightingMode,
        linkedMoleculeFields,
      );
    },
    [
      intensityGlitches,
      izero,
      linkedFormula,
      linkedMolecule?.chemicalFormula,
      linkedMolecule?.commonName,
      linkedMolecule?.iupacName,
      linkedMolecule?.id,
      normalization,
      plotScaleMode,
      pureRegionId,
      rawSignalTransform,
      regionEditorTrayOpen,
      regions,
      scanId,
      scanRegionsMetadata,
      thicknessCm,
      weightingMode,
    ],
  );

  buildRegionsPersistPayloadRef.current = buildRegionsPersistPayload;

  const flushOutgoingScanState = useCallback(
    (outgoingScanId: string) => {
      if (debouncePersistRef.current) {
        clearTimeout(debouncePersistRef.current);
        debouncePersistRef.current = null;
      }
      if (debounceRawRef.current) {
        clearTimeout(debounceRawRef.current);
        debounceRawRef.current = null;
      }
      if (debouncePipelineRef.current) {
        clearTimeout(debouncePipelineRef.current);
        debouncePipelineRef.current = null;
      }
      if (!regionPersistEnabledRef.current || !sessionReadyRef.current) {
        return;
      }
      const regionsPayload = buildRegionsPersistPayloadRef.current?.(
        outgoingScanId,
      );
      if (regionsPayload) {
        void onPersistRegions(regionsPayload);
      }
      const outgoingResult = resultRef.current;
      const outgoingRegionSpectra = regionSpectraRef.current;
      const molecule = linkedMoleculeRef.current;
      const previewUpdate = buildStxmPreviewCacheUpdate({
        scanId: outgoingScanId,
        scanLabel,
        edgeLabel: inferStxmEdgeFromEnergyRange(energyMinEv, energyMaxEv)?.label,
        hdrFileName: hdrFile.name,
        ximFileName: ximFile.name,
        moleculeId: molecule?.id,
        moleculeName:
          molecule?.commonName?.trim() ??
          molecule?.iupacName?.trim() ??
          undefined,
        previewMetadata: previewMetadataRef.current,
        ingestionResult: outgoingResult,
        regionSpectra: outgoingRegionSpectra,
        standardOverlays: standardOverlaysRef.current,
        hdrText: loaded?.header.raw,
      });
      if (previewUpdate) {
        previewMetadataRef.current = previewUpdate;
        void onPersistPreview(previewUpdate);
      }
      if (outgoingResult) {
        void onPersistIngestion(
          ingestionResultToPersisted(outgoingResult, outgoingScanId),
        );
      }
      void onFlushSession();
    },
    [
      energyMaxEv,
      energyMinEv,
      hdrFile.name,
      loaded?.header.raw,
      onFlushSession,
      onPersistIngestion,
      onPersistPreview,
      onPersistRegions,
      scanLabel,
      ximFile.name,
    ],
  );

  const inferredEdge = useMemo(
    () => inferStxmEdgeFromEnergyRange(energyMinEv, energyMaxEv),
    [energyMaxEv, energyMinEv],
  );

  useEffect(() => {
    const outgoingScanId = scanId;
    activeScanIdRef.current = scanId;
    regionHydrationRef.current = null;
    normalizationHydrationRef.current = null;
    regionPersistEnabledRef.current = false;
    pipelineGenerationRef.current += 1;
    setRegionSpectraEpoch(0);
    setPipelineEpoch(0);
    regionSpectraGenerationRef.current = 0;
    setIsReducing(false);
    pipelineInflightRef.current = 0;
    const cachedRegionSpectra =
      previewMetadataRef.current?.regionSpectraCache?.[outgoingScanId];
    if (cachedRegionSpectra?.length) {
      const restored = previewRegionSpectraToSeries(cachedRegionSpectra);
      setRegionSpectra(restored);
      setRegionSpectraEpoch((epoch) => epoch + 1);
    } else {
      setRegionSpectra([]);
    }
    return () => {
      flushOutgoingScanState(outgoingScanId);
    };
  }, [flushOutgoingScanState, scanId]);

  useEffect(() => {
    setResult(
      scanIngestionMetadata ? persistedToRuntime(scanIngestionMetadata) : null,
    );
  }, [scanIngestionMetadata]);

  useEffect(() => {
    setPlotScaleMode(scanRegionsMetadata?.plotScaleMode ?? "log");
    setRawSignalTransform(
      migrateStxmRawSignalTransformMode(
        scanRegionsMetadata?.rawSignalTransform ?? scanRegionsMetadata?.i0PlotScale,
      ),
    );
    setRegionEditorTrayOpen(scanRegionsMetadata?.regionEditorTrayOpen ?? true);
    setThicknessCm(String(scanRegionsMetadata?.thicknessCm ?? 1e-4));
  }, [scanId, scanRegionsMetadata]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setLoaded(null);
    void parseLocalStxmPair(hdrFile, ximFile)
      .then((parseResult) => {
        if (cancelled || activeScanIdRef.current !== scanId) {
          return;
        }
        setLoaded(parseResult);
      })
      .catch((error) => {
        if (!cancelled && activeScanIdRef.current === scanId) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load scan",
          );
        }
      })
      .finally(() => {
        if (!cancelled && activeScanIdRef.current === scanId) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hdrFile, scanId, ximFile]);

  const hasSessionRegionBounds = stxmSessionHasRegionBounds(scanRegionsMetadata);
  const hasSessionNormalization = stxmSessionHasNormalization(scanRegionsMetadata);

  useEffect(() => {
    if (!loaded || activeScanIdRef.current !== scanId) {
      return;
    }
    const shouldHydrateRegions = shouldHydrateRegionsFromSession({
      scanId,
      hydration: regionHydrationRef.current,
      isInteracting: isDraggingRef.current,
      sessionReady,
      hasSessionBounds: hasSessionRegionBounds,
    });
    const shouldHydrateNormalization = shouldHydrateNormalizationFromSession({
      scanId,
      hydration: normalizationHydrationRef.current,
      isInteracting: isDraggingRef.current,
      sessionReady,
      hasSessionNormalization,
    });
    if (!shouldHydrateRegions && !shouldHydrateNormalization) {
      return;
    }
    regionPersistEnabledRef.current = false;
    if (shouldHydrateRegions) {
      const initial = initialMultiRegion(
        scanRegionsMetadata,
        loaded.oriented.spatial,
        loaded.oriented.image,
      );
      setRegions(initial.regions);
      setIzero(initial.izero);
      setPureRegionId(initial.pureRegionId);
      setIntensityGlitches(scanRegionsMetadata?.intensityGlitches ?? []);
      regionHydrationRef.current = stxmRegionHydrationAfterApply(
        scanId,
        hasSessionRegionBounds,
        sessionReady,
      );
    }
    if (shouldHydrateNormalization) {
      if (!scanRegionsMetadata?.normalization) {
        setNormalization(suggestNormalizationWindows(loaded.oriented.energyEv));
      } else {
        setNormalization(scanRegionsMetadata.normalization ?? null);
      }
      normalizationHydrationRef.current = stxmNormalizationHydrationAfterApply(
        scanId,
        hasSessionNormalization,
        sessionReady,
      );
    }
    queueMicrotask(() => {
      if (activeScanIdRef.current === scanId && sessionReady) {
        regionPersistEnabledRef.current = true;
      }
    });
  }, [
    hasSessionNormalization,
    hasSessionRegionBounds,
    loaded,
    scanId,
    scanRegionsMetadata,
    sessionReady,
  ]);

  const imageMatrix = useMemo(
    () => (loaded ? float64ImageToMatrix(loaded.oriented.image) : []),
    [loaded],
  );

  const qaxisPoints = useMemo(
    () => (loaded ? Array.from(loaded.oriented.spatial) : []),
    [loaded],
  );

  const isTeyExperiment = useMemo(
    () =>
      loaded
        ? inferStxmTeyExperiment(loaded.header.raw, hdrFile.name)
        : false,
    [hdrFile.name, loaded],
  );

  const hasIeData = useMemo(
    () =>
      Boolean(
        result?.iTe?.length === (result?.energyEv.length ?? 0),
      ),
    [result],
  );

  const flushPersistRegions = useCallback(() => {
    if (isDraggingRef.current) {
      return;
    }
    if (!regionPersistEnabledRef.current) {
      return;
    }
    if (!sessionReady) {
      return;
    }
    if (debouncePersistRef.current) {
      clearTimeout(debouncePersistRef.current);
      debouncePersistRef.current = null;
    }
    const payload = buildRegionsPersistPayloadRef.current?.(scanId);
    if (payload) {
      void onPersistRegions(payload);
    }
  }, [onPersistRegions, scanId, sessionReady]);

  const schedulePersistRegions = useCallback(() => {
    if (isDraggingRef.current) {
      return;
    }
    if (!regionPersistEnabledRef.current) {
      return;
    }
    if (!sessionReady) {
      return;
    }
    const payload = buildRegionsPersistPayload();
    if (!payload) {
      return;
    }
    if (debouncePersistRef.current) {
      clearTimeout(debouncePersistRef.current);
    }
    debouncePersistRef.current = setTimeout(() => {
      debouncePersistRef.current = null;
      flushPersistRegions();
    }, 600);
  }, [buildRegionsPersistPayload, flushPersistRegions, sessionReady]);

  const recomputeRawSpectra = useCallback(async (): Promise<
    StxmRegionSpectrumSeries[] | null
  > => {
    if (!loaded || !izero || regions.length === 0) {
      return null;
    }
    const generation = regionSpectraGenerationRef.current + 1;
    regionSpectraGenerationRef.current = generation;
    try {
      const spectra = regionRawSpectraFromScan(
        loaded.oriented.image,
        loaded.oriented.energyEv,
        loaded.oriented.spatial,
        regions,
        izero,
        weightingMode,
      );
      const hdrText = loaded.header.raw;
      const drain = parseTeyDrainSeriesFromHdr(hdrText);
      const energyCount = loaded.oriented.energyEv.length;
      const ieAvailable = stxmIeChannelAvailable(
        hdrText,
        hdrFile.name,
        energyCount,
        drain,
      );
      let enriched: StxmRegionSpectrumSeries[] =
        ieAvailable && drain
          ? spectra.map((series) =>
              series.isIzero
                ? series
                : { ...series, teyDrain: drain, teyDrainErr: [] },
            )
          : spectra;
      if (generation === regionSpectraGenerationRef.current) {
        regionSpectraRef.current = enriched;
        setRegionSpectra(enriched);
        setRegionSpectraEpoch(generation);
      }
      if (normalization) {
        const thickness = Number.parseFloat(thicknessCm);
        try {
          enriched = await enrichRegionSpectraWithReduction(enriched, {
            normalization,
            formula: resolvedFormula,
            thicknessCm:
              Number.isFinite(thickness) && thickness > 0 ? thickness : 1e-4,
            runKkDelta:
              Boolean(resolvedFormula) &&
              (readStxmComputeConsentGranted() || readKkBrowserConsentGranted()),
          });
        } catch {
        }
      }
      if (generation !== regionSpectraGenerationRef.current) {
        return null;
      }
      regionSpectraRef.current = enriched;
      setRegionSpectra(enriched);
      setRegionSpectraEpoch(generation);
      return enriched;
    } catch {
      if (generation !== regionSpectraGenerationRef.current) {
        return null;
      }
      return null;
    }
  }, [
    hdrFile.name,
    izero,
    loaded,
    normalization,
    regions,
    resolvedFormula,
    thicknessCm,
    weightingMode,
  ]);

  useEffect(() => {
    if (!loaded || !izero) {
      return;
    }
    if (debounceRawRef.current) {
      clearTimeout(debounceRawRef.current);
    }
    const rawDelay = isDraggingRef.current
      ? DRAG_PREVIEW_THROTTLE_MS
      : RAW_SPECTRA_DEBOUNCE_MS;
    debounceRawRef.current = setTimeout(() => {
      void recomputeRawSpectra();
      if (!isDraggingRef.current) {
        schedulePersistRegions();
      }
    }, rawDelay);
    return () => {
      if (debounceRawRef.current) {
        clearTimeout(debounceRawRef.current);
      }
    };
  }, [izero, loaded, normalization, recomputeRawSpectra, regions, resolvedFormula, schedulePersistRegions, thicknessCm, weightingMode]);

  useEffect(() => {
    schedulePersistRegions();
  }, [linkedMolecule, normalization, regionEditorTrayOpen, schedulePersistRegions]);

  const schedulePersistPreviewMolecule = useCallback(() => {
    if (!sessionReady || !linkedMolecule || !previewMetadata?.spectra.length) {
      return;
    }
    const existing = previewMetadata.spectra.find((row) => row.scanId === scanId);
    if (!existing || existing.moleculeId === linkedMolecule.id) {
      return;
    }
    const moleculeName =
      linkedMolecule.commonName?.trim() ||
      linkedMolecule.iupacName?.trim() ||
      undefined;
    void onPersistPreview({
      ...previewMetadata,
      spectra: previewMetadata.spectra.map((row) =>
        row.scanId === scanId
          ? {
              ...row,
              moleculeId: linkedMolecule.id,
              moleculeName,
            }
          : row,
      ),
    });
  }, [linkedMolecule, onPersistPreview, previewMetadata, scanId, sessionReady]);

  useEffect(() => {
    const timer = setTimeout(() => {
      schedulePersistPreviewMolecule();
    }, 600);
    return () => clearTimeout(timer);
  }, [schedulePersistPreviewMolecule]);

  const runPipeline = useCallback(async (options?: RunPipelineOptions) => {
    const previewOnly = options?.previewOnly ?? false;
    if (!loaded || !izero || regions.length === 0 || !normalization) {
      return;
    }
    if (!previewOnly) {
      pipelineInflightRef.current += 1;
      setIsReducing(true);
    }
    const generation = pipelineGenerationRef.current + 1;
    pipelineGenerationRef.current = generation;
    const kkConsentGranted =
      readStxmComputeConsentGranted() || readKkBrowserConsentGranted();
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
        formula: resolvedFormula,
        thicknessCm: Number.isFinite(thickness) && thickness > 0 ? thickness : 1e-4,
        runKkDelta:
          Boolean(resolvedFormula) && (!previewOnly || kkConsentGranted),
        hdrText: loaded.header.raw,
        hdrFileName: hdrFile.name,
      });
      if (generation !== pipelineGenerationRef.current) {
        return;
      }
      const enrichedSpectra = await recomputeRawSpectra();
      if (generation !== pipelineGenerationRef.current) {
        return;
      }
      resultRef.current = pipelineResult;
      setResult(pipelineResult);
      setPipelineEpoch(generation);
      const glitches = detectStxmIntensityGlitches(
        pipelineResult.i0,
        pipelineResult.iSample,
        pipelineResult.energyEv,
      ).map(
        (glitch): StxmIntensityGlitchRecord => ({
          energyIndex: glitch.energyIndex,
          energyEv: glitch.energyEv,
          reason: glitch.reason,
          i0: glitch.i0,
          it: glitch.it,
        }),
      );
      setIntensityGlitches(glitches);
      if (previewOnly) {
        return;
      }
      if (!sessionReadyRef.current) {
        return;
      }
      const persisted = ingestionResultToPersisted(pipelineResult, scanId);
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
      void (async () => {
        try {
          await onPersistIngestion(persisted);
          if (generation !== pipelineGenerationRef.current) {
            return;
          }
          await onPersistReduce({
            scanId,
            spectra: [regionSpectrumToRecord(spectrum)],
            computedAt: new Date().toISOString(),
            method: "two_region",
          });
          const previewUpdate = buildStxmPreviewCacheUpdate({
            scanId,
            scanLabel,
            edgeLabel: inferredEdge?.label,
            hdrFileName: hdrFile.name,
            ximFileName: ximFile.name,
            moleculeId: linkedMolecule?.id,
            moleculeName:
              linkedMolecule?.commonName?.trim() ||
              linkedMolecule?.iupacName?.trim() ||
              undefined,
            previewMetadata: previewMetadataRef.current,
            ingestionResult: pipelineResult,
            regionSpectra: enrichedSpectra ?? regionSpectra,
            standardOverlays,
            hdrText: loaded.header.raw,
          });
          if (previewUpdate) {
            previewMetadataRef.current = previewUpdate;
            await onPersistPreview(previewUpdate);
          }
        } catch (persistError) {
          if (generation !== pipelineGenerationRef.current) {
            return;
          }
          showToast(
            persistError instanceof Error
              ? persistError.message
              : "Failed to save spectra",
            "error",
          );
        }
      })();
    } catch (error) {
      if (generation !== pipelineGenerationRef.current) {
        return;
      }
      if (error instanceof Error && error.message === "KK_CONSENT_REQUIRED") {
        if (previewOnly) {
          return;
        }
        if (kkConsentGranted) {
          showToast(
            "KK calculation blocked despite session consent; reload and try again.",
            "error",
          );
          return;
        }
        pendingRecomputeRef.current = true;
        setKkConsentOpen(true);
        return;
      }
      if (!previewOnly) {
        showToast(
          error instanceof Error ? error.message : "Reduction failed",
          "error",
        );
      }
    } finally {
      if (!previewOnly) {
        pipelineInflightRef.current -= 1;
        if (pipelineInflightRef.current <= 0) {
          pipelineInflightRef.current = 0;
          setIsReducing(false);
        }
      }
    }
  }, [
    izero,
    loaded,
    normalization,
    hdrFile.name,
    inferredEdge?.label,
    linkedMolecule?.commonName,
    linkedMolecule?.iupacName,
    linkedMolecule?.id,
    onPersistIngestion,
    onPersistPreview,
    onPersistReduce,
    pureRegionId,
    recomputeRawSpectra,
    regionSpectra,
    scanId,
    scanLabel,
    standardOverlays,
    ximFile.name,
    regions,
    resolvedFormula,
    thicknessCm,
    weightingMode,
  ]);

  const schedulePersistExport = useCallback(() => {
    if (!sessionReady) {
      return;
    }
    const peakRows: StxmPeak[] = peaks.map((peak, index) => ({
      id: peak.id ?? `peak-${index}-${peak.energy}`,
      energy: peak.energy,
      peakKind: peak.peakKind ?? null,
    }));
    void onPersistExport(
      buildStxmExportStepMetadata({
        attributions,
        linkedMolecule,
        sampleInfo,
        peaks: peakRows,
      }),
    );
  }, [
    attributions,
    linkedMolecule,
    onPersistExport,
    peaks,
    sampleInfo,
    sessionReady,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      schedulePersistExport();
    }, 600);
    return () => clearTimeout(timer);
  }, [schedulePersistExport]);

  const handleAttributionsChange = useCallback(
    (rows: DatasetAttributionChange) => {
      setAttributions((current) =>
        typeof rows === "function" ? rows(current) : rows,
      );
    },
    [],
  );

  const schedulePipeline = useCallback(() => {
    if (!loaded || !izero || regions.length === 0 || !normalization) {
      return;
    }
    const previewOnly = isDraggingRef.current;
    const delay = previewOnly ? DRAG_PREVIEW_THROTTLE_MS : PIPELINE_DEBOUNCE_MS;
    if (debouncePipelineRef.current) {
      clearTimeout(debouncePipelineRef.current);
    }
    debouncePipelineRef.current = setTimeout(() => {
      debouncePipelineRef.current = null;
      void runPipeline({ previewOnly });
    }, delay);
  }, [izero, loaded, normalization, regions.length, runPipeline]);

  useEffect(() => {
    schedulePipeline();
    return () => {
      if (debouncePipelineRef.current) {
        clearTimeout(debouncePipelineRef.current);
      }
    };
  }, [
    izero,
    loaded,
    normalization,
    pureRegionId,
    regions,
    resolvedFormula,
    schedulePipeline,
    thicknessCm,
    weightingMode,
  ]);

  const handleRegionDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleRegionDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (debounceRawRef.current) {
      clearTimeout(debounceRawRef.current);
      debounceRawRef.current = null;
    }
    if (debouncePipelineRef.current) {
      clearTimeout(debouncePipelineRef.current);
      debouncePipelineRef.current = null;
    }
    void recomputeRawSpectra();
    flushPersistRegions();
    void runPipeline();
  }, [flushPersistRegions, recomputeRawSpectra, runPipeline]);

  const handleNormalizationInteractionChange = useCallback(
    (active: boolean) => {
      if (active) {
        isDraggingRef.current = true;
        return;
      }
      handleRegionDragEnd();
    },
    [handleRegionDragEnd],
  );

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

  const handleKeepInCache = useCallback(async () => {
    if (!sessionReady) {
      return;
    }
    const regionsPayload = buildRegionsPersistPayload();
    if (regionsPayload) {
      await onPersistRegions(regionsPayload);
    }
    let spectraForCache = regionSpectra;
    if (spectraForCache.length === 0) {
      const computed = await recomputeRawSpectra();
      if (computed && computed.length > 0) {
        spectraForCache = computed;
      }
    }
    const previewUpdate = buildStxmPreviewCacheUpdate({
      scanId,
      scanLabel,
      edgeLabel: inferredEdge?.label,
      hdrFileName: hdrFile.name,
      ximFileName: ximFile.name,
      moleculeId: linkedMolecule?.id,
      moleculeName:
        linkedMolecule?.commonName?.trim() ||
        linkedMolecule?.iupacName?.trim() ||
        undefined,
      previewMetadata: previewMetadataRef.current,
      ingestionResult: result,
      regionSpectra: spectraForCache,
      standardOverlays,
      hdrText: loaded?.header.raw,
    });
    if (!previewUpdate) {
      showToast("Reduce spectra before keeping in preview cache.", "error");
      return;
    }
    if (result) {
      await onPersistIngestion(
        ingestionResultToPersisted(result, scanId),
      );
    }
    previewMetadataRef.current = previewUpdate;
    await onPersistPreview(previewUpdate);
    showToast("Scan kept in preview cache", "success");
  }, [
    buildRegionsPersistPayload,
    hdrFile.name,
    inferredEdge?.label,
    linkedMolecule?.commonName,
    linkedMolecule?.iupacName,
    linkedMolecule?.id,
    onPersistIngestion,
    onPersistPreview,
    onPersistRegions,
    recomputeRawSpectra,
    regionSpectra,
    result,
    scanId,
    scanLabel,
    sessionReady,
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

  const pureRegionLabel = useMemo(() => {
    const pure =
      regions.find(
        (region) => region.id === pureRegionId || region.role === "pure",
      ) ?? regions[0];
    return pure?.spotLabel?.trim() ?? "sample";
  }, [pureRegionId, regions]);

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
    <div className="flex min-h-0 flex-col gap-6">
      {!readStxmComputeConsentGranted() ? (
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
      ) : null}

      <StxmUploadDialog
        isOpen={uploadOpen}
        scanLabel={scanLabel}
        onClose={() => setUploadOpen(false)}
        onKeepInCache={() => void handleKeepInCache()}
      />

      <LineScanBrowserStrip
        entries={catalogEntries}
        selectedRelativePath={selectedScanRelativePath}
        loading={catalogLoading}
        enriching={catalogEnriching}
        scanPhase={catalogScanPhase}
        isSelectingScan={isSelectingScan}
        selectingRelativePath={selectingScanRelativePath}
        onSelect={onSelectCatalogScan}
      />

      {sessionReady ? (
        <StxmMoleculeField
          linkedMolecule={linkedMolecule}
          onLinkedMoleculeChange={setLinkedMolecule}
        />
      ) : null}

      <StxmIngestionPlotPanel
        result={result}
        regionSpectra={regionSpectra}
        channel={displayChannel}
        onChannelChange={setDisplayChannel}
        rawSignalTransform={rawSignalTransform}
        onRawSignalTransformChange={setRawSignalTransform}
        isTeyExperiment={isTeyExperiment}
        hasIeData={hasIeData}
        normalization={normalization}
        onNormalizationChange={setNormalization}
        standards={plotStandards}
        chemicalFormula={resolvedFormula}
        hasLinkedMolecule={linkedMolecule != null}
        formulaLoading={linkedMoleculeQuery.isLoading}
        showRegionOverlays
        peaks={peaks}
        onPeaksChange={setPeaks}
        height={STXM_INGESTION_SPECTRUM_HEIGHT_PX}
        isComputing={isReducing}
        pureRegionLabel={pureRegionLabel}
        regionSpectraEpoch={regionSpectraEpoch}
        pipelineEpoch={pipelineEpoch}
        plotScopeKey={scanId}
        imageMatrix={imageMatrix}
        qaxisPoints={qaxisPoints}
        regions={regions}
        izero={izero}
        imageScaleMode={plotScaleMode}
        onRegionsChange={setRegions}
        onRegionChange={handleRegionChange}
        onIzeroChange={setIzero}
        onRegionDragStart={handleRegionDragStart}
        onRegionDragEnd={handleRegionDragEnd}
        onNormalizationInteractionChange={handleNormalizationInteractionChange}
        onAutoSuggestRegions={handleAutoSuggest}
        regionTrayOpen={regionEditorTrayOpen}
        onRegionTrayOpenChange={setRegionEditorTrayOpen}
      />

      {sessionReady ? (
        <StxmIngestionSampleSection
          sampleInfo={sampleInfo}
          onSampleInfoChange={setSampleInfo}
          thicknessCm={thicknessCm}
          onThicknessCmChange={setThicknessCm}
        />
      ) : null}

      {sessionReady ? (
        <StxmIngestionAttributionSection
          attributions={attributions}
          onAttributionsChange={handleAttributionsChange}
        />
      ) : null}

      <StxmStandardsPicker
        edgeLabel={inferredEdge?.label ?? null}
        overlays={standardOverlays}
        onOverlaysChange={setStandardOverlays}
        onPlotStandardsChange={setPlotStandards}
      />

      {reduceMetadata?.spectra.length ? (
        <p className="text-muted text-xs">
          Last reduce: {reduceMetadata.computedAt.slice(0, 19).replace("T", " ")}
          {result?.kkEngineLabel && readKkBrowserConsentGranted()
            ? ` | KK: ${result.kkEngineLabel}`
            : null}
        </p>
      ) : null}

      {sessionReady ? (
        <section className="border-border flex flex-col gap-3 border-t pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">
                Upload reduced spectrum
              </p>
              <p className="text-muted text-xs">
                Keep in session cache or continue to Atlas contribute with
                molecule, instrument, and attribution.
              </p>
            </div>
            <Button
              variant="primary"
              onPress={() => setUploadOpen(true)}
              isDisabled={!linkedMolecule || isReducing}
            >
              Upload to Atlas
            </Button>
          </div>
          {!linkedMolecule ? (
            <ErrorMessage className="text-danger text-xs">
              Link a molecule before uploading to Atlas.
            </ErrorMessage>
          ) : null}
        </section>
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
