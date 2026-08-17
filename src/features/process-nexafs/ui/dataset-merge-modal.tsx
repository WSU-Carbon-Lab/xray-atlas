"use client";

/**
 * Persist-merge dialog for two already-uploaded similar NEXAFS experiments.
 * Keep absorbs selected geometries and metadata; absorb is hard-deleted.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Chip, Description } from "@heroui/react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import type {
  DifferenceSpectrum,
  SpectrumPoint,
} from "~/components/plots/types";
import { SimpleDialog } from "~/components/ui/dialog";
import { showToast } from "~/components/ui/toast";
import { mapDbSpectrumRowsToPoints } from "~/features/process-nexafs/utils/mapDbSpectrumRowsToPoints";
import {
  SimilarityAttributionCell,
  SimilarityBulkResolutionGroup,
  SimilarityColumnHeader,
  SimilarityConflictRow,
  SimilarityGeometryRow,
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
} from "~/lib/nexafs-attribution";
import type { DatasetSimilarPair } from "~/lib/nexafs/dataset-similarity";
import {
  DATASET_SIMILARITY_WARN_THRESHOLD,
  evaluateMergeCandidacy,
  parseNexafsMergeExperimentType,
  uniqueGeometryKeysFromPoints,
} from "~/lib/nexafs/dataset-similarity";
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
  buildPersistMergeQualityBundle,
  similarityConfirmQualityAllowsSubmit,
} from "~/lib/nexafs/similarity-confirm-quality";
import { edgeLabelFromAtomCore } from "~/lib/nexafs/edge-energy-bands";
import { moleculeNexafsExperimentHref } from "~/lib/nexafs-experiment-deep-link";
import {
  isPasskeyClientCancelled,
  PASSKEY_ENROLL_BEFORE_DESTRUCTIVE_MESSAGE,
  PASSKEY_STEP_UP_CANCELLED_MESSAGE,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";
import type { ExperimentTypeOption } from "~/features/process-nexafs/types";
import { trpc } from "~/trpc/client";

export interface DatasetMergeModalProps {
  isOpen: boolean;
  pair: DatasetSimilarPair;
  moleculeId: string;
  moleculeSlug: string | null;
  onClose: () => void;
  onDismissAsUnique: () => void;
  onMerged: (keepExperimentId: string) => void | Promise<void>;
}

type GeometrySource = "keep" | "absorb";

function mapConflictResolutionToPersist(
  resolution: SimilarityMergeResolution | undefined,
): "keep" | "absorb" | "both" {
  if (resolution === "upload") {
    return "absorb";
  }
  if (resolution === "both") {
    return "both";
  }
  return "keep";
}

/**
 * Modal that merges absorb into keep after geometry and metadata choices.
 */
export function DatasetMergeModal({
  isOpen,
  pair,
  moleculeSlug,
  onClose,
  onDismissAsUnique,
  onMerged,
}: DatasetMergeModalProps) {
  const utils = trpc.useUtils();
  const [keepId, setKeepId] = useState(pair.suggestedKeepId);
  const [absorbId, setAbsorbId] = useState(pair.suggestedAbsorbId);
  const [geometrySourceByKey, setGeometrySourceByKey] = useState<
    Record<string, GeometrySource>
  >({});
  const [mergeRows, setMergeRows] = useState<SimilarityMergeConflictRow[]>([]);
  const [plotSource, setPlotSource] = useState<SimilarityPlotSource>("overlay");
  const [geometrySelection, setGeometrySelection] =
    useState<SimilarityGeometrySelection>("all");
  const [reviewMode, setReviewMode] =
    useState<SimilarityReviewViewMode>("conflicts");
  const [bulkAction, setBulkAction] = useState<SimilarityBulkAction | null>(
    null,
  );
  const [ackedChecks, setAckedChecks] = useState<Set<string>>(() => new Set());
  const stepUpInFlightRef = useRef(false);

  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();
  const mergeMutation = trpc.experiments.mergeRedundant.useMutation();

  useEffect(() => {
    setKeepId(pair.suggestedKeepId);
    setAbsorbId(pair.suggestedAbsorbId);
    setGeometrySourceByKey({});
    setMergeRows([]);
    setPlotSource("overlay");
    setGeometrySelection("all");
    setReviewMode("conflicts");
    setBulkAction(null);
    setAckedChecks(new Set());
  }, [pair.aId, pair.bId, pair.suggestedAbsorbId, pair.suggestedKeepId]);

  const keepSpectrumQuery = trpc.spectrumpoints.getByExperimentForPlot.useQuery(
    { experimentId: keepId, limit: 10000 },
    { enabled: isOpen && keepId.length > 0 },
  );
  const absorbSpectrumQuery =
    trpc.spectrumpoints.getByExperimentForPlot.useQuery(
      { experimentId: absorbId, limit: 10000 },
      { enabled: isOpen && absorbId.length > 0 },
    );
  const keepDescriptors = trpc.experiments.getDescriptors.useQuery(
    { experimentId: keepId },
    { enabled: isOpen && keepId.length > 0 },
  );
  const absorbDescriptors = trpc.experiments.getDescriptors.useQuery(
    { experimentId: absorbId },
    { enabled: isOpen && absorbId.length > 0 },
  );
  const keepAttributions = trpc.experiments.listAttributions.useQuery(
    { experimentId: keepId },
    { enabled: isOpen && keepId.length > 0 },
  );
  const absorbAttributions = trpc.experiments.listAttributions.useQuery(
    { experimentId: absorbId },
    { enabled: isOpen && absorbId.length > 0 },
  );

  const keepPoints = useMemo((): SpectrumPoint[] => {
    if (!keepSpectrumQuery.data) {
      return [];
    }
    return mapDbSpectrumRowsToPoints(keepSpectrumQuery.data);
  }, [keepSpectrumQuery.data]);

  const absorbPoints = useMemo((): SpectrumPoint[] => {
    if (!absorbSpectrumQuery.data) {
      return [];
    }
    return mapDbSpectrumRowsToPoints(absorbSpectrumQuery.data);
  }, [absorbSpectrumQuery.data]);

  const plotModel = useMemo(
    () => buildSimilarityComparePlotModel(absorbPoints, keepPoints),
    [absorbPoints, keepPoints],
  );

  const pairings = plotModel.pairings;

  useEffect(() => {
    setGeometrySourceByKey((prev) => {
      const next = { ...prev };
      for (const row of pairings) {
        if (row.kind === "matched" && next[row.key] == null) {
          next[row.key] = "keep";
        }
      }
      return next;
    });
  }, [pairings]);

  const residualSummaries = useMemo(
    () => computeMatchedGeometryResiduals(absorbPoints, keepPoints),
    [absorbPoints, keepPoints],
  );
  const medianNrmse = useMemo(
    () => medianGeometryNrmse(residualSummaries),
    [residualSummaries],
  );
  const residualByKey = useMemo(
    () => new Map(residualSummaries.map((row) => [row.key, row])),
    [residualSummaries],
  );

  const filteredPlotModel = useMemo(
    () => filterSimilarityComparePlotModel(plotModel, geometrySelection),
    [geometrySelection, plotModel],
  );

  const activeResidual =
    geometrySelection === "all" || plotSource !== "overlay"
      ? null
      : (residualByKey.get(geometrySelection) ?? null);

  const compareSides = useMemo((): SimilarityMergeCompareSides | null => {
    const keep = keepDescriptors.data;
    const absorb = absorbDescriptors.data;
    if (!keep || !absorb) {
      return null;
    }
    const keepAttrs = dedupeDatasetAttributions(
      datasetAttributionsFromContributorDtos(keepAttributions.data ?? []),
    );
    const absorbAttrs = dedupeDatasetAttributions(
      datasetAttributionsFromContributorDtos(absorbAttributions.data ?? []),
    );
    const keepEdge = keep.edge
      ? edgeLabelFromAtomCore(keep.edge.targetatom, keep.edge.corestate)
      : "—";
    const absorbEdge = absorb.edge
      ? edgeLabelFromAtomCore(absorb.edge.targetatom, absorb.edge.corestate)
      : "—";
    const keepInstrument = keep.instrument
      ? keep.instrument.facilityName
        ? `${keep.instrument.name} (${keep.instrument.facilityName})`
        : keep.instrument.name
      : "—";
    const absorbInstrument = absorb.instrument
      ? absorb.instrument.facilityName
        ? `${absorb.instrument.name} (${absorb.instrument.facilityName})`
        : absorb.instrument.name
      : "—";

    const keepType = (keep.experimentType ?? "") as ExperimentTypeOption | "";
    const absorbType = (absorb.experimentType ?? "") as
      | ExperimentTypeOption
      | "";

    return {
      edge: {
        upload: absorbEdge,
        existing: keepEdge,
        uploadId: absorb.edgeId ?? "",
        existingId: keep.edgeId ?? "",
      },
      instrument: {
        upload: absorbInstrument,
        existing: keepInstrument,
        uploadId: absorb.instrumentId ?? "",
        existingId: keep.instrumentId ?? "",
      },
      type: {
        upload: absorbType || "—",
        existing: keepType || "—",
        uploadValue: absorbType,
        existingValue: keepType,
      },
      researchers: {
        upload: absorbAttrs,
        existing: keepAttrs,
        uploadDisplay: attributionsDisplayLabel(absorbAttrs),
        existingDisplay: attributionsDisplayLabel(keepAttrs),
      },
      substrate: {
        upload: absorb.sample.substrate ?? "",
        existing: keep.sample.substrate ?? "",
      },
      processMethod: {
        upload: absorb.sample.processMethod ?? null,
        existing: keep.sample.processMethod ?? null,
        uploadDisplay: formatProcessMethodDisplay(absorb.sample.processMethod),
        existingDisplay: formatProcessMethodDisplay(keep.sample.processMethod),
      },
      thickness: {
        upload:
          absorb.sample.thickness == null
            ? null
            : Number(absorb.sample.thickness),
        existing:
          keep.sample.thickness == null ? null : Number(keep.sample.thickness),
        uploadDisplay: formatThicknessDisplay(
          absorb.sample.thickness == null
            ? null
            : Number(absorb.sample.thickness),
        ),
        existingDisplay: formatThicknessDisplay(
          keep.sample.thickness == null ? null : Number(keep.sample.thickness),
        ),
      },
      solvent: {
        upload: absorb.sample.solvent ?? "",
        existing: keep.sample.solvent ?? "",
      },
      patterningLayer: {
        upload: absorb.sample.patterningLayer ?? "",
        existing: keep.sample.patterningLayer ?? "",
      },
    };
  }, [
    absorbAttributions.data,
    absorbDescriptors.data,
    keepAttributions.data,
    keepDescriptors.data,
  ]);

  useEffect(() => {
    if (!compareSides) {
      return;
    }
    setMergeRows(buildSimilarityMergeConflicts(compareSides));
  }, [compareSides]);

  const unresolved = countUnresolvedMergeConflicts(mergeRows);
  const loading =
    keepSpectrumQuery.isLoading ||
    absorbSpectrumQuery.isLoading ||
    keepDescriptors.isLoading ||
    absorbDescriptors.isLoading;

  const keepAvatars = useMemo(
    () => attributionsToAvatarUsers(compareSides?.researchers.existing ?? []),
    [compareSides],
  );
  const absorbAvatars = useMemo(
    () => attributionsToAvatarUsers(compareSides?.researchers.upload ?? []),
    [compareSides],
  );

  const keepAttributionsAfterMerge = useMemo(() => {
    if (!compareSides) {
      return [];
    }
    const researchers = mergeRows.find((row) => row.id === "researchers");
    if (researchers?.status === "resolved") {
      if (researchers.resolution === "upload") {
        return compareSides.researchers.upload;
      }
      if (researchers.resolution === "both") {
        return dedupeDatasetAttributions([
          ...compareSides.researchers.existing,
          ...compareSides.researchers.upload,
        ]);
      }
    }
    return compareSides.researchers.existing;
  }, [compareSides, mergeRows]);

  const keepEdgeAfterMerge = useMemo(() => {
    const edgeRow = mergeRows.find((row) => row.id === "edge");
    if (
      edgeRow?.status === "resolved" &&
      edgeRow.resolution === "upload" &&
      compareSides
    ) {
      return compareSides.edge.upload;
    }
    return compareSides?.edge.existing ?? "";
  }, [compareSides, mergeRows]);

  const mergeCandidacy = useMemo(() => {
    const spectraReady = keepPoints.length > 0 && absorbPoints.length > 0;
    return evaluateMergeCandidacy({
      energyScore: pair.score,
      energyThreshold: DATASET_SIMILARITY_WARN_THRESHOLD,
      geometryKeysA: spectraReady
        ? uniqueGeometryKeysFromPoints(keepPoints)
        : [],
      geometryKeysB: spectraReady
        ? uniqueGeometryKeysFromPoints(absorbPoints)
        : [],
      experimentTypeA: parseNexafsMergeExperimentType(
        keepDescriptors.data?.experimentType,
      ),
      experimentTypeB: parseNexafsMergeExperimentType(
        absorbDescriptors.data?.experimentType,
      ),
    });
  }, [
    absorbDescriptors.data?.experimentType,
    absorbPoints,
    keepDescriptors.data?.experimentType,
    keepPoints,
    pair.score,
  ]);

  const qualityBundle = useMemo(() => {
    return buildPersistMergeQualityBundle({
      mergeRows,
      keepAttributions: keepAttributionsAfterMerge,
      keepEdgeLabel: keepEdgeAfterMerge === "—" ? "" : keepEdgeAfterMerge,
      keepPoints,
      absorbLabel:
        absorbId === pair.aId
          ? (pair.aSlug ?? absorbId.slice(0, 8))
          : (pair.bSlug ?? absorbId.slice(0, 8)),
      medianNrmse,
      hasSharedChannel: plotModel.compareChannel != null,
      mergeCandidacyDetail: mergeCandidacy.ok ? null : mergeCandidacy.detail,
    });
  }, [
    absorbId,
    keepAttributionsAfterMerge,
    keepEdgeAfterMerge,
    keepPoints,
    medianNrmse,
    mergeCandidacy.detail,
    mergeCandidacy.ok,
    mergeRows,
    pair.aId,
    pair.aSlug,
    pair.bSlug,
    plotModel.compareChannel,
  ]);

  const qualityOk = similarityConfirmQualityAllowsSubmit(
    qualityBundle.checks,
    ackedChecks,
  );
  const canMerge =
    mergeCandidacy.ok && unresolved === 0 && qualityOk && Boolean(compareSides);

  const matchedPairings = pairings.filter((row) => row.kind === "matched");
  const channelLabel = similarityCompareChannelLabel(plotModel.compareChannel);
  const selectedPairingLabel =
    geometrySelection === "all"
      ? null
      : (matchedPairings.find((row) => row.key === geometrySelection)?.label ??
        geometrySelection);

  const spectrumPlotProps = useMemo(() => {
    const keep = filteredPlotModel.existingPoints;
    const absorb = filteredPlotModel.uploadPoints;
    const residualPts = activeResidual?.residualSpectrum.points ?? [];
    let points: SpectrumPoint[] = [];
    let companions: DifferenceSpectrum[] = [];
    let primaryLabel = "Keep";
    let primaryDash: "solid" | "dash" = "solid";

    switch (plotSource) {
      case "keep":
        points = keep;
        primaryLabel = "Keep";
        primaryDash = "solid";
        break;
      case "absorb":
        points = absorb;
        primaryLabel = "Absorb";
        primaryDash = "dash";
        break;
      case "overlay":
        if (keep.length > 0) {
          points = keep;
          primaryLabel = "Keep";
          primaryDash = "solid";
          if (absorb.length > 0) {
            companions = [
              {
                label: "Absorb",
                points: absorb,
                color: "var(--foreground)",
                lineDash: "dash",
                lineWidth: 2,
                legendId: "upload",
              },
            ];
          }
        } else {
          points = absorb;
          primaryLabel = "Absorb";
          primaryDash = "dash";
        }
        break;
      default: {
        const _exhaustive: never = plotSource;
        return _exhaustive;
      }
    }

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
      hidePlotToolRails: true,
      hideGeometryLegend: true,
      suppressInPlotLegend: false,
      height: residualPts.length >= 2 ? 420 : 320,
      emptyStateMessage: "Could not load spectra for comparison.",
      plotContext: { kind: "explore" as const },
    };
  }, [activeResidual, filteredPlotModel, plotSource]);

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

  const swapKeepAbsorb = useCallback(() => {
    setKeepId(absorbId);
    setAbsorbId(keepId);
    setGeometrySourceByKey({});
    setAckedChecks(new Set());
  }, [absorbId, keepId]);

  const ensureStepUp = useCallback(async (): Promise<boolean> => {
    if (stepUpInFlightRef.current) {
      return false;
    }
    stepUpInFlightRef.current = true;
    try {
      const assurance = await utils.users.getSessionWriteAssurance.fetch(
        undefined,
        { staleTime: 60 * 1000 },
      );
      if (assurance.satisfied) {
        return true;
      }
      if (!assurance.enrolled) {
        showToast(PASSKEY_ENROLL_BEFORE_DESTRUCTIVE_MESSAGE, "error");
        return false;
      }

      const result = await runPasskeyClientAuth({
        action: "authenticate",
        callbackUrl: window.location.href,
        errorFallback: "Passkey confirmation failed. Please try again.",
        incompleteFallback: "Passkey confirmation did not complete",
      });
      if (!result.ok) {
        const message =
          result.errorMessage ??
          "Passkey confirmation failed. Please try again.";
        if (isPasskeyClientCancelled(new Error(message))) {
          showToast(PASSKEY_STEP_UP_CANCELLED_MESSAGE, "error");
          return false;
        }
        showToast(message, "error");
        return false;
      }

      const stepped = await confirmPasskeySessionStepUp.mutateAsync();
      await utils.users.getSessionWriteAssurance.invalidate();
      if (!stepped.evaluation.satisfied) {
        showToast(
          "Passkey confirmation did not elevate this session. Try again, or register a passkey first.",
          "error",
        );
        return false;
      }
      return true;
    } catch (error) {
      if (isPasskeyClientCancelled(error)) {
        showToast(PASSKEY_STEP_UP_CANCELLED_MESSAGE, "error");
        return false;
      }
      showToast(
        error instanceof Error
          ? error.message
          : "Could not confirm passkey session",
        "error",
      );
      return false;
    } finally {
      stepUpInFlightRef.current = false;
    }
  }, [confirmPasskeySessionStepUp, utils.users.getSessionWriteAssurance]);

  const handleMerge = useCallback(async () => {
    if (!mergeCandidacy.ok) {
      showToast(mergeCandidacy.detail, "error");
      return;
    }
    if (unresolved > 0) {
      showToast("Resolve Keep/Absorb conflicts before merging", "error");
      return;
    }
    if (!qualityOk) {
      showToast("Review required quality flags before merging", "error");
      return;
    }
    const geometryResolutions = pairings
      .filter((row) => row.kind === "matched")
      .map((row) => ({
        key: row.key,
        source: geometrySourceByKey[row.key] ?? ("keep" as GeometrySource),
      }));

    const metadataResolutions = mergeRows.map((row) => ({
      field: row.id as SimilarityMergeFieldId,
      source: mapConflictResolutionToPersist(
        row.status === "agreed" ? "existing" : row.resolution,
      ),
    }));

    const researchersResolution = metadataResolutions.find(
      (row) => row.field === "researchers",
    )?.source;
    const attributionsWhenBoth =
      researchersResolution === "both" && compareSides
        ? dedupeDatasetAttributions([
            ...compareSides.researchers.existing,
            ...compareSides.researchers.upload,
          ]).map((row) => ({
            orcid: row.orcid,
            role: row.role,
          }))
        : undefined;

    const stepped = await ensureStepUp();
    if (!stepped) {
      return;
    }

    try {
      const result = await mergeMutation.mutateAsync({
        keepExperimentId: keepId,
        absorbExperimentId: absorbId,
        geometryResolutions,
        metadataResolutions,
        attributionsWhenBoth,
      });
      showToast("Datasets merged; absorbed experiment deleted", "success");
      if (moleculeSlug != null) {
        const href = moleculeNexafsExperimentHref(
          moleculeSlug,
          result.keepExperimentId,
        );
        showToast(`Keep dataset: ${href}`, "success");
      }
      await onMerged(result.keepExperimentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Merge failed";
      showToast(message, "error");
    }
  }, [
    absorbId,
    compareSides,
    ensureStepUp,
    geometrySourceByKey,
    keepId,
    mergeMutation,
    mergeRows,
    moleculeSlug,
    onMerged,
    pairings,
    qualityOk,
    unresolved,
    mergeCandidacy,
  ]);

  const keepLabel =
    keepId === pair.aId
      ? (pair.aSlug ?? keepId.slice(0, 8))
      : (pair.bSlug ?? keepId.slice(0, 8));
  const absorbLabel =
    absorbId === pair.aId
      ? (pair.aSlug ?? absorbId.slice(0, 8))
      : (pair.bSlug ?? absorbId.slice(0, 8));

  const keepEnergySpan =
    keepDescriptors.data?.spectrumEnergyMin != null &&
    keepDescriptors.data?.spectrumEnergyMax != null
      ? formatEnergySpanEv(
          keepDescriptors.data.spectrumEnergyMin,
          keepDescriptors.data.spectrumEnergyMax,
        )
      : "—";
  const absorbEnergySpan =
    absorbDescriptors.data?.spectrumEnergyMin != null &&
    absorbDescriptors.data?.spectrumEnergyMax != null
      ? formatEnergySpanEv(
          absorbDescriptors.data.spectrumEnergyMin,
          absorbDescriptors.data.spectrumEnergyMax,
        )
      : "—";
  const keepHref =
    moleculeSlug != null
      ? moleculeNexafsExperimentHref(moleculeSlug, keepId)
      : null;
  const absorbHref =
    moleculeSlug != null
      ? moleculeNexafsExperimentHref(moleculeSlug, absorbId)
      : null;

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Merge similar datasets"
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col gap-4 text-left">
        <div className="border-border bg-surface-secondary flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-foreground font-medium">
              Keep {keepLabel}; absorb {absorbLabel}
            </p>
            <p className="text-muted text-xs">
              Unique Absorb θ/φ copy onto Keep automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Chip color="accent" variant="soft" size="sm">
              {pair.percent}% energy span
            </Chip>
            {medianNrmse != null ? (
              <Chip
                size="sm"
                variant="soft"
                color={
                  medianNrmse > SIMILARITY_WAVEFORM_POOR_NRMSE
                    ? "warning"
                    : "success"
                }
              >
                Median NRMSE {formatNrmsePercent(medianNrmse)}
              </Chip>
            ) : null}
            <Button size="sm" variant="ghost" onPress={swapKeepAbsorb}>
              Swap keep / absorb
            </Button>
          </div>
        </div>

        <Description className="text-muted text-sm">
          Keep survives. Absorb is deleted. Check the value you want on each
          overlap and metadata conflict.
        </Description>

        <SimilarityBulkResolutionGroup
          bulkAction={bulkAction}
          onBulk={applyBulk}
        />

        <SimilarityReviewModeGroup
          reviewMode={reviewMode}
          unresolvedCount={unresolved}
          onReviewModeChange={setReviewMode}
        />

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
            plotModel.compareChannel
              ? `Comparing ${channelLabel}. `
              : "No shared channel for residuals. "
          }${
            activeResidual
              ? `Residual NRMSE ${formatNrmsePercent(activeResidual.nrmse)}.`
              : plotSource === "overlay"
                ? "Pick one matched angle for residuals."
                : ""
          }`}
          loading={loading}
          plotProps={
            spectrumPlotProps.points.length > 0 ? spectrumPlotProps : null
          }
          emptyMessage="Could not load spectra for comparison."
        />

        <SimilarityMetaGroup title="Polarization geometries">
          <SimilarityColumnHeader />
          {pairings.map((row) => (
            <SimilarityGeometryRow
              key={row.key}
              row={row}
              source={geometrySourceByKey[row.key] ?? "keep"}
              copyAbsorbOntoKeep={mergeCandidacy.ok}
              onSourceChange={(next) =>
                setGeometrySourceByKey((prev) => ({
                  ...prev,
                  [row.key]: next,
                }))
              }
            />
          ))}
        </SimilarityMetaGroup>

        {loading && !compareSides ? (
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
                      keep={keepEnergySpan}
                      absorb={absorbEnergySpan}
                      differs={
                        keepEnergySpan !== "—" &&
                        absorbEnergySpan !== "—" &&
                        keepEnergySpan !== absorbEnergySpan
                      }
                    />
                    <SimilarityReadOnlyRow
                      label="Identity"
                      keep={
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <span>{keepLabel}</span>
                          {keepHref ? (
                            <a
                              href={keepHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent text-xs underline"
                            >
                              Open in Atlas
                            </a>
                          ) : null}
                        </span>
                      }
                      absorb={
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <span>{absorbLabel}</span>
                          {absorbHref ? (
                            <a
                              href={absorbHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent text-xs underline"
                            >
                              Open in Atlas
                            </a>
                          ) : null}
                        </span>
                      }
                    />
                  </>
                ) : null}
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
                        users={keepAvatars}
                      />
                    }
                    absorbExtra={
                      <SimilarityAttributionCell
                        display={row.uploadDisplay}
                        users={absorbAvatars}
                      />
                    }
                  />
                ))}
              </SimilarityMetaGroup>
            ) : null}
          </>
        )}

        <SimilarityQualityChecklist
          checks={qualityBundle.checks}
          ackedChecks={ackedChecks}
          onToggleAck={toggleAck}
        />

        <SimilarityReviewFooter
          secondaryTitle="These are unique"
          secondaryDetail="Keep both experiments. This pair will no longer appear as a merge suggestion in this browser."
          onSecondary={onDismissAsUnique}
          primaryTitle="Merge into keep and delete absorb"
          primaryDetail={
            !mergeCandidacy.ok
              ? mergeCandidacy.detail
              : canMerge
                ? "Keep absorbs chosen geometries and metadata. Absorb is permanently deleted."
                : unresolved > 0
                  ? `Resolve ${unresolved} conflict${unresolved === 1 ? "" : "s"} and review quality flags.`
                  : "Review required quality flags, including permanent delete."
          }
          onPrimary={() => void handleMerge()}
          primaryDisabled={!canMerge || loading || mergeMutation.isPending}
          primaryPending={mergeMutation.isPending}
          primaryDanger
        />
      </div>
    </SimpleDialog>
  );
}
