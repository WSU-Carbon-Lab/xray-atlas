"use client";

import { useState } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { Accordion, AccordionItem, NumberInput } from "@heroui/react";
import { DefaultButton as Button } from "~/app/components/Button";
import type { PeakData } from "~/app/contribute/nexafs/types";
import {
  detectPeaks,
  convertToPeakData,
} from "~/app/contribute/nexafs/utils/peakDetection";
import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";

const BOND_OPTIONS = [
  { value: "", label: "Select bond..." },
  { value: "C=C", label: "C=C" },
  { value: "C-O", label: "C-O" },
  { value: "C-N", label: "C-N" },
  { value: "C=N", label: "C=N" },
  { value: "Other", label: "Other" },
];

const TRANSITION_OPTIONS = [
  { value: "", label: "Select transition..." },
  { value: "π*", label: "π*" },
  { value: "σ*", label: "σ*" },
  { value: "Rydberg", label: "Rydberg" },
  { value: "Other", label: "Other" },
];

interface AnalysisToolbarProps {
  hasMolecule: boolean;
  hasData: boolean;
  hasNormalization: boolean;
  normalizationLocked: boolean;
  onPreEdgeSelect: () => void;
  onPostEdgeSelect: () => void;
  onToggleLock: () => void;
  isSelectingPreEdge: boolean;
  isSelectingPostEdge: boolean;
  normalizationRegions: {
    pre: [number, number] | null;
    post: [number, number] | null;
  };
  onNormalizationRegionChange?: (
    type: "pre" | "post",
    range: [number, number],
  ) => void;
  peaks: PeakData[];
  spectrumPoints: SpectrumPoint[];
  normalizedPoints: SpectrumPoint[] | null;
  selectedPeakId: string | null;
  onPeaksChange: (peaks: PeakData[]) => void;
  onPeakSelect: (peakId: string | null) => void;
  onPeakUpdate: (peakId: string, energy: number) => void;
}

export function AnalysisToolbar({
  hasMolecule,
  hasData,
  hasNormalization,
  normalizationLocked,
  onPreEdgeSelect,
  onPostEdgeSelect,
  onToggleLock,
  isSelectingPreEdge,
  isSelectingPostEdge,
  normalizationRegions,
  onNormalizationRegionChange,
  peaks,
  spectrumPoints,
  normalizedPoints,
  selectedPeakId,
  onPeaksChange,
  onPeakSelect,
  onPeakUpdate,
}: AnalysisToolbarProps) {
  const [isAddingPeak, setIsAddingPeak] = useState(false);
  const [newPeakEnergy, setNewPeakEnergy] = useState("");
  const [newPeakBond, setNewPeakBond] = useState("");
  const [newPeakTransition, setNewPeakTransition] = useState("");

  const handleAutoDetectPeaks = () => {
    const pointsToAnalyze = normalizedPoints ?? spectrumPoints;

    if (pointsToAnalyze.length === 0) {
      return;
    }

    const detected = detectPeaks(pointsToAnalyze, {
      minProminence: 0.05,
    });

    const newPeaks = convertToPeakData(detected).map((peak, index) => ({
      ...peak,
      id: `peak-${Date.now()}-${index}`,
    }));

    onPeaksChange([...peaks, ...newPeaks]);
  };

  const handleAddPeak = () => {
    const energy = parseFloat(newPeakEnergy);
    if (!Number.isFinite(energy)) {
      return;
    }

    const newPeak = {
      energy,
      bond: newPeakBond || undefined,
      transition: newPeakTransition || undefined,
      id: `peak-${Date.now()}`,
    } as PeakData & { id: string };

    onPeaksChange([...peaks, newPeak]);
    setIsAddingPeak(false);
    setNewPeakEnergy("");
    setNewPeakBond("");
    setNewPeakTransition("");
  };

  const handleUpdatePeak = (index: number, updates: Partial<PeakData>) => {
    const updated = [...peaks];
    const peak = updated[index];
    if (!peak) return;

    updated[index] = { ...peak, ...updates };
    onPeaksChange(updated);

    if (
      updates.energy !== undefined &&
      "id" in peak &&
      typeof (peak as { id?: string }).id === "string"
    ) {
      onPeakUpdate((peak as { id: string }).id, updates.energy);
    }
  };

  const handleDeletePeak = (index: number) => {
    const peak = peaks[index];
    if (peak && "id" in peak && peak.id === selectedPeakId) {
      onPeakSelect(null);
    }
    onPeaksChange(peaks.filter((_, i) => i !== index));
  };

  const handlePreEdgeRangeChange = (index: 0 | 1, value: number) => {
    const current = normalizationRegions.pre;
    if (!current || !onNormalizationRegionChange) return;
    const rounded = Math.round(value * 100) / 100;
    const updated: [number, number] =
      index === 0 ? [rounded, current[1]] : [current[0], rounded];
    onNormalizationRegionChange("pre", updated);
  };

  const handlePostEdgeRangeChange = (index: 0 | 1, value: number) => {
    const current = normalizationRegions.post;
    if (!current || !onNormalizationRegionChange) return;
    const rounded = Math.round(value * 100) / 100;
    const updated: [number, number] =
      index === 0 ? [rounded, current[1]] : [current[0], rounded];
    onNormalizationRegionChange("post", updated);
  };

  return (
    <div
      className="w-64 shrink-0 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      style={{ minHeight: "532px" }}
    >
      <div className="flex flex-col p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Analysis Tools
        </h3>

        {!hasMolecule && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Select a molecule</strong> to enable normalization
                tools.
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <Accordion
            defaultExpandedKeys={["normalize", "peaks"]}
            variant="bordered"
            className="w-full"
          >
            {/* Normalization Section */}
            <AccordionItem
              key="normalize"
              title="Normalize"
              aria-label="Normalize spectrum"
            >
              <div className="space-y-4 pt-2">
                {/* Nested Pre Edge Section */}
                <Accordion
                  defaultExpandedKeys={[]}
                  variant="light"
                  className="w-full"
                >
                  <AccordionItem
                    key="pre-edge"
                    title="Pre Edge"
                    aria-label="Pre edge normalization"
                  >
                    <div className="space-y-3 pt-2">
                      <Button
                        type="button"
                        variant={isSelectingPreEdge ? "solid" : "bordered"}
                        size="sm"
                        onClick={onPreEdgeSelect}
                        disabled={!hasMolecule || !hasData}
                        color={isSelectingPreEdge ? "primary" : "default"}
                        className={`w-full justify-start ${
                          isSelectingPreEdge ? "bg-blue-500 text-white" : ""
                        } ${!hasMolecule || !hasData ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <PencilIcon className="mr-2 h-4 w-4" />
                        {isSelectingPreEdge
                          ? "Drawing on plot..."
                          : "Draw on plot"}
                      </Button>

                      {/* Energy Range Inputs */}
                      {normalizationRegions.pre && (
                        <div className="space-y-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                Min (eV)
                              </label>
                              <NumberInput
                                size="sm"
                                variant="bordered"
                                value={
                                  Math.round(
                                    normalizationRegions.pre[0] * 100,
                                  ) / 100
                                }
                                onValueChange={(value) =>
                                  handlePreEdgeRangeChange(0, value)
                                }
                                step={0.01}
                                minValue={0}
                                classNames={{
                                  base: "w-full",
                                  input: "text-xs",
                                }}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                Max (eV)
                              </label>
                              <NumberInput
                                size="sm"
                                variant="bordered"
                                value={
                                  Math.round(
                                    normalizationRegions.pre[1] * 100,
                                  ) / 100
                                }
                                onValueChange={(value) =>
                                  handlePreEdgeRangeChange(1, value)
                                }
                                step={0.01}
                                minValue={0}
                                classNames={{
                                  base: "w-full",
                                  input: "text-xs",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                </Accordion>

                {/* Nested Post Edge Section */}
                <Accordion
                  defaultExpandedKeys={[]}
                  variant="light"
                  className="w-full"
                >
                  <AccordionItem
                    key="post-edge"
                    title="Post Edge"
                    aria-label="Post edge normalization"
                  >
                    <div className="space-y-3 pt-2">
                      <Button
                        type="button"
                        variant={isSelectingPostEdge ? "solid" : "bordered"}
                        size="sm"
                        onClick={onPostEdgeSelect}
                        disabled={!hasMolecule || !hasData}
                        color={isSelectingPostEdge ? "success" : "default"}
                        className={`w-full justify-start ${
                          isSelectingPostEdge ? "bg-green-500 text-white" : ""
                        } ${!hasMolecule || !hasData ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <PencilIcon className="mr-2 h-4 w-4" />
                        {isSelectingPostEdge
                          ? "Drawing on plot..."
                          : "Draw on plot"}
                      </Button>

                      {/* Energy Range Inputs */}
                      {normalizationRegions.post && (
                        <div className="space-y-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                Min (eV)
                              </label>
                              <NumberInput
                                size="sm"
                                variant="bordered"
                                value={
                                  Math.round(
                                    normalizationRegions.post[0] * 100,
                                  ) / 100
                                }
                                onValueChange={(value) =>
                                  handlePostEdgeRangeChange(0, value)
                                }
                                step={0.01}
                                minValue={0}
                                classNames={{
                                  base: "w-full",
                                  input: "text-xs",
                                }}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                Max (eV)
                              </label>
                              <NumberInput
                                size="sm"
                                variant="bordered"
                                value={
                                  Math.round(
                                    normalizationRegions.post[1] * 100,
                                  ) / 100
                                }
                                onValueChange={(value) =>
                                  handlePostEdgeRangeChange(1, value)
                                }
                                step={0.01}
                                minValue={0}
                                classNames={{
                                  base: "w-full",
                                  input: "text-xs",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                </Accordion>

                {/* Lock Section */}
                {hasNormalization && (
                  <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="bordered"
                      size="sm"
                      onClick={onToggleLock}
                      disabled={!hasNormalization}
                      className="w-full justify-start"
                    >
                      {normalizationLocked ? (
                        <>
                          <LockClosedIcon className="mr-2 h-4 w-4" />
                          Unlock
                        </>
                      ) : (
                        <>
                          <LockOpenIcon className="mr-2 h-4 w-4" />
                          Lock
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </AccordionItem>

            {/* Identify Peaks Section */}
            <AccordionItem
              key="peaks"
              title={`Identify Peaks (${peaks.length})`}
              aria-label="Identify peaks"
            >
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2 rounded-lg bg-blue-50/50 p-2 text-xs text-gray-600 dark:bg-blue-900/10 dark:text-gray-400">
                  <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    You can drag existing peaks on the plot to adjust.
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="bordered"
                    size="sm"
                    onClick={handleAutoDetectPeaks}
                    disabled={spectrumPoints.length === 0}
                    className="flex-1 text-xs"
                  >
                    Auto-detect
                  </Button>
                  <Button
                    type="button"
                    variant="bordered"
                    size="sm"
                    onClick={() => setIsAddingPeak(true)}
                    disabled={spectrumPoints.length === 0}
                    className="w-8 shrink-0 p-0"
                    title="Add peak manually"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {peaks.length === 0 && !isAddingPeak && (
                  <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    No peaks identified. Click &quot;Auto-detect&quot; or add
                    manually.
                  </div>
                )}

                {peaks.length > 0 && (
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {peaks.map((peak, index) => {
                      const peakId: string =
                        "id" in peak &&
                        typeof (peak as { id?: string }).id === "string"
                          ? (peak as { id: string }).id
                          : `peak-${index}`;
                      const isSelected = selectedPeakId === peakId;
                      return (
                        <div
                          key={peakId}
                          className={`flex items-start gap-2 rounded-lg border p-2 ${
                            isSelected
                              ? "border-wsu-crimson bg-wsu-crimson/5 dark:border-wsu-crimson dark:bg-wsu-crimson/10"
                              : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
                          }`}
                          onClick={() =>
                            onPeakSelect(isSelected ? null : peakId)
                          }
                        >
                          <div className="flex-1 space-y-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                Energy (eV)
                              </label>
                              <NumberInput
                                size="sm"
                                variant="bordered"
                                value={Math.round(peak.energy * 100) / 100}
                                onValueChange={(value) => {
                                  const rounded = Math.round(value * 100) / 100;
                                  if (Number.isFinite(rounded)) {
                                    handleUpdatePeak(index, {
                                      energy: rounded,
                                    });
                                  }
                                }}
                                step={0.01}
                                minValue={0}
                                classNames={{
                                  base: "w-full",
                                  input: "text-xs",
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Bond
                                </label>
                                <select
                                  value={peak.bond ?? ""}
                                  onChange={(e) =>
                                    handleUpdatePeak(index, {
                                      bond: e.target.value || undefined,
                                    })
                                  }
                                  className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                  {BOND_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Transition
                                </label>
                                <select
                                  value={peak.transition ?? ""}
                                  onChange={(e) =>
                                    handleUpdatePeak(index, {
                                      transition: e.target.value || undefined,
                                    })
                                  }
                                  className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                  {TRANSITION_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePeak(index);
                            }}
                            className="rounded p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete peak"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isAddingPeak && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Energy (eV) <span className="text-red-500">*</span>
                        </label>
                        <NumberInput
                          size="sm"
                          variant="bordered"
                          value={
                            newPeakEnergy
                              ? parseFloat(newPeakEnergy)
                              : undefined
                          }
                          onValueChange={(value) =>
                            setNewPeakEnergy(value.toString())
                          }
                          step={0.01}
                          minValue={0}
                          placeholder="e.g., 285.0"
                          label="Energy (eV)"
                          labelPlacement="outside"
                          classNames={{
                            base: "w-full",
                            input: "text-xs",
                            label: "text-xs font-medium",
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Bond
                          </label>
                          <select
                            value={newPeakBond}
                            onChange={(e) => setNewPeakBond(e.target.value)}
                            className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          >
                            {BOND_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Transition
                          </label>
                          <select
                            value={newPeakTransition}
                            onChange={(e) =>
                              setNewPeakTransition(e.target.value)
                            }
                            className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          >
                            {TRANSITION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="solid"
                          size="sm"
                          onClick={handleAddPeak}
                          disabled={
                            !newPeakEnergy ||
                            !Number.isFinite(parseFloat(newPeakEnergy))
                          }
                          className="flex-1"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="bordered"
                          size="sm"
                          onClick={() => {
                            setIsAddingPeak(false);
                            setNewPeakEnergy("");
                            setNewPeakBond("");
                            setNewPeakTransition("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
