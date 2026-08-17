"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Checkbox,
  Chip,
  Description,
  Label,
  Link,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { CheckIcon } from "~/components/icons";
import { ContributorAvatarGroup } from "~/components/attribution/contributor-avatar-group";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import { NexafsDatasetMetricsRail } from "~/components/nexafs/nexafs-dataset-metrics-rail";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type {
  DifferenceSpectrum,
  SpectrumPoint,
} from "~/components/plots/types";
import { SimpleDialog } from "~/components/ui/dialog";
import {
  normalizeProfileImageUrl,
  type UserWithOrcid,
} from "~/components/ui/avatar";
import { contributorRoleLabelsForDisplay } from "~/lib/contributor-avatar-display";
import type {
  DatasetState,
  ExperimentTypeOption,
} from "~/features/process-nexafs/types";
import { mapDbSpectrumRowsToPoints } from "~/features/process-nexafs/utils/mapDbSpectrumRowsToPoints";
import type { SimilarityContinuePatch } from "~/features/process-nexafs/utils/similarity-continue-patch";
import {
  datasetAttributionsForAvatarDisplay,
  datasetAttributionsFromContributorDtos,
  dedupeDatasetAttributions,
  researcherAttributionBadgeStatus,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import { attributionResearcherAvatarProps } from "~/lib/dataset-attribution-claim";
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

type PlotSource = "existing" | "upload" | "overlay";

type ReviewViewMode = "conflicts" | "full";

type BulkAction = "upload" | "existing" | "smart";

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

function attributionsToAvatarUsers(
  rows: readonly DatasetAttributionEntry[],
): UserWithOrcid[] {
  return datasetAttributionsForAvatarDisplay([...rows]).map((display) => {
    const orcid = display.orcid.trim();
    const avatarProps = attributionResearcherAvatarProps({
      orcid,
      resolved: {
        displayLabel: display.displayName,
        displayName: display.isOrcidOnlyDisplay ? null : display.displayName,
        imageUrl: display.image,
        showProfileImage: Boolean(display.image?.trim()),
        isOrcidOnlyLabel: display.isOrcidOnlyDisplay,
        avatarPlaceholder: display.avatarPlaceholder,
      },
    });
    return {
      id: display.isClaimed
        ? display.profileUserId.trim() || orcid
        : orcid,
      orcid,
      name: avatarProps.displayName,
      image: normalizeProfileImageUrl(avatarProps.imageUrl),
      isAtlasProfile: avatarProps.isAtlasProfile,
      avatarPlaceholder: avatarProps.placeholder,
      attributionBadgeStatus: researcherAttributionBadgeStatus({
        isClaimed: display.isClaimed,
        hasContributionAgreement: display.hasContributionAgreement,
      }),
      hoverRoleLabel: contributorRoleLabelsForDisplay(display.roles),
      tooltipSubtitle: contributorRoleLabelsForDisplay(display.roles),
      avatarStackKey: display.stackKey,
    };
  });
}

function attributionsDisplayLabel(
  rows: readonly DatasetAttributionEntry[],
): string {
  if (rows.length === 0) {
    return "—";
  }
  const names = datasetAttributionsForAvatarDisplay([...rows])
    .map((row) => row.displayName.trim())
    .filter((name) => name.length > 0);
  if (names.length === 0) {
    return `${rows.length} researcher${rows.length === 1 ? "" : "s"}`;
  }
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
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

function MetaGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-surface-secondary overflow-hidden rounded-xl border">
      <header className="text-muted px-3 py-2 text-xs font-semibold tracking-wide uppercase">
        {title}
      </header>
      <div className="border-border bg-surface divide-border divide-y border-t">
        {children}
      </div>
    </section>
  );
}

function ColumnHeader() {
  return (
    <div className="text-muted grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
      <span>Field</span>
      <span>Upload</span>
      <span>Existing</span>
    </div>
  );
}

function SelectableCell({
  selected,
  onSelect,
  children,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
        selected
          ? "bg-accent/15 ring-accent/40 ring-1"
          : "hover:bg-default/70",
        disabled && "cursor-default opacity-80 hover:bg-transparent",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-transparent",
        )}
        aria-hidden
      >
        {selected ? <CheckIcon className="size-2.5" /> : null}
      </span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </button>
  );
}

function ReadOnlyRow({
  label,
  upload,
  existing,
  differs,
}: {
  label: string;
  upload: ReactNode;
  existing: ReactNode;
  differs?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-2 text-sm",
        differs && "bg-warning/10",
      )}
    >
      <div className="text-muted font-medium">{label}</div>
      <div className="text-foreground min-w-0 break-words">{upload}</div>
      <div className="text-foreground min-w-0 break-words">{existing}</div>
    </div>
  );
}

function ConflictRow({
  row,
  onResolve,
  uploadExtra,
  existingExtra,
}: {
  row: SimilarityMergeConflictRow;
  onResolve: (resolution: SimilarityMergeResolution) => void;
  uploadExtra?: ReactNode;
  existingExtra?: ReactNode;
}) {
  if (row.status === "agreed") {
    return (
      <ReadOnlyRow
        label={row.label}
        upload={uploadExtra ?? row.uploadDisplay}
        existing={existingExtra ?? row.existingDisplay}
      />
    );
  }

  const selected = row.resolution;
  return (
    <div className="bg-warning/5 grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-2 text-sm">
      <div className="text-muted flex flex-col gap-1 font-medium">
        <span>{row.label}</span>
        <span className="text-warning text-[10px] font-semibold tracking-wide uppercase">
          Conflict
        </span>
        {row.allowsBoth ? (
          <button
            type="button"
            onClick={() => onResolve("both")}
            className={cn(
              "text-accent w-fit text-left text-xs underline",
              selected === "both" && "font-semibold",
            )}
          >
            Use both
          </button>
        ) : null}
      </div>
      <SelectableCell
        selected={selected === "upload"}
        onSelect={() => onResolve("upload")}
      >
        {uploadExtra ?? row.uploadDisplay}
      </SelectableCell>
      <SelectableCell
        selected={selected === "existing"}
        onSelect={() => onResolve("existing")}
      >
        {existingExtra ?? row.existingDisplay}
      </SelectableCell>
    </div>
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
  const [plotSource, setPlotSource] = useState<PlotSource>("overlay");
  const [reviewMode, setReviewMode] = useState<ReviewViewMode>("conflicts");
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
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
  const uploadTypeShort = experimentTypeShort(
    request?.dataset.experimentType,
  );

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
    if (
      edgeRow?.status === "resolved" &&
      edgeRow.resolution === "existing"
    ) {
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
      case "existing":
        points = existing;
        primaryLabel = "Existing";
        primaryDash = "solid";
        break;
      case "upload":
        points = upload;
        primaryLabel = "Upload";
        primaryDash = "dash";
        break;
      case "overlay":
        if (existing.length > 0) {
          points = existing;
          primaryLabel = "Existing";
          primaryDash = "solid";
          if (upload.length > 0) {
            companions = [
              {
                label: "Upload",
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
          primaryLabel = "Upload";
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
    ? similarityConfirmQualityAllowsSubmit(
        qualityBundle.checks,
        ackedChecks,
      )
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

  const applyBulk = (action: BulkAction) => {
    setBulkAction(action);
    setMergeRows((prev) => {
      if (action === "smart") {
        return applySmartMergeResolution(prev);
      }
      return applyBulkMergeResolution(
        prev,
        action === "upload" ? "upload" : "existing",
      );
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
    const patch = buildSimilarityContinuePatchFromMerges(
      mergeRows,
      mergeSides,
    );
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
            Similar Atlas data was found. Resolve merge conflicts, review
            quality checks, then confirm the spectrum before submit.
          </Description>

          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm font-medium">
              Resolve disagreements
            </Label>
            <ToggleButtonGroup
              aria-label="Bulk merge resolution"
              selectionMode="single"
              selectedKeys={bulkAction ? new Set([bulkAction]) : new Set()}
              onSelectionChange={(keys) => {
                const next = keys.values().next().value;
                if (next === "upload" || next === "existing" || next === "smart") {
                  applyBulk(next);
                }
              }}
              className="flex flex-wrap gap-1"
            >
              <ToggleButton id="upload" size="sm" className="rounded-lg px-3">
                Keep upload
              </ToggleButton>
              <ToggleButton id="existing" size="sm" className="rounded-lg px-3">
                Keep existing
              </ToggleButton>
              <ToggleButton id="smart" size="sm" className="rounded-lg px-3">
                Smart merge
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm font-medium">
              Review
            </Label>
            <ToggleButtonGroup
              aria-label="Review mode"
              selectionMode="single"
              selectedKeys={new Set([reviewMode])}
              onSelectionChange={(keys) => {
                const next = keys.values().next().value;
                if (next === "conflicts" || next === "full") {
                  setReviewMode(next);
                }
              }}
              className="flex flex-wrap gap-1"
            >
              <ToggleButton
                id="conflicts"
                size="sm"
                className="rounded-lg px-3"
              >
                Conflicts
                {unresolvedCount > 0 ? ` (${unresolvedCount})` : ""}
              </ToggleButton>
              <ToggleButton id="full" size="sm" className="rounded-lg px-3">
                Full review
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {request.batchTotal > 1 ? (
            <MetaGroup title="Upload batch">
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
            </MetaGroup>
          ) : null}

          {(request.siblingMatches?.length ?? 0) > 0 ? (
            <MetaGroup title="Other similar experiments">
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
            </MetaGroup>
          ) : null}

          <MetaGroup title="Spectrum">
            <div className="flex flex-col gap-3 px-3 py-3">
              <div className="flex flex-col gap-2">
                <Label className="text-foreground text-sm font-medium">
                  Show spectrum
                </Label>
                <ToggleButtonGroup
                  aria-label="Plot source"
                  selectionMode="single"
                  selectedKeys={new Set([plotSource])}
                  onSelectionChange={(keys) => {
                    const next = keys.values().next().value;
                    if (
                      next === "existing" ||
                      next === "upload" ||
                      next === "overlay"
                    ) {
                      setPlotSource(next);
                    }
                  }}
                  className="flex flex-wrap gap-1"
                >
                  <ToggleButton
                    id="existing"
                    size="sm"
                    className="rounded-lg px-3"
                  >
                    Existing
                  </ToggleButton>
                  <ToggleButton
                    id="upload"
                    size="sm"
                    className="rounded-lg px-3"
                  >
                    Upload
                  </ToggleButton>
                  <ToggleButton
                    id="overlay"
                    size="sm"
                    className="rounded-lg px-3"
                  >
                    Overlay
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>

              {plotModel && matchedPairings.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-foreground text-sm font-medium">
                    Angle
                  </Label>
                  <ToggleButtonGroup
                    aria-label="Geometry pair selection"
                    selectionMode="single"
                    selectedKeys={new Set([geometrySelection])}
                    onSelectionChange={(keys) => {
                      const next = keys.values().next().value;
                      if (typeof next === "string" && next.length > 0) {
                        setGeometrySelection(
                          next as SimilarityGeometrySelection,
                        );
                      }
                    }}
                    className="flex flex-wrap gap-1"
                  >
                    <ToggleButton
                      id="all"
                      size="sm"
                      className="rounded-lg px-3"
                    >
                      All angles
                    </ToggleButton>
                    {matchedPairings.map((pairing) => (
                      <ToggleButton
                        key={pairing.key}
                        id={pairing.key}
                        size="sm"
                        className="rounded-lg px-3"
                      >
                        {pairing.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </div>
              ) : null}

              <Description className="text-muted text-xs">
                {selectedPairingLabel
                  ? `${plotSource} · ${selectedPairingLabel}. `
                  : `${plotSource}. `}
                {hasSharedChannel
                  ? `Comparing ${channelLabel}. `
                  : "No shared channel for residuals. "}
                {activeResidual
                  ? `Residual NRMSE ${formatNrmsePercent(activeResidual.nrmse)}.`
                  : plotSource === "overlay"
                    ? "Pick one matched angle for residuals."
                    : ""}
              </Description>

              {isLoadingCompare ? (
                <LoadingSkeleton className="h-80 w-full rounded-xl" />
              ) : spectrumPlotProps.points.length > 0 ? (
                <SpectrumPlot {...spectrumPlotProps} />
              ) : (
                <div className="border-border text-muted rounded-xl border border-dashed p-6 text-sm">
                  Could not load spectrum points for comparison.
                </div>
              )}
            </div>
          </MetaGroup>

          {descriptorsQuery.isLoading ? (
            <LoadingSkeleton className="h-40 w-full rounded-xl" />
          ) : (
            <>
              {reviewMode === "full" || experimentRows.length > 0 ? (
                <MetaGroup title="Experiment">
                  <ColumnHeader />
                  {experimentRows.length === 0 ? (
                    <p className="text-muted px-3 py-2 text-sm">
                      No experiment conflicts.
                    </p>
                  ) : (
                    experimentRows.map((row) => (
                      <ConflictRow
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
                      <ReadOnlyRow
                        label="Energy"
                        upload={uploadEnergyLabel}
                        existing={existingEnergySpan}
                        differs={
                          uploadEnergyLabel !== "—" &&
                          existingEnergySpan !== "—" &&
                          uploadEnergyLabel !== existingEnergySpan
                        }
                      />
                      <ReadOnlyRow
                        label="Calibration"
                        upload={
                          request.dataset.referenceStandard.trim() ||
                          (request.dataset.calibrationId
                            ? request.dataset.calibrationId.slice(0, 8)
                            : "—")
                        }
                        existing={displayOrDash(
                          descriptorsQuery.data?.calibration?.name,
                        )}
                      />
                      <ReadOnlyRow
                        label="Identity"
                        upload={
                          <span
                            className="text-muted truncate"
                            title={request.dataset.fileName}
                          >
                            {request.dataset.fileName}
                          </span>
                        }
                        existing={
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
                      />
                    </>
                  ) : null}
                </MetaGroup>
              ) : null}

              {reviewMode === "full" ? (
                <MetaGroup title="Molecule">
                  <ColumnHeader />
                  <ReadOnlyRow
                    label="Name"
                    upload={moleculeName}
                    existing={displayOrDash(
                      descriptorsQuery.data?.molecule.iupacName,
                    )}
                  />
                  <ReadOnlyRow
                    label="Formula"
                    upload={displayOrDash(moleculeQuery.data?.chemicalFormula)}
                    existing={displayOrDash(
                      descriptorsQuery.data?.molecule.chemicalFormula,
                    )}
                  />
                  <ReadOnlyRow
                    label="CAS"
                    upload={displayOrDash(moleculeQuery.data?.casNumber)}
                    existing={displayOrDash(
                      descriptorsQuery.data?.molecule.casNumber,
                    )}
                  />
                  <ReadOnlyRow
                    label="InChI"
                    upload={
                      <span title={displayOrDash(moleculeQuery.data?.InChI)}>
                        {truncateMiddle(
                          displayOrDash(moleculeQuery.data?.InChI),
                        )}
                      </span>
                    }
                    existing={
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
                  />
                </MetaGroup>
              ) : null}

              {reviewMode === "full" || sampleRows.length > 0 ? (
                <MetaGroup title="Sample">
                  <ColumnHeader />
                  {sampleRows.length === 0 ? (
                    <p className="text-muted px-3 py-2 text-sm">
                      No sample conflicts.
                    </p>
                  ) : (
                    sampleRows.map((row) => (
                      <ConflictRow
                        key={row.id}
                        row={row}
                        onResolve={(resolution) =>
                          handleResolve(row.id, resolution)
                        }
                      />
                    ))
                  )}
                </MetaGroup>
              ) : null}

              {reviewMode === "full" || attributionRows.length > 0 ? (
                <MetaGroup title="Attribution">
                  <ColumnHeader />
                  {attributionRows.map((row) => (
                    <ConflictRow
                      key={row.id}
                      row={row}
                      onResolve={(resolution) =>
                        handleResolve(row.id, resolution)
                      }
                      uploadExtra={
                        <div className="pointer-events-none flex flex-col gap-2">
                          <span>{row.uploadDisplay}</span>
                          {uploadAvatars.length > 0 ? (
                            <ContributorAvatarGroup
                              users={uploadAvatars}
                              size="sm"
                              max={4}
                              expandOnHover={false}
                            />
                          ) : null}
                        </div>
                      }
                      existingExtra={
                        <div className="pointer-events-none flex flex-col gap-2">
                          <span>{row.existingDisplay}</span>
                          {existingAvatars.length > 0 ? (
                            <ContributorAvatarGroup
                              users={existingAvatars}
                              size="sm"
                              max={4}
                              expandOnHover={false}
                            />
                          ) : null}
                        </div>
                      }
                    />
                  ))}
                </MetaGroup>
              ) : null}

              {reviewMode === "full" ? (
                <MetaGroup title="Sources">
                  <ColumnHeader />
                  <ReadOnlyRow
                    label="Publications"
                    upload={formatSourcePublications(
                      request.dataset.sourcePaperPublications,
                    )}
                    existing={formatSourcePublications(
                      descriptorsQuery.data?.sourcePublications ?? [],
                    )}
                  />
                </MetaGroup>
              ) : null}
            </>
          )}

          <MetaGroup title="Quality checklist">
            <div className="flex flex-col gap-3 px-3 py-3">
              {qualityBundle?.metrics && !qualityBundle.metrics.missing ? (
                <NexafsDatasetMetricsRail metrics={qualityBundle.metrics} />
              ) : null}
              <ul className="flex list-none flex-col gap-2 p-0">
                {(qualityBundle?.checks ?? []).map((check) => (
                  <li
                    key={check.id}
                    className={cn(
                      "border-border rounded-lg border px-3 py-2 text-sm",
                      check.severity === "blocker" && "border-danger/40 bg-danger/5",
                      check.severity === "warn" && "border-warning/40 bg-warning/5",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium">
                          {check.title}
                        </p>
                        <p className="text-muted text-xs leading-snug">
                          {check.detail}
                        </p>
                      </div>
                      {check.requiresAck ? (
                        <Checkbox
                          isSelected={ackedChecks.has(check.id)}
                          onChange={(next) => toggleAck(check.id, next)}
                          className="items-start gap-1.5"
                        >
                          <Checkbox.Control className="mt-0.5 size-3.5">
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Content>
                            <span className="text-xs">Reviewed</span>
                          </Checkbox.Content>
                        </Checkbox>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </MetaGroup>

          <div className="border-border flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-stretch sm:justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="border-border bg-surface hover:bg-surface-secondary focus-visible:ring-accent flex flex-1 flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2"
            >
              <span className="text-foreground text-sm font-semibold">
                Keep existing
              </span>
              <span className="text-muted text-xs leading-snug">
                Do not submit this upload. The Atlas experiment stays as-is.
              </span>
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canSubmit}
              className="border-accent/40 bg-accent/15 hover:bg-accent/25 focus-visible:ring-accent flex flex-1 flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-foreground text-sm font-semibold">
                Submit upload
              </span>
              <span className="text-muted text-xs leading-snug">
                {canSubmit
                  ? "Add this spectrum as a new experiment with your merge choices."
                  : unresolvedCount > 0
                    ? `Resolve ${unresolvedCount} conflict${unresolvedCount === 1 ? "" : "s"} and review quality flags.`
                    : "Review required quality flags before submit."}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </SimpleDialog>
  );
}
