"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Chip, Description, Link } from "@heroui/react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import type {
  DifferenceSpectrum,
  SpectrumPoint,
} from "~/components/plots/types";
import { SimpleDialog } from "~/components/ui/dialog";
import type {
  DatasetState,
  ExperimentTypeOption,
} from "~/features/process-nexafs/types";
import { mapDbSpectrumRowsToPoints } from "~/features/process-nexafs/utils/mapDbSpectrumRowsToPoints";
import type { SimilarityContinuePatch } from "~/features/process-nexafs/utils/similarity-continue-patch";
import {
  SimilarityAttributionCell,
  SimilarityBulkResolutionGroup,
  SimilarityColumnHeader,
  SimilarityConflictRow,
  SimilarityMetaGroup,
  SimilarityQualityChecklist,
  SimilarityReadOnlyRow,
  SimilarityReviewFooter,
  SimilarityReviewModeGroup,
  SimilaritySpectrumSection,
  attributionsDisplayLabel,
  attributionsToAvatarUsers,
  bulkActionToResolution,
  type SimilarityBulkAction,
  type SimilarityPlotSource,
  type SimilarityReviewViewMode,
} from "~/features/process-nexafs/ui/similarity-review-shared";
import {
  datasetAttributionsFromContributorDtos,
  dedupeDatasetAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import type { DatasetSimilarityMatch } from "~/lib/nexafs/dataset-similarity";
import { datasetSimilarityPercent } from "~/lib/nexafs/dataset-similarity";
import {
  buildSimilarityComparePlotModel,
  computeMatchedGeometryResiduals,
  filterSimilarityComparePlotModel,
  formatEnergySpanEv,
  formatNrmsePercent,
  medianGeometryNrmse,
  similarityCompareChannelLabel,
  SIMILARITY_WAVEFORM_POOR_NRMSE,
  type SimilarityGeometrySelection,
} from "~/lib/nexafs/dataset-similarity-compare";
import {
  applyBulkMergeResolution,
  applySmartMergeResolution,
  buildSimilarityContinuePatchFromMerges,
  buildSimilarityMergeConflicts,
  countUnresolvedMergeConflicts,
  formatProcessMethodDisplay,
  formatThicknessDisplay,
  resolveSimilarityMergeConflict,
  type SimilarityMergeCompareSides,
  type SimilarityMergeConflictRow,
  type SimilarityMergeFieldId,
  type SimilarityMergeResolution,
} from "~/lib/nexafs/similarity-merge-conflicts";
import {
  buildSimilarityConfirmQualityBundle,
  similarityConfirmQualityAllowsSubmit,
} from "~/lib/nexafs/similarity-confirm-quality";
import {
  edgeLabelFromAtomCore,
  spectrumEnergyExtent,
} from "~/lib/nexafs/edge-energy-bands";
import { moleculeNexafsExperimentHref } from "~/lib/nexafs-experiment-deep-link";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import { trpc } from "~/trpc/client";
import { cn } from "@heroui/styles";

export type { SimilarityContinuePatch } from "~/features/process-nexafs/utils/similarity-continue-patch";

type InstrumentOptionRef = {
  id: string;
  name: string;
  facilityName?: string;
};

type EdgeOptionRef = {
  id: string;
  targetatom: string;
  corestate: string;
};

/** Payload passed when contribute submit needs a similarity confirmation. */
export interface DatasetSimilarityConfirmRequest {
  /** Upload dataset under review. */
  dataset: DatasetState;
  /** Best advisory match above the warn threshold. */
  match: DatasetSimilarityMatch;
  /** Other Atlas matches at or above the warn threshold (same molecule). */
  siblingMatches?: readonly DatasetSimilarityMatch[];
  /** 0-based index of this upload within the submit batch. */
  batchIndex: number;
  /** Total datasets in the submit batch. */
  batchTotal: number;
  /** File names for every dataset in the submit batch. */
  batchFileNames: readonly string[];
  /** Catalog edges for resolving upload edge labels. */
  edgeOptions?: readonly EdgeOptionRef[];
  /** Catalog instruments for resolving upload instrument labels. */
  instrumentOptions?: readonly InstrumentOptionRef[];
}

export interface DatasetSimilarityCompareModalProps {
  /** When non-null, the dialog is open for this comparison. */
  request: DatasetSimilarityConfirmRequest | null;
  /** Keep the existing Atlas experiment (abort submit). */
  onCancel: () => void;
  /**
   * Submit this upload as a new experiment, optionally applying field choices
   * from Existing into the upload draft.
   */
  onContinue: (patch: SimilarityContinuePatch) => void;
}

function experimentTypeShort(value: string | null | undefined): string {
  switch (value) {
    case "TOTAL_ELECTRON_YIELD":
      return "TEY";
    case "PARTIAL_ELECTRON_YIELD":
      return "PEY";
    case "FLUORESCENT_YIELD":
      return "FY";
    case "TRANSMISSION":
      return "TRANS";
    default:
      return value?.trim() || "—";
  }
}

function parseExperimentTypeOption(
  value: string | null | undefined,
): ExperimentTypeOption | "" {
  switch (value) {
    case "TOTAL_ELECTRON_YIELD":
    case "PARTIAL_ELECTRON_YIELD":
    case "FLUORESCENT_YIELD":
    case "TRANSMISSION":
      return value;
    default:
      return "";
  }
}

function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}

function truncateMiddle(value: string, max = 56): string {
  if (value.length <= max) {
    return value;
  }
  const keep = Math.floor((max - 1) / 2);
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

function formatSourcePublications(
  pubs: readonly {
    doi: string;
    title: string;
    journal?: string | null;
    year?: number | null;
  }[],
): ReactNode {
  if (pubs.length === 0) {
    return "—";
  }
  return (
    <ul className="flex list-none flex-col gap-1 p-0">
      {pubs.map((pub) => (
        <li key={pub.doi} className="min-w-0">
          <span className="block truncate font-medium" title={pub.title}>
            {pub.title.trim() || pub.doi}
          </span>
          <span className="text-muted block truncate text-xs">
            {[pub.doi, pub.journal, pub.year != null ? String(pub.year) : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function waveformSummaryLine(args: {
  compareChannelLabel: string;
  medianNrmse: number | null;
  hasSharedChannel: boolean;
}): string {
  if (!args.hasSharedChannel) {
    return "Waveform · cannot compare (no shared channel)";
  }
  if (args.medianNrmse == null) {
    return `Waveform · ${args.compareChannelLabel} · no overlapping angles`;
  }
  const pct = formatNrmsePercent(args.medianNrmse);
  if (args.medianNrmse >= SIMILARITY_WAVEFORM_POOR_NRMSE) {
    return `Waveform · ${args.compareChannelLabel} · poor match (endpoint NRMSE ${pct})`;
  }
  return `Waveform · ${args.compareChannelLabel} · endpoint NRMSE ${pct}`;
}

function preserveResolutions(
  next: SimilarityMergeConflictRow[],
  prev: readonly SimilarityMergeConflictRow[],
): SimilarityMergeConflictRow[] {
  const prevById = new Map(prev.map((row) => [row.id, row]));
  return next.map((row) => {
    if (row.status === "agreed") {
      return row;
    }
    const prior = prevById.get(row.id);
    if (prior?.status === "resolved" && prior.resolution) {
      return {
        ...row,
        status: "resolved",
        resolution: prior.resolution,
      };
    }
    return row;
  });
}

/**
 * Confirmation panel when contribute submit finds a similar Atlas experiment.
 * Merge conflicts, quality checklist, and SpectrumPlot overlay reuse.
 */
export function DatasetSimilarityCompareModal({
  request,
  onCancel,
  onContinue,
}: DatasetSimilarityCompareModalProps) {
  const isOpen = request != null;
  const experimentId = request?.match.experimentId ?? "";
  const moleculeId = request?.dataset.moleculeId ?? "";
  const [geometrySelection, setGeometrySelection] =
    useState<SimilarityGeometrySelection>("all");
  const [plotSource, setPlotSource] = useState<SimilarityPlotSource>("overlay");
  const [reviewMode, setReviewMode] =
    useState<SimilarityReviewViewMode>("conflicts");
  const [bulkAction, setBulkAction] = useState<SimilarityBulkAction | null>(
    null,
  );
  const [mergeRows, setMergeRows] = useState<SimilarityMergeConflictRow[]>([]);
  const [ackedChecks, setAckedChecks] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setGeometrySelection("all");
    setPlotSource("overlay");
    setReviewMode("conflicts");
    setBulkAction(null);
    setMergeRows([]);
    setAckedChecks(new Set());
  }, [request?.match.experimentId, request?.dataset.id]);

  const descriptorsQuery = trpc.experiments.getDescriptors.useQuery(
    { experimentId },
    { enabled: isOpen && experimentId.length > 0 },
  );
  const spectrumQuery = trpc.spectrumpoints.getByExperimentForPlot.useQuery(
    { experimentId, limit: 5000 },
    { enabled: isOpen && experimentId.length > 0 },
  );
  const attributionsQuery = trpc.experiments.listAttributions.useQuery(
    { experimentId },
    { enabled: isOpen && experimentId.length > 0 },
  );
  const moleculeQuery = trpc.molecules.getById.useQuery(
    { id: moleculeId },
    { enabled: isOpen && moleculeId.length > 0 },
  );

  const uploadExtent = useMemo(() => {
    if (!request) {
      return null;
    }
    return spectrumEnergyExtent(request.dataset.spectrumPoints);
  }, [request]);

  const uploadEdgeLabel = useMemo(() => {
    if (!request?.dataset.edgeId) {
      return "—";
    }
    const edge = request.edgeOptions?.find(
      (row) => row.id === request.dataset.edgeId,
    );
    if (!edge) {
      return "—";
    }
    return edgeLabelFromAtomCore(edge.targetatom, edge.corestate) || "—";
  }, [request]);

  const uploadInstrumentLabel = useMemo(() => {
    if (!request?.dataset.instrumentId) {
      return "—";
    }
    const instrument = request.instrumentOptions?.find(
      (row) => row.id === request.dataset.instrumentId,
    );
    if (!instrument) {
      return "—";
    }
    return instrument.facilityName
      ? `${instrument.name} (${instrument.facilityName})`
      : instrument.name;
  }, [request]);

  const existingPoints = useMemo((): SpectrumPoint[] => {
    if (!spectrumQuery.data) {
      return [];
    }
    return mapDbSpectrumRowsToPoints(spectrumQuery.data);
  }, [spectrumQuery.data]);

  const plotModel = useMemo(() => {
    if (!request) {
      return null;
    }
    return buildSimilarityComparePlotModel(
      request.dataset.spectrumPoints,
      existingPoints,
    );
  }, [existingPoints, request]);

  const residualSummaries = useMemo(() => {
    if (!request || existingPoints.length === 0) {
      return [];
    }
    return computeMatchedGeometryResiduals(
      request.dataset.spectrumPoints,
      existingPoints,
    );
  }, [existingPoints, request]);

  const residualByKey = useMemo(() => {
    return new Map(residualSummaries.map((row) => [row.key, row]));
  }, [residualSummaries]);

  const filteredPlotModel = useMemo(() => {
    if (!plotModel) {
      return null;
    }
    return filterSimilarityComparePlotModel(plotModel, geometrySelection);
  }, [geometrySelection, plotModel]);

  const activeResidual =
    geometrySelection === "all" || plotSource !== "overlay"
      ? null
      : (residualByKey.get(geometrySelection) ?? null);

  const medianNrmse = useMemo(
    () => medianGeometryNrmse(residualSummaries),
    [residualSummaries],
  );

  const uploadAvatars = useMemo(() => {
    if (!request) {
      return [];
    }
    return attributionsToAvatarUsers(request.dataset.attributions);
  }, [request]);

  const existingAttributionRows = useMemo(() => {
    if (!attributionsQuery.data) {
      return [] as DatasetAttributionEntry[];
    }
    return datasetAttributionsFromContributorDtos(attributionsQuery.data);
  }, [attributionsQuery.data]);

  const existingAvatars = useMemo(
    () => attributionsToAvatarUsers(existingAttributionRows),
    [existingAttributionRows],
  );

  const moleculeName =
    moleculeQuery.data?.name?.trim() ||
    moleculeQuery.data?.commonName?.find((name) => name.trim().length > 0) ||
    moleculeQuery.data?.iupacName?.trim() ||
    descriptorsQuery.data?.molecule.iupacName?.trim() ||
    "—";
  const moleculeSlug = moleculeQuery.data
    ? canonicalMoleculeSlugFromView(moleculeQuery.data)
    : "";

  const existingHref =
    moleculeSlug.length > 0 && experimentId.length > 0
      ? moleculeNexafsExperimentHref(moleculeSlug, experimentId)
      : moleculeId.length > 0 && experimentId.length > 0
        ? moleculeNexafsExperimentHref(moleculeId, experimentId)
        : null;

  const energySpanPercent = request
    ? datasetSimilarityPercent(request.match.score)
    : 0;
  const shortId = experimentId.slice(0, 8);
  const existingEdgeLabel = descriptorsQuery.data
    ? edgeLabelFromAtomCore(
        descriptorsQuery.data.edge.targetatom,
        descriptorsQuery.data.edge.corestate,
      ) || "—"
    : "…";
  const existingInstrumentLabel = descriptorsQuery.data
    ? descriptorsQuery.data.instrument.facilityName
      ? `${descriptorsQuery.data.instrument.name} (${descriptorsQuery.data.instrument.facilityName})`
      : descriptorsQuery.data.instrument.name
    : "…";
  const existingTypeShort =
    descriptorsQuery.data?.experimentKind?.token?.toUpperCase() ??
    experimentTypeShort(descriptorsQuery.data?.experimentType);
  const existingEnergySpan =
    descriptorsQuery.data?.spectrumEnergyMin != null &&
    descriptorsQuery.data?.spectrumEnergyMax != null
      ? formatEnergySpanEv(
          descriptorsQuery.data.spectrumEnergyMin,
          descriptorsQuery.data.spectrumEnergyMax,
        )
      : request
        ? formatEnergySpanEv(request.match.minEv, request.match.maxEv)
        : "—";

  const uploadEnergyLabel = uploadExtent
    ? formatEnergySpanEv(uploadExtent.minEv, uploadExtent.maxEv)
    : "—";
  const uploadTypeShort = experimentTypeShort(request?.dataset.experimentType);

  const mergeSides = useMemo((): SimilarityMergeCompareSides | null => {
    if (!request || !descriptorsQuery.data) {
      return null;
    }
    const sample = descriptorsQuery.data.sample;
    const info = request.dataset.sampleInfo;
    return {
      edge: {
        upload: uploadEdgeLabel,
        existing: existingEdgeLabel,
        uploadId: request.dataset.edgeId,
        existingId: descriptorsQuery.data.edgeId,
      },
      instrument: {
        upload: uploadInstrumentLabel,
        existing: existingInstrumentLabel,
        uploadId: request.dataset.instrumentId,
        existingId: descriptorsQuery.data.instrumentId,
      },
      type: {
        upload: uploadTypeShort,
        existing: existingTypeShort,
        uploadValue: request.dataset.experimentType,
        existingValue: parseExperimentTypeOption(
          descriptorsQuery.data.experimentType,
        ),
      },
      researchers: {
        upload: request.dataset.attributions,
        existing: existingAttributionRows,
        uploadDisplay: attributionsDisplayLabel(request.dataset.attributions),
        existingDisplay: attributionsDisplayLabel(existingAttributionRows),
      },
      substrate: {
        upload: info.substrate,
        existing: sample.substrate ?? "",
      },
      processMethod: {
        upload: info.processMethod,
        existing: sample.processMethod,
        uploadDisplay: formatProcessMethodDisplay(info.processMethod),
        existingDisplay: formatProcessMethodDisplay(sample.processMethod),
      },
      thickness: {
        upload: info.thickness,
        existing: sample.thickness,
        uploadDisplay: formatThicknessDisplay(info.thickness),
        existingDisplay: formatThicknessDisplay(sample.thickness),
      },
      solvent: {
        upload: info.solvent,
        existing: sample.solvent ?? "",
      },
      patterningLayer: {
        upload: info.patterningLayer,
        existing: sample.patterningLayer ?? "",
      },
    };
  }, [
    descriptorsQuery.data,
    existingAttributionRows,
    existingEdgeLabel,
    existingInstrumentLabel,
    existingTypeShort,
    request,
    uploadEdgeLabel,
    uploadInstrumentLabel,
    uploadTypeShort,
  ]);

  useEffect(() => {
    if (!mergeSides) {
      return;
    }
    const built = buildSimilarityMergeConflicts(mergeSides);
    setMergeRows((prev) => preserveResolutions(built, prev));
  }, [mergeSides]);

  const attributionsForSubmit = useMemo(() => {
    if (!request || !mergeSides) {
      return request?.dataset.attributions ?? [];
    }
    const researchers = mergeRows.find((row) => row.id === "researchers");
    if (researchers?.status === "resolved") {
      if (researchers.resolution === "existing") {
        return dedupeDatasetAttributions([...mergeSides.researchers.existing]);
      }
      if (researchers.resolution === "both") {
        return dedupeDatasetAttributions([
          ...mergeSides.researchers.upload,
          ...mergeSides.researchers.existing,
        ]);
      }
    }
    return request.dataset.attributions;
  }, [mergeRows, mergeSides, request]);

  const resolvedEdgeLabel = useMemo(() => {
    const edgeRow = mergeRows.find((row) => row.id === "edge");
    if (edgeRow?.status === "resolved" && edgeRow.resolution === "existing") {
      return existingEdgeLabel;
    }
    return uploadEdgeLabel === "—" ? "" : uploadEdgeLabel;
  }, [existingEdgeLabel, mergeRows, uploadEdgeLabel]);

  const qualityBundle = useMemo(() => {
    if (!request) {
      return null;
    }
    return buildSimilarityConfirmQualityBundle({
      dataset: request.dataset,
      mergeRows,
      attributionsForSubmit,
      edgeLabel: resolvedEdgeLabel,
    });
  }, [attributionsForSubmit, mergeRows, request, resolvedEdgeLabel]);

  const isLoadingCompare =
    spectrumQuery.isLoading ||
    descriptorsQuery.isLoading ||
    attributionsQuery.isLoading;

  const matchedPairings =
    plotModel?.pairings.filter((row) => row.kind === "matched") ?? [];
  const channelLabel = similarityCompareChannelLabel(
    plotModel?.compareChannel ?? null,
  );
  const hasSharedChannel = plotModel?.compareChannel != null;
  const waveformLine = waveformSummaryLine({
    compareChannelLabel: channelLabel,
    medianNrmse,
    hasSharedChannel,
  });

  const selectedPairingLabel =
    geometrySelection === "all"
      ? null
      : (matchedPairings.find((row) => row.key === geometrySelection)?.label ??
        geometrySelection);

  const spectrumPlotProps = useMemo(() => {
    const existing = filteredPlotModel?.existingPoints ?? [];
    const upload = filteredPlotModel?.uploadPoints ?? [];
    const residualPts = activeResidual?.residualSpectrum.points ?? [];

    let points: SpectrumPoint[] = [];
    let companions: DifferenceSpectrum[] = [];
    let primaryLabel = "Existing";
    let primaryDash: "solid" | "dash" = "solid";

    switch (plotSource) {
      case "keep":
        points = existing;
        primaryLabel = "Keep";
        primaryDash = "solid";
        break;
      case "absorb":
        points = upload;
        primaryLabel = "Absorb";
        primaryDash = "dash";
        break;
      case "overlay":
        if (existing.length > 0) {
          points = existing;
          primaryLabel = "Keep";
          primaryDash = "solid";
          if (upload.length > 0) {
            companions = [
              {
                label: "Absorb",
                points: upload,
                color: "var(--foreground)",
                lineDash: "dash",
                lineWidth: 2,
                legendId: "upload",
              },
            ];
          }
        } else {
          points = upload;
          primaryLabel = "Absorb";
          primaryDash = "dash";
        }
        break;
      default: {
        const _exhaustive: never = plotSource;
        return _exhaustive;
      }
    }

    const regions = request?.dataset.normalizationRegions;
    return {
      points,
      primaryTraceLabel: primaryLabel,
      primaryTraceLineDash: primaryDash,
      primaryTraceColor: "var(--accent)",
      companionSpectra: companions,
      residualSubplotSplitView: residualPts.length >= 2,
      residualSubplot:
        residualPts.length >= 2
          ? {
              label: "Residual",
              points: residualPts,
              color: "var(--muted)",
            }
          : undefined,
      normalizationRegions:
        regions?.pre || regions?.post
          ? { pre: regions.pre, post: regions.post }
          : undefined,
      showNormalizationShading: Boolean(regions?.pre || regions?.post),
      hidePlotToolRails: true,
      hideGeometryLegend: true,
      suppressInPlotLegend: false,
      height: residualPts.length >= 2 ? 420 : 320,
      emptyStateMessage: "No spectrum points to compare.",
      plotContext: { kind: "explore" as const },
    };
  }, [
    activeResidual,
    filteredPlotModel,
    plotSource,
    request?.dataset.normalizationRegions,
  ]);

  const unresolvedCount = countUnresolvedMergeConflicts(mergeRows);
  const qualityOk = qualityBundle
    ? similarityConfirmQualityAllowsSubmit(qualityBundle.checks, ackedChecks)
    : false;
  const canSubmit = unresolvedCount === 0 && qualityOk && Boolean(mergeSides);

  const rowsForView = useMemo(() => {
    if (reviewMode === "full") {
      return mergeRows;
    }
    return mergeRows.filter((row) => row.status !== "agreed");
  }, [mergeRows, reviewMode]);

  const experimentRows = rowsForView.filter(
    (row) => row.category === "experiment",
  );
  const sampleRows = rowsForView.filter((row) => row.category === "sample");
  const attributionRows = rowsForView.filter(
    (row) => row.category === "attribution",
  );

  const applyBulk = (action: SimilarityBulkAction) => {
    setBulkAction(action);
    setMergeRows((prev) => {
      if (action === "smart") {
        return applySmartMergeResolution(prev);
      }
      const resolution = bulkActionToResolution(action);
      if (!resolution) {
        return prev;
      }
      return applyBulkMergeResolution(prev, resolution);
    });
  };

  const handleResolve = (
    id: SimilarityMergeFieldId,
    resolution: SimilarityMergeResolution,
  ) => {
    setBulkAction(null);
    setMergeRows((prev) =>
      resolveSimilarityMergeConflict(prev, id, resolution),
    );
  };

  const handleContinue = () => {
    if (!request || !mergeSides || !canSubmit) {
      return;
    }
    const patch = buildSimilarityContinuePatchFromMerges(mergeRows, mergeSides);
    onContinue(patch);
  };

  const toggleAck = (id: string, next: boolean) => {
    setAckedChecks((prev) => {
      const copy = new Set(prev);
      if (next) {
        copy.add(id);
      } else {
        copy.delete(id);
      }
      return copy;
    });
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onCancel}
      title="Confirm upload"
      maxWidth="max-w-5xl"
    >
      {request ? (
        <div className="flex flex-col gap-4 text-left">
          <div className="border-border bg-surface-secondary flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="text-foreground font-medium">
                Upload {request.batchIndex + 1} of {request.batchTotal}
              </p>
              <p
                className="text-muted truncate"
                title={request.dataset.fileName}
              >
                {request.dataset.fileName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Chip color="accent" variant="soft" size="sm">
                {energySpanPercent}% energy span
              </Chip>
              <p className="text-muted max-w-[16rem] text-right text-xs">
                {waveformLine}
              </p>
            </div>
          </div>

          <Description className="text-muted text-sm">
            Keep is the Atlas experiment already on this molecule. Absorb is
            this upload. Check the value you want on each conflict; Prefer keep
            copies catalog fields onto the submit.
          </Description>

          <SimilarityBulkResolutionGroup
            bulkAction={bulkAction}
            onBulk={applyBulk}
          />

          <SimilarityReviewModeGroup
            reviewMode={reviewMode}
            unresolvedCount={unresolvedCount}
            onReviewModeChange={setReviewMode}
          />

          {request.batchTotal > 1 ? (
            <SimilarityMetaGroup title="Upload batch">
              <ul className="flex list-none flex-col gap-1 px-3 py-2 text-sm">
                {request.batchFileNames.map((name, i) => (
                  <li
                    key={`${i}-${name}`}
                    className={cn(
                      "truncate",
                      i === request.batchIndex
                        ? "text-foreground font-medium"
                        : "text-muted",
                    )}
                    title={name}
                  >
                    {i + 1}. {name}
                    {i === request.batchIndex ? " (current)" : ""}
                  </li>
                ))}
              </ul>
            </SimilarityMetaGroup>
          ) : null}

          {(request.siblingMatches?.length ?? 0) > 0 ? (
            <SimilarityMetaGroup title="Other similar experiments">
              <ul className="flex list-none flex-col gap-1 px-3 py-2 text-sm">
                {request.siblingMatches!.map((row) => (
                  <li
                    key={row.experimentId}
                    className="text-muted flex flex-wrap items-center gap-2"
                  >
                    <code className="text-xs">
                      {row.experimentId.slice(0, 8)}
                    </code>
                    {row.canonicalSlug ? (
                      <span className="text-xs">{row.canonicalSlug}</span>
                    ) : null}
                    <span className="text-xs">
                      {datasetSimilarityPercent(row.score)}% energy span
                    </span>
                  </li>
                ))}
              </ul>
            </SimilarityMetaGroup>
          ) : null}

          <SimilaritySpectrumSection
            plotSource={plotSource}
            onPlotSourceChange={setPlotSource}
            geometrySelection={geometrySelection}
            onGeometrySelectionChange={setGeometrySelection}
            matchedPairings={matchedPairings}
            description={`${
              selectedPairingLabel
                ? `${plotSource} · ${selectedPairingLabel}. `
                : `${plotSource}. `
            }${
              hasSharedChannel
                ? `Comparing ${channelLabel}. `
                : "No shared channel for residuals. "
            }${
              activeResidual
                ? `Residual NRMSE ${formatNrmsePercent(activeResidual.nrmse)}.`
                : plotSource === "overlay"
                  ? "Pick one matched angle for residuals."
                  : ""
            }`}
            loading={isLoadingCompare}
            plotProps={
              spectrumPlotProps.points.length > 0 ? spectrumPlotProps : null
            }
            emptyMessage="Could not load spectrum points for comparison."
          />

          {descriptorsQuery.isLoading ? (
            <LoadingSkeleton className="h-40 w-full rounded-xl" />
          ) : (
            <>
              {reviewMode === "full" || experimentRows.length > 0 ? (
                <SimilarityMetaGroup title="Experiment">
                  <SimilarityColumnHeader />
                  {experimentRows.length === 0 ? (
                    <p className="text-muted px-3 py-2 text-sm">
                      No experiment conflicts.
                    </p>
                  ) : (
                    experimentRows.map((row) => (
                      <SimilarityConflictRow
                        key={row.id}
                        row={row}
                        onResolve={(resolution) =>
                          handleResolve(row.id, resolution)
                        }
                      />
                    ))
                  )}
                  {reviewMode === "full" ? (
                    <>
                      <SimilarityReadOnlyRow
                        label="Energy"
                        keep={existingEnergySpan}
                        absorb={uploadEnergyLabel}
                        differs={
                          uploadEnergyLabel !== "—" &&
                          existingEnergySpan !== "—" &&
                          uploadEnergyLabel !== existingEnergySpan
                        }
                      />
                      <SimilarityReadOnlyRow
                        label="Calibration"
                        keep={displayOrDash(
                          descriptorsQuery.data?.calibration?.name,
                        )}
                        absorb={
                          request.dataset.referenceStandard.trim() ||
                          (request.dataset.calibrationId
                            ? request.dataset.calibrationId.slice(0, 8)
                            : "—")
                        }
                      />
                      <SimilarityReadOnlyRow
                        label="Identity"
                        keep={
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <code className="text-xs">{shortId}</code>
                            {request.match.canonicalSlug ? (
                              <span className="text-muted text-xs">
                                {request.match.canonicalSlug}
                              </span>
                            ) : null}
                            {existingHref ? (
                              <Link
                                href={existingHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent text-xs underline"
                              >
                                Open in Atlas
                              </Link>
                            ) : null}
                          </span>
                        }
                        absorb={
                          <span
                            className="text-muted truncate"
                            title={request.dataset.fileName}
                          >
                            {request.dataset.fileName}
                          </span>
                        }
                      />
                    </>
                  ) : null}
                </SimilarityMetaGroup>
              ) : null}

              {reviewMode === "full" ? (
                <SimilarityMetaGroup title="Molecule">
                  <SimilarityColumnHeader />
                  <SimilarityReadOnlyRow
                    label="Name"
                    keep={displayOrDash(
                      descriptorsQuery.data?.molecule.iupacName,
                    )}
                    absorb={moleculeName}
                  />
                  <SimilarityReadOnlyRow
                    label="Formula"
                    keep={displayOrDash(
                      descriptorsQuery.data?.molecule.chemicalFormula,
                    )}
                    absorb={displayOrDash(moleculeQuery.data?.chemicalFormula)}
                  />
                  <SimilarityReadOnlyRow
                    label="CAS"
                    keep={displayOrDash(
                      descriptorsQuery.data?.molecule.casNumber,
                    )}
                    absorb={displayOrDash(moleculeQuery.data?.casNumber)}
                  />
                  <SimilarityReadOnlyRow
                    label="InChI"
                    keep={
                      <span
                        title={displayOrDash(
                          descriptorsQuery.data?.molecule.inchi,
                        )}
                      >
                        {truncateMiddle(
                          displayOrDash(descriptorsQuery.data?.molecule.inchi),
                        )}
                      </span>
                    }
                    absorb={
                      <span title={displayOrDash(moleculeQuery.data?.InChI)}>
                        {truncateMiddle(
                          displayOrDash(moleculeQuery.data?.InChI),
                        )}
                      </span>
                    }
                  />
                </SimilarityMetaGroup>
              ) : null}

              {reviewMode === "full" || sampleRows.length > 0 ? (
                <SimilarityMetaGroup title="Sample">
                  <SimilarityColumnHeader />
                  {sampleRows.length === 0 ? (
                    <p className="text-muted px-3 py-2 text-sm">
                      No sample conflicts.
                    </p>
                  ) : (
                    sampleRows.map((row) => (
                      <SimilarityConflictRow
                        key={row.id}
                        row={row}
                        onResolve={(resolution) =>
                          handleResolve(row.id, resolution)
                        }
                      />
                    ))
                  )}
                </SimilarityMetaGroup>
              ) : null}

              {reviewMode === "full" || attributionRows.length > 0 ? (
                <SimilarityMetaGroup title="Attribution">
                  <SimilarityColumnHeader />
                  {attributionRows.map((row) => (
                    <SimilarityConflictRow
                      key={row.id}
                      row={row}
                      onResolve={(resolution) =>
                        handleResolve(row.id, resolution)
                      }
                      keepExtra={
                        <SimilarityAttributionCell
                          display={row.existingDisplay}
                          users={existingAvatars}
                        />
                      }
                      absorbExtra={
                        <SimilarityAttributionCell
                          display={row.uploadDisplay}
                          users={uploadAvatars}
                        />
                      }
                    />
                  ))}
                </SimilarityMetaGroup>
              ) : null}

              {reviewMode === "full" ? (
                <SimilarityMetaGroup title="Sources">
                  <SimilarityColumnHeader />
                  <SimilarityReadOnlyRow
                    label="Publications"
                    keep={formatSourcePublications(
                      descriptorsQuery.data?.sourcePublications ?? [],
                    )}
                    absorb={formatSourcePublications(
                      request.dataset.sourcePaperPublications,
                    )}
                  />
                </SimilarityMetaGroup>
              ) : null}
            </>
          )}

          <SimilarityQualityChecklist
            checks={qualityBundle?.checks ?? []}
            ackedChecks={ackedChecks}
            onToggleAck={toggleAck}
            metrics={qualityBundle?.metrics}
          />

          <SimilarityReviewFooter
            secondaryTitle="Don't submit"
            secondaryDetail="Leave the Atlas experiment unchanged. This upload is not created."
            onSecondary={onCancel}
            primaryTitle="These are unique — submit as new"
            primaryDetail={
              canSubmit
                ? "Create a new experiment. Do not merge into the catalog match."
                : unresolvedCount > 0
                  ? `Resolve ${unresolvedCount} conflict${unresolvedCount === 1 ? "" : "s"} and review quality flags.`
                  : "Review required quality flags before submit."
            }
            onPrimary={handleContinue}
            primaryDisabled={!canSubmit}
          />
        </div>
      ) : null}
    </SimpleDialog>
  );
}
