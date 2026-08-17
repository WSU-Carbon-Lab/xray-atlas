"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import { SampleMetadataPanelHeading } from "~/components/nexafs/sample-metadata-display-chrome";
import { DefaultButton } from "~/components/ui/button";
import { showToast } from "~/components/ui/toast";
import {
  labelForPeakKind,
  NEXAFS_PEAK_KIND_OPTIONS,
  unicodeShortLabelForPeakKind,
} from "~/components/plots/spectrum/peakKindOptions";
import { mapPeaksetsToPlotPeaks } from "~/features/process-nexafs/hooks/useNexafsSpectrumBrowseModel";
import { trpc } from "~/trpc/client";

export type NexafsExperimentPeaksPanelProps = {
  experimentId: string;
  enabled: boolean;
  /** When set, requests graph peak-edit mode after the user chooses Edit. */
  onRequestPlotPeakEdit?: () => void;
  /** Invoked after a successful `replacePeaksets` save. */
  onPeaksSaved?: () => void;
};

type PeakDraftRow = {
  id: string;
  energy: number;
  intensity: number | null;
  peakKind: string | null;
};

function peaksSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-4 py-1"
      aria-busy
      aria-label="Loading peak assignments"
    >
      <LoadingSkeleton className="h-6 w-48 rounded-md" />
      <LoadingSkeleton className="h-[160px] w-full rounded-2xl" />
    </div>
  );
}

function peakRowsFromServer(
  rows: Array<{
    id: string;
    energyev: number;
    intensity: number | null;
    transition: string | null;
  }>,
): PeakDraftRow[] {
  return mapPeaksetsToPlotPeaks(rows).map((peak) => ({
    id: peak.id ?? `peak-${peak.energy}`,
    energy: peak.energy,
    intensity:
      peak.amplitude === undefined || peak.amplitude === null
        ? null
        : peak.amplitude,
    peakKind: peak.peakKind ?? null,
  }));
}

/**
 * Lists persisted peak assignments for one experiment. Authorized contributors
 * may edit energies and resonance kinds in place and save via
 * `experiments.replacePeaksets`.
 */
export function NexafsExperimentPeaksPanel({
  experimentId,
  enabled,
  onRequestPlotPeakEdit,
  onPeaksSaved,
}: NexafsExperimentPeaksPanelProps) {
  const utils = trpc.useUtils();

  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );
  const canEdit = canEditQuery.data?.canEdit === true;

  const peaksQuery = trpc.spectrumpoints.peaksForExperiment.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );

  const replacePeaksets = trpc.experiments.replacePeaksets.useMutation({
    onSuccess: async () => {
      await utils.spectrumpoints.peaksForExperiment.invalidate({
        experimentId,
      });
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PeakDraftRow[] | null>(null);

  const serverRows = useMemo(
    () => peakRowsFromServer(peaksQuery.data ?? []),
    [peaksQuery.data],
  );

  useEffect(() => {
    if (!isEditing) {
      setDraft(null);
    }
  }, [isEditing]);

  const beginEdit = useCallback(() => {
    setDraft(serverRows.map((row) => ({ ...row })));
    setIsEditing(true);
  }, [serverRows]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(null);
  }, []);

  const updateDraftRow = useCallback(
    (id: string, patch: Partial<Pick<PeakDraftRow, "energy" | "peakKind">>) => {
      setDraft((current) => {
        if (!current) return current;
        return current.map((row) =>
          row.id === id ? { ...row, ...patch } : row,
        );
      });
    },
    [],
  );

  const removeDraftRow = useCallback((id: string) => {
    setDraft((current) =>
      current == null ? current : current.filter((row) => row.id !== id),
    );
  }, []);

  const addDraftRow = useCallback(() => {
    setDraft((current) => {
      const base = current ?? [];
      const energy =
        base.length > 0
          ? Math.round((base[base.length - 1]!.energy + 1) * 100) / 100
          : 285;
      return [
        ...base,
        {
          id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          energy,
          intensity: null,
          peakKind: "pi-star",
        },
      ];
    });
  }, []);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    try {
      await replacePeaksets.mutateAsync({
        experimentId,
        peaks: draft.map((row) => ({
          energy: row.energy,
          intensity: row.intensity ?? undefined,
          peakKind: row.peakKind,
        })),
      });
      showToast("Saved peak assignments", "success");
      setIsEditing(false);
      setDraft(null);
      onPeaksSaved?.();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not save peak assignments",
        "error",
      );
    }
  }, [draft, experimentId, onPeaksSaved, replacePeaksets]);

  if (peaksQuery.isLoading || canEditQuery.isLoading) {
    return peaksSkeleton();
  }

  if (peaksQuery.isError) {
    return (
      <p className="text-muted text-sm">
        Could not load peak assignments for this experiment.
      </p>
    );
  }

  const rows: PeakDraftRow[] = isEditing && draft ? draft : serverRows;
  const saveBusy = replacePeaksets.isPending;

  return (
    <div
      className="flex w-full flex-col gap-4 py-1"
      data-testid="nexafs-experiment-peaks-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SampleMetadataPanelHeading
          title="Peak assignments"
          description={
            canEdit && isEditing
              ? "Edit peak energies and resonance kinds, then save to update this dataset."
              : "Resonance peak markers stored with this experiment, ordered by energy."
          }
        />
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                {onRequestPlotPeakEdit ? (
                  <DefaultButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onPress={onRequestPlotPeakEdit}
                  >
                    Edit on plot
                  </DefaultButton>
                ) : null}
                <DefaultButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onPress={cancelEdit}
                  isDisabled={saveBusy}
                >
                  Cancel
                </DefaultButton>
                <Button
                  type="button"
                  size="sm"
                  onPress={() => {
                    void saveDraft();
                  }}
                  isDisabled={saveBusy}
                >
                  {saveBusy ? "Saving..." : "Save peaks"}
                </Button>
              </>
            ) : (
              <DefaultButton
                type="button"
                variant="outline"
                size="sm"
                onPress={beginEdit}
              >
                <PencilIcon className="h-4 w-4" aria-hidden />
                Edit
              </DefaultButton>
            )}
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">
          No peak assignments are recorded for this dataset.
          {canEdit && isEditing
            ? " Add a peak below or edit peaks on the graph."
            : ""}
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
              <tr>
                <th className="px-4 py-3" scope="col">
                  Energy (eV)
                </th>
                <th className="px-4 py-3" scope="col">
                  Assignment
                </th>
                <th className="px-4 py-3" scope="col">
                  Intensity
                </th>
                {isEditing ? (
                  <th className="px-4 py-3" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const kindLabel =
                  labelForPeakKind(row.peakKind) ||
                  unicodeShortLabelForPeakKind(row.peakKind);
                const hasLegacyKind =
                  row.peakKind != null &&
                  row.peakKind !== "" &&
                  row.peakKind !== "pi-star" &&
                  row.peakKind !== "sigma-star";
                return (
                  <tr
                    key={row.id}
                    className="border-border border-t odd:bg-[var(--surface-2)] even:bg-[var(--surface-3)]"
                  >
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          className="border-border bg-surface text-foreground w-28 rounded-md border px-2 py-1 font-mono text-sm tabular-nums"
                          value={row.energy}
                          aria-label={`Peak energy for ${row.id}`}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            updateDraftRow(row.id, {
                              energy: Math.round(next * 100) / 100,
                            });
                          }}
                        />
                      ) : (
                        row.energy.toFixed(2)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          className="border-border bg-surface text-foreground max-w-[14rem] rounded-md border px-2 py-1 text-sm"
                          value={
                            row.peakKind == null || row.peakKind === ""
                              ? "none"
                              : hasLegacyKind
                                ? "__keep__"
                                : row.peakKind
                          }
                          aria-label={`Peak assignment for ${row.energy} eV`}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === "__keep__") return;
                            updateDraftRow(row.id, {
                              peakKind: raw === "none" ? null : raw,
                            });
                          }}
                        >
                          <option value="none">{"\u2014"}</option>
                          {hasLegacyKind && row.peakKind ? (
                            <option value="__keep__">
                              {unicodeShortLabelForPeakKind(row.peakKind)}{" "}
                              (keep)
                            </option>
                          ) : null}
                          {NEXAFS_PEAK_KIND_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.unicodeShort} — {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span title={kindLabel || undefined}>
                          {unicodeShortLabelForPeakKind(row.peakKind)}
                          {kindLabel ? (
                            <span className="text-muted ml-2 text-xs font-normal normal-case">
                              {kindLabel}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {row.intensity == null
                        ? "\u2014"
                        : row.intensity.toPrecision(4)}
                    </td>
                    {isEditing ? (
                      <td className="px-4 py-3 text-right">
                        <DefaultButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onPress={() => removeDraftRow(row.id)}
                        >
                          Remove
                        </DefaultButton>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isEditing ? (
        <div className="flex flex-wrap gap-2">
          <DefaultButton
            type="button"
            variant="outline"
            size="sm"
            onPress={addDraftRow}
          >
            Add peak
          </DefaultButton>
        </div>
      ) : null}
    </div>
  );
}
