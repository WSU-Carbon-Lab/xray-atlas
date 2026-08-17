"use client";

/**
 * Persist-merge dialog for two already-uploaded similar NEXAFS experiments.
 * Keep absorbs selected geometries and metadata; absorb is hard-deleted.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Chip,
  Description,
  Label,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { SpectrumPoint } from "~/components/plots/types";
import { SimpleDialog } from "~/components/ui/dialog";
import { showToast } from "~/components/ui/toast";
import { mapDbSpectrumRowsToPoints } from "~/features/process-nexafs/utils/mapDbSpectrumRowsToPoints";
import {
  datasetAttributionsFromContributorDtos,
  dedupeDatasetAttributions,
} from "~/lib/nexafs-attribution";
import type { DatasetSimilarPair } from "~/lib/nexafs/dataset-similarity";
import {
  buildSimilarityComparePlotModel,
  computeMatchedGeometryResiduals,
  formatNrmsePercent,
  medianGeometryNrmse,
  pairGeometriesForSimilarityCompare,
  SIMILARITY_WAVEFORM_POOR_NRMSE,
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
import { edgeLabelFromAtomCore } from "~/lib/nexafs/edge-energy-bands";
import { moleculeNexafsExperimentHref } from "~/lib/nexafs-experiment-deep-link";
import {
  isPasskeyClientCancelled,
  runPasskeyClientAuth,
} from "~/lib/passkey-client-auth";
import type { ExperimentTypeOption } from "~/features/process-nexafs/types";
import { trpc } from "~/trpc/client";
import { cn } from "@heroui/styles";

export interface DatasetMergeModalProps {
  isOpen: boolean;
  pair: DatasetSimilarPair;
  moleculeId: string;
  moleculeSlug: string | null;
  onClose: () => void;
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
  onMerged,
}: DatasetMergeModalProps) {
  const utils = trpc.useUtils();
  const [keepId, setKeepId] = useState(pair.suggestedKeepId);
  const [absorbId, setAbsorbId] = useState(pair.suggestedAbsorbId);
  const [geometrySourceByKey, setGeometrySourceByKey] = useState<
    Record<string, GeometrySource>
  >({});
  const [mergeRows, setMergeRows] = useState<SimilarityMergeConflictRow[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stepUpInFlightRef = useRef(false);

  const confirmPasskeySessionStepUp =
    trpc.users.confirmPasskeySessionStepUp.useMutation();
  const mergeMutation = trpc.experiments.mergeRedundant.useMutation();

  useEffect(() => {
    setKeepId(pair.suggestedKeepId);
    setAbsorbId(pair.suggestedAbsorbId);
    setGeometrySourceByKey({});
    setMergeRows([]);
    setConfirmDelete(false);
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

  const pairings = useMemo(
    () => pairGeometriesForSimilarityCompare(absorbPoints, keepPoints),
    [absorbPoints, keepPoints],
  );

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

  const plotModel = useMemo(
    () => buildSimilarityComparePlotModel(absorbPoints, keepPoints),
    [absorbPoints, keepPoints],
  );

  const residualSummaries = useMemo(
    () => computeMatchedGeometryResiduals(absorbPoints, keepPoints),
    [absorbPoints, keepPoints],
  );
  const medianNrmse = useMemo(
    () => medianGeometryNrmse(residualSummaries),
    [residualSummaries],
  );

  const residualSubplot = useMemo(() => {
    if (residualSummaries.length === 0) {
      return undefined;
    }
    let worst = residualSummaries[0]!;
    for (const row of residualSummaries) {
      if (row.nrmse > worst.nrmse) {
        worst = row;
      }
    }
    return worst.residualSpectrum;
  }, [residualSummaries]);

  const companionSpectra = useMemo(
    () =>
      plotModel.uploadCompanions.map((companion) => ({
        ...companion,
        label: companion.label.replace(/^Upload/, "Absorb"),
      })),
    [plotModel.uploadCompanions],
  );

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
        uploadDisplay: absorbAttrs.map((row) => row.orcid).join(", "),
        existingDisplay: keepAttrs.map((row) => row.orcid).join(", "),
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

  const swapKeepAbsorb = useCallback(() => {
    setKeepId(absorbId);
    setAbsorbId(keepId);
    setGeometrySourceByKey({});
    setConfirmDelete(false);
  }, [absorbId, keepId]);

  const ensureStepUp = useCallback(async (): Promise<boolean> => {
    if (stepUpInFlightRef.current) {
      return false;
    }
    stepUpInFlightRef.current = true;
    try {
      const evaluation = await confirmPasskeySessionStepUp.mutateAsync();
      if (evaluation.evaluation.satisfied) {
        return true;
      }
      const result = await runPasskeyClientAuth({
        action: "sign-in",
        callbackUrl: window.location.href,
        errorFallback: "Passkey confirmation failed. Please try again.",
        incompleteFallback: "Passkey confirmation did not complete",
      });
      if (!result.ok) {
        const message =
          result.errorMessage ??
          "Passkey confirmation failed. Please try again.";
        if (isPasskeyClientCancelled(new Error(message))) {
          showToast("Passkey confirmation cancelled", "error");
          return false;
        }
        showToast(message, "error");
        return false;
      }
      const again = await confirmPasskeySessionStepUp.mutateAsync();
      await utils.users.getSessionWriteAssurance.invalidate();
      return again.evaluation.satisfied;
    } catch {
      showToast("Could not confirm passkey session", "error");
      return false;
    } finally {
      stepUpInFlightRef.current = false;
    }
  }, [confirmPasskeySessionStepUp, utils.users.getSessionWriteAssurance]);

  const handleMerge = useCallback(async () => {
    if (!confirmDelete) {
      showToast(
        "Confirm permanent deletion of the absorbed dataset first",
        "error",
      );
      return;
    }
    if (unresolved > 0) {
      showToast("Resolve metadata conflicts before merging", "error");
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
    confirmDelete,
    ensureStepUp,
    geometrySourceByKey,
    keepId,
    mergeMutation,
    mergeRows,
    moleculeSlug,
    onMerged,
    pairings,
    unresolved,
  ]);

  const keepLabel =
    keepId === pair.aId
      ? (pair.aSlug ?? keepId.slice(0, 8))
      : (pair.bSlug ?? keepId.slice(0, 8));
  const absorbLabel =
    absorbId === pair.aId
      ? (pair.aSlug ?? absorbId.slice(0, 8))
      : (pair.bSlug ?? absorbId.slice(0, 8));

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Merge similar datasets"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" variant="soft" color="accent">
            {pair.percent}% energy-span similar
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
        <Description className="text-muted text-sm">
          Keep <span className="text-foreground font-medium">{keepLabel}</span>;
          absorb and delete{" "}
          <span className="text-foreground font-medium">{absorbLabel}</span>.
          Unique θ/φ from absorb are copied automatically. Overlay: keep solid,
          absorb dashed.
        </Description>

        {loading ? (
          <LoadingSkeleton className="h-48 w-full rounded-xl" />
        ) : (
          <>
            <div className="h-64 min-h-0">
              <SpectrumPlot
                points={plotModel.existingPoints}
                companionSpectra={companionSpectra}
                residualSubplotSplitView={residualSubplot != null}
                residualSubplot={residualSubplot}
                height={residualSubplot != null ? 320 : 256}
                hidePlotToolRails
                emptyStateMessage="Could not load spectra for comparison."
              />
            </div>

            <div>
              <h3 className="text-foreground mb-2 text-sm font-semibold">
                Polarization geometries
              </h3>
              <ul className="space-y-2">
                {pairings.map((row) => (
                  <li
                    key={row.key}
                    className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      {row.label}{" "}
                      <span className="text-muted">
                        {row.kind === "matched"
                          ? "(overlap)"
                          : row.kind === "upload_only"
                            ? "(absorb only — will copy)"
                            : "(keep only)"}
                      </span>
                    </span>
                    {row.kind === "matched" ? (
                      <ToggleButtonGroup
                        aria-label={`Spectrum source for ${row.label}`}
                        selectionMode="single"
                        selectedKeys={
                          new Set([geometrySourceByKey[row.key] ?? "keep"])
                        }
                        onSelectionChange={(keys) => {
                          const next = keys.values().next().value;
                          if (next === "keep" || next === "absorb") {
                            setGeometrySourceByKey((prev) => ({
                              ...prev,
                              [row.key]: next,
                            }));
                          }
                        }}
                      >
                        <ToggleButton id="keep" size="sm">
                          Keep
                        </ToggleButton>
                        <ToggleButton id="absorb" size="sm">
                          Absorb
                        </ToggleButton>
                      </ToggleButtonGroup>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-foreground text-sm font-semibold">
                  Metadata
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    setMergeRows((rows) =>
                      applyBulkMergeResolution(rows, "existing"),
                    )
                  }
                >
                  Prefer keep
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    setMergeRows((rows) =>
                      applyBulkMergeResolution(rows, "upload"),
                    )
                  }
                >
                  Prefer absorb
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    setMergeRows((rows) => applySmartMergeResolution(rows))
                  }
                >
                  Smart merge
                </Button>
                {unresolved > 0 ? (
                  <span className="text-danger text-xs">
                    {unresolved} unresolved
                  </span>
                ) : null}
              </div>
              <ul className="space-y-2">
                {mergeRows.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      "border-border rounded-md border px-3 py-2 text-sm",
                      row.status === "conflict" && "border-warning",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Label className="font-medium">{row.label}</Label>
                        <p className="text-muted text-xs">
                          Keep: {row.existingDisplay} · Absorb:{" "}
                          {row.uploadDisplay}
                        </p>
                      </div>
                      {row.status !== "agreed" ? (
                        <ToggleButtonGroup
                          aria-label={`Resolve ${row.label}`}
                          selectionMode="single"
                          selectedKeys={new Set([row.resolution ?? "existing"])}
                          onSelectionChange={(keys) => {
                            const next = keys.values().next().value;
                            if (
                              next === "upload" ||
                              next === "existing" ||
                              (next === "both" && row.allowsBoth)
                            ) {
                              setMergeRows((rows) =>
                                resolveSimilarityMergeConflict(
                                  rows,
                                  row.id,
                                  next,
                                ),
                              );
                            }
                          }}
                        >
                          <ToggleButton id="existing" size="sm">
                            Keep
                          </ToggleButton>
                          <ToggleButton id="upload" size="sm">
                            Absorb
                          </ToggleButton>
                          {row.allowsBoth ? (
                            <ToggleButton id="both" size="sm">
                              Both
                            </ToggleButton>
                          ) : null}
                        </ToggleButtonGroup>
                      ) : (
                        <Chip size="sm" variant="soft">
                          Agreed
                        </Chip>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Checkbox
              isSelected={confirmDelete}
              onChange={setConfirmDelete}
              className="border-danger/40 bg-danger/5 items-start gap-2 rounded-lg border px-3 py-2"
            >
              <Checkbox.Control className="mt-0.5">
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                I understand the absorb experiment{" "}
                <strong>{absorbLabel}</strong> will be permanently deleted,
                including any Zenodo DOI or Atlas citation tag on that row. The
                keep experiment remains the citation target.
              </Checkbox.Content>
            </Checkbox>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={() => void handleMerge()}
                isDisabled={
                  loading ||
                  unresolved > 0 ||
                  !confirmDelete ||
                  mergeMutation.isPending
                }
                isPending={mergeMutation.isPending}
              >
                Merge into keep and delete absorb
              </Button>
            </div>
          </>
        )}
      </div>
    </SimpleDialog>
  );
}
