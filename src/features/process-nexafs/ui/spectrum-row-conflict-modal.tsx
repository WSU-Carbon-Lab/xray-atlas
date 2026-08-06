"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DefaultButton as Button } from "~/components/ui/button";
import { SimpleDialog } from "~/components/ui/dialog";
import { Label, Description } from "@heroui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  averageSpectrumEnergyConflictRows,
  detectSpectrumEnergyConflictGroups,
  hasSpectrumEnergyConflicts,
  type SpectrumEnergyConflictResolutionChoice,
  type SpectrumEnergyConflictGroup,
  spectrumEnergyConflictGroupKey,
} from "~/lib/nexafs/spectrumPointEnergyUniqueness";
import type { SpectrumPoint } from "~/components/plots/types";
import { formatStatNumber } from "~/features/process-nexafs/utils/core";

type SpectrumRowConflictModalProps = {
  isOpen: boolean;
  fileName: string;
  groups: SpectrumEnergyConflictGroup[];
  onClose: () => void;
  onResolve: (
    resolutionByGroupKey: Map<string, SpectrumEnergyConflictResolutionChoice>,
  ) => void;
};

function formatOptionalChannel(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return formatStatNumber(value);
}

function groupGeometryLabel(theta: number, phi: number): string {
  return `theta=${theta} deg, phi=${phi} deg`;
}

function choicesEqual(
  a: SpectrumEnergyConflictResolutionChoice | undefined,
  b: SpectrumEnergyConflictResolutionChoice,
): boolean {
  if (!a) {
    return false;
  }
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "average") {
    return b.kind === "average";
  }
  return b.kind === "keep-row" && a.pointIndex === b.pointIndex;
}

function choiceInputId(
  groupKey: string,
  choice: SpectrumEnergyConflictResolutionChoice,
): string {
  return choice.kind === "average"
    ? `${groupKey}-average`
    : `${groupKey}-${choice.pointIndex}`;
}

function formatChannelSummary(group: {
  absorption: number;
  od?: number;
  massabsorption?: number;
  beta?: number;
}): string {
  const channels = [
    `mu ${formatOptionalChannel(group.absorption)}`,
    group.od !== undefined ? `OD ${formatOptionalChannel(group.od)}` : null,
    group.massabsorption !== undefined
      ? `mass abs ${formatOptionalChannel(group.massabsorption)}`
      : null,
    group.beta !== undefined ? `beta ${formatOptionalChannel(group.beta)}` : null,
  ].filter((value): value is string => value !== null);
  return channels.join(" · ");
}

type SpectrumEnergyConflictBannerProps = {
  fileName: string;
  spectrumPoints: readonly SpectrumPoint[];
  onResolvePress: () => void;
};

/**
 * Inline alert shown when duplicate-energy conflicts remain after the resolution
 * modal is dismissed; offers one click to reopen the conflict picker.
 */
export function SpectrumEnergyConflictBanner({
  fileName,
  spectrumPoints,
  onResolvePress,
}: SpectrumEnergyConflictBannerProps) {
  if (!hasSpectrumEnergyConflicts(spectrumPoints)) {
    return null;
  }

  const groupCount = detectSpectrumEnergyConflictGroups(spectrumPoints).length;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-danger mb-3 flex flex-col gap-3 rounded-lg border bg-danger/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-danger-soft-hover text-danger mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
          <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <Label className="text-danger block text-sm font-semibold">
            Duplicate photon energies need resolution
          </Label>
          <Description className="text-muted mt-0.5 block text-sm">
            {fileName} has {groupCount} conflicting energy group
            {groupCount === 1 ? "" : "s"}. Choose a source row or merge to an
            averaged row before submitting.
          </Description>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="shrink-0 self-start sm:self-center"
        onPress={onResolvePress}
      >
        Resolve duplicate energies
      </Button>
    </div>
  );
}

/**
 * Modal that lets contributors pick one spectrum row to keep for each
 * geometry/energy cluster with conflicting duplicate photon energies.
 */
export function SpectrumRowConflictModal({
  isOpen,
  fileName,
  groups,
  onClose,
  onResolve,
}: SpectrumRowConflictModalProps) {
  const [selections, setSelections] = useState<
    Map<string, SpectrumEnergyConflictResolutionChoice>
  >(
    () => new Map(),
  );

  useEffect(() => {
    if (!isOpen) return;
    const initial = new Map<string, SpectrumEnergyConflictResolutionChoice>();
    for (const group of groups) {
      const key = spectrumEnergyConflictGroupKey(
        group.theta,
        group.phi,
        group.energy,
      );
      const firstRow = group.rows[0];
      if (firstRow) {
        initial.set(key, { kind: "keep-row", pointIndex: firstRow.pointIndex });
      }
    }
    setSelections(initial);
  }, [groups, isOpen]);

  const groupsByGeometry = useMemo(() => {
    const map = new Map<string, SpectrumEnergyConflictGroup[]>();
    for (const group of groups) {
      const geometryKey = `${group.theta}:${group.phi}`;
      const list = map.get(geometryKey);
      if (list) {
        list.push(group);
      } else {
        map.set(geometryKey, [group]);
      }
    }
    return map;
  }, [groups]);

  const setSelection = useCallback(
    (groupKey: string, choice: SpectrumEnergyConflictResolutionChoice) => {
      setSelections((prev) => {
        const next = new Map(prev);
        next.set(groupKey, choice);
        return next;
      });
    },
    [],
  );

  const applyBulkKeep = useCallback(
    (pick: "first" | "last" | "average") => {
      setSelections(() => {
        const next = new Map<string, SpectrumEnergyConflictResolutionChoice>();
        for (const group of groups) {
          const key = spectrumEnergyConflictGroupKey(
            group.theta,
            group.phi,
            group.energy,
          );
          if (pick === "average") {
            next.set(key, { kind: "average" });
            continue;
          }
          const targetRow =
            pick === "first" ? group.rows[0] : group.rows[group.rows.length - 1];
          if (targetRow) {
            next.set(key, { kind: "keep-row", pointIndex: targetRow.pointIndex });
          }
        }
        return next;
      });
    },
    [groups],
  );

  const allGroupsSelected = groups.every((group) => {
    const key = spectrumEnergyConflictGroupKey(
      group.theta,
      group.phi,
      group.energy,
    );
    return selections.has(key);
  });

  const handleApply = () => {
    onResolve(new Map(selections));
  };

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve duplicate energies"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 text-left">
        <Description className="text-muted block text-sm">
          {fileName} has rows that share the same photon energy within one
          polarization but carry different values. Keep one source row or merge
          the conflicting rows into one averaged row for this upload.
        </Description>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={() => applyBulkKeep("first")}
          >
            Keep first row in each group
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={() => applyBulkKeep("last")}
          >
            Keep last row in each group
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={() => applyBulkKeep("average")}
          >
            Average each group
          </Button>
        </div>

        <div className="space-y-5">
          {[...groupsByGeometry.entries()].map(([geometryKey, geometryGroups]) => {
            const [thetaRaw, phiRaw] = geometryKey.split(":");
            const theta = Number(thetaRaw);
            const phi = Number(phiRaw);
            return (
              <section
                key={geometryKey}
                aria-labelledby={`conflict-geometry-${geometryKey}`}
                className="border-border rounded-lg border"
              >
                <div
                  id={`conflict-geometry-${geometryKey}`}
                  className="border-border bg-surface-secondary border-b px-3 py-2 text-sm font-semibold"
                >
                  {groupGeometryLabel(theta, phi)}
                </div>
                <div className="divide-border divide-y">
                  {geometryGroups.map((group) => {
                    const groupKey = spectrumEnergyConflictGroupKey(
                      group.theta,
                      group.phi,
                      group.energy,
                    );
                    const selectedChoice = selections.get(groupKey);
                    const averageRow = averageSpectrumEnergyConflictRows(
                      group.rows.map((row) => ({
                        ...row,
                        energy: group.energy,
                        theta: group.theta,
                        phi: group.phi,
                      })),
                    );
                    return (
                      <div key={groupKey} className="space-y-2 px-3 py-3">
                        <Label className="text-foreground block text-sm font-medium">
                          {formatStatNumber(group.energy)} eV
                        </Label>
                        <div
                          role="radiogroup"
                          aria-label={`Keep one row at ${group.energy} eV for ${groupGeometryLabel(group.theta, group.phi)}`}
                          className="space-y-2"
                        >
                          {group.rows.map((row) => {
                            const choice: SpectrumEnergyConflictResolutionChoice = {
                              kind: "keep-row",
                              pointIndex: row.pointIndex,
                            };
                            const inputId = choiceInputId(groupKey, choice);
                            const checked = choicesEqual(selectedChoice, choice);
                            return (
                              <label
                                key={inputId}
                                htmlFor={inputId}
                                className={`border-border flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm ${
                                  checked
                                    ? "border-accent bg-accent/10"
                                    : "bg-surface"
                                }`}
                              >
                                <input
                                  id={inputId}
                                  type="radio"
                                  name={groupKey}
                                  className="mt-1"
                                  checked={checked}
                                  onChange={() =>
                                    setSelection(groupKey, choice)
                                  }
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="text-foreground block font-medium">
                                    {group.rows.length === 2 && row === group.rows[0]
                                      ? `First row (${row.pointIndex + 1})`
                                      : group.rows.length === 2 &&
                                          row === group.rows[1]
                                        ? `Second row (${row.pointIndex + 1})`
                                        : `Row ${row.pointIndex + 1}`}
                                  </span>
                                  <span className="text-muted mt-0.5 block text-xs">
                                    {formatChannelSummary(row)}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                          {averageRow ? (
                            <label
                              htmlFor={choiceInputId(groupKey, { kind: "average" })}
                              className={`border-border flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm ${
                                choicesEqual(selectedChoice, { kind: "average" })
                                  ? "border-accent bg-accent/10"
                                  : "bg-surface"
                              }`}
                            >
                              <input
                                id={choiceInputId(groupKey, { kind: "average" })}
                                type="radio"
                                name={groupKey}
                                className="mt-1"
                                checked={choicesEqual(selectedChoice, {
                                  kind: "average",
                                })}
                                onChange={() =>
                                  setSelection(groupKey, { kind: "average" })
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span className="text-foreground block font-medium">
                                  Average merged row
                                </span>
                                <span className="text-muted mt-0.5 block text-xs">
                                  {formatChannelSummary(averageRow)}
                                </span>
                                <span className="text-muted mt-1 block text-[11px]">
                                  Averaged across {group.rows.length} conflicting row
                                  {group.rows.length === 1 ? "" : "s"}.
                                </span>
                              </span>
                            </label>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onPress={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            isDisabled={!allGroupsSelected || groups.length === 0}
            onPress={handleApply}
          >
            Apply resolution
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}
