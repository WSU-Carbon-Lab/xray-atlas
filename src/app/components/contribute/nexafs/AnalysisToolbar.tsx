"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  InformationCircleIcon,
  PencilIcon,
  Square3Stack3DIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Mountain,
  ArrowLeftToLine,
  ArrowRightToLine,
} from "lucide-react";
import {
  NumberInput,
  Tooltip,
  Slider,
  ScrollShadow,
  Badge,
} from "@heroui/react";
import { DefaultButton as Button } from "~/app/components/Button";
import { SubToolButton } from "./SubToolButton";
import type {
  PeakData,
  NormalizationType,
} from "~/app/contribute/nexafs/types";
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
  normalizationType: NormalizationType;
  onNormalizationTypeChange: (type: NormalizationType) => void;
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
  onPeakAdd?: (energy: number) => void;
  isManualPeakMode?: boolean;
  onManualPeakModeChange?: (enabled: boolean) => void;
}

export function AnalysisToolbar({
  hasMolecule,
  hasData,
  hasNormalization,
  normalizationLocked,
  normalizationType,
  onNormalizationTypeChange,
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
  onPeakAdd: _onPeakAdd,
  isManualPeakMode: externalManualPeakMode,
  onManualPeakModeChange,
}: AnalysisToolbarProps) {
  const [internalManualPeakMode, setInternalManualPeakMode] = useState(false);
  const isManualPeakMode = externalManualPeakMode ?? internalManualPeakMode;
  const [selectedTool, setSelectedTool] = useState<"normalize" | "peaks">("normalize");
  const [peakDetectionMode, setPeakDetectionMode] = useState<"auto" | "manual" | null>(null);
  const peakDetectionModeRef = useRef(peakDetectionMode);

  // Keep ref in sync with state
  useEffect(() => {
    peakDetectionModeRef.current = peakDetectionMode;
  }, [peakDetectionMode]);

  // Sync peakDetectionMode with external isManualPeakMode
  useEffect(() => {
    if (externalManualPeakMode !== undefined) {
      if (externalManualPeakMode) {
        setPeakDetectionMode("manual");
      } else if (peakDetectionModeRef.current === "manual") {
        // Only clear if it was manual, don't override auto
        setPeakDetectionMode(null);
      }
    }
  }, [externalManualPeakMode]);
  const [isAddingPeak, setIsAddingPeak] = useState(false);
  const [newPeakEnergy, setNewPeakEnergy] = useState("");
  const [newPeakBond, setNewPeakBond] = useState("");
  const [newPeakTransition, setNewPeakTransition] = useState("");
  const [peakParams, setPeakParams] = useState<{
    minProminence?: number;
    minDistance?: number;
    width?: number;
    height?: number;
    threshold?: number;
  }>({
    minProminence: 0.05, // Reasonable default, not scipy default but commonly used
    // minDistance, width, height, threshold default to undefined (scipy None)
  });

  // Track which peaks are auto-detected vs manually added
  const [_autoDetectedPeakIds, setAutoDetectedPeakIds] = useState<Set<string>>(
    new Set(),
  );

  // Build peak detection options from params
  const buildPeakOptions = useMemo(() => {
    const options: {
      minProminence?: number;
      minDistance?: number;
      width?: number;
      height?: number;
      threshold?: number;
    } = {};

    if (peakParams.minProminence !== undefined && peakParams.minProminence > 0) {
      options.minProminence = peakParams.minProminence;
    }
    if (peakParams.minDistance !== undefined && peakParams.minDistance > 0) {
      options.minDistance = peakParams.minDistance;
    }
    if (peakParams.width !== undefined && peakParams.width > 0) {
      options.width = peakParams.width;
    }
    if (peakParams.height !== undefined && peakParams.height > 0) {
      options.height = peakParams.height;
    }
    if (peakParams.threshold !== undefined && peakParams.threshold > 0) {
      options.threshold = peakParams.threshold;
    }

    return options;
  }, [peakParams]);

  // Auto-update peaks when peakParams change and auto-detect mode is active
  useEffect(() => {
    if (peakDetectionMode !== "auto") {
      return;
    }

    const pointsToAnalyze = normalizedPoints ?? spectrumPoints;
    if (pointsToAnalyze.length === 0) {
      return;
    }

    const detected = detectPeaks(pointsToAnalyze, buildPeakOptions);
    const newPeaks = convertToPeakData(detected).map((peak, index) => ({
      ...peak,
      id: `peak-auto-${Date.now()}-${index}`,
    }));

    const newAutoDetectedIds = new Set(
      newPeaks
        .map((p) => ("id" in p && typeof p.id === "string" ? p.id : ""))
        .filter(Boolean),
    );
    setAutoDetectedPeakIds(newAutoDetectedIds);

    // Get current manual peaks (not in newAutoDetectedIds)
    // Use newAutoDetectedIds instead of autoDetectedPeakIds to avoid stale closure
    const currentManualPeaks = peaks.filter(
      (peak) =>
        "id" in peak &&
        typeof (peak as { id?: string }).id === "string" &&
        !newAutoDetectedIds.has((peak as { id: string }).id),
    );

    // Replace only auto-detected peaks, keep manual ones
    onPeaksChange([...currentManualPeaks, ...newPeaks]);
  }, [peakParams.minProminence, peakParams.minDistance, peakParams.width, peakParams.height, peakParams.threshold, peakDetectionMode, normalizedPoints, spectrumPoints, buildPeakOptions, peaks, onPeaksChange]);

  const handleAutoDetectPeaks = () => {
    // Set auto-detect as the active mode
    setPeakDetectionMode("auto");
    // Peak detection will be triggered by the useEffect above
  };

  const handleManualPeakMode = () => {
    const newMode = !isManualPeakMode;
    // Set manual as the active mode when enabling, clear when disabling
    if (newMode) {
      setPeakDetectionMode("manual");
    } else {
      setPeakDetectionMode(null);
    }
    if (onManualPeakModeChange) {
      onManualPeakModeChange(newMode);
    } else {
      setInternalManualPeakMode(newMode);
    }
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
      id: `peak-manual-${Date.now()}`,
    } as PeakData & { id: string };

    // Manual peaks are not in autoDetectedPeakIds, so they'll be preserved
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
      style={{ height: "532px" }}
    >
      <div className="flex flex-col p-4">
        {/* Horizontal Icon Toolbar */}
        <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <Tooltip
            content="Normalize spectrum using bare atom absorption or 0-1 mapping"
            placement="right"
            classNames={{
              base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedTool("normalize")}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                selectedTool === "normalize"
                  ? "border-wsu-crimson bg-gray-100 dark:bg-gray-700"
                  : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
              aria-label="Normalize spectrum"
            >
              <Square3Stack3DIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          </Tooltip>
          <Tooltip
            content="Identify peaks in spectrum using automatic detection or manual entry"
            placement="top"
            classNames={{
              base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
            }}
          >
            <Badge
              content={peaks.length}
              color="primary"
              size="sm"
              isInvisible={peaks.length === 0}
              shape="rectangle"
              showOutline={true}
              classNames={{
                base: "relative",
                badge: "bg-white text-gray-900 text-[10px] font-semibold h-4 min-w-4 px-1 rounded-full border border-gray-900 dark:border-gray-100",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedTool("peaks")}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  selectedTool === "peaks"
                    ? "border-wsu-crimson bg-gray-100 dark:bg-gray-700"
                    : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
                aria-label="Identify peaks"
              >
                <Mountain className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
            </Badge>
          </Tooltip>
        </div>

        {!hasMolecule && selectedTool === "normalize" && (
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
          {selectedTool === "normalize" && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Normalization
              </h3>
                {/* Normalization Type Selector */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Normalization Method
                  </label>
                  <select
                    value={normalizationType}
                    onChange={(e) =>
                      onNormalizationTypeChange(
                        e.target.value as NormalizationType,
                      )
                    }
                    disabled={normalizationLocked}
                    className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="bare-atom">Bare Atom</option>
                    <option value="zero-one">Absolute</option>
                  </select>
                  {normalizationType === "bare-atom" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Normalizes using bare atom absorption reference
                    </p>
                  )}
                  {normalizationType === "zero-one" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Maps pre-edge to 0 and post-edge to 1 (absolute normalization)
                    </p>
                  )}
                </div>

                {/* Three Toggle Buttons: Pre Edge, Post Edge, Lock */}
                <div className="flex items-center gap-2">
                  {/* Pre Edge Button */}
                  <SubToolButton
                    icon={<ArrowLeftToLine className="h-4 w-4" />}
                    label="Pre"
                    tooltip="Select pre-edge region"
                    isActive={isSelectingPreEdge}
                    onClick={onPreEdgeSelect}
                    disabled={!hasMolecule || !hasData}
                  />

                  {/* Post Edge Button */}
                  <SubToolButton
                    icon={<ArrowRightToLine className="h-4 w-4" />}
                    label="Post"
                    tooltip="Select post-edge region"
                    isActive={isSelectingPostEdge}
                    onClick={onPostEdgeSelect}
                    disabled={!hasMolecule || !hasData}
                  />

                  {/* Lock Button */}
                  {hasNormalization && (
                    <SubToolButton
                      icon={
                        normalizationLocked ? (
                          <LockClosedIcon className="h-4 w-4" />
                        ) : (
                          <LockOpenIcon className="h-4 w-4" />
                        )
                      }
                      tooltip={
                        normalizationLocked
                          ? "Unlock normalization"
                          : "Lock normalization"
                      }
                      isActive={normalizationLocked}
                      onClick={onToggleLock}
                      disabled={!hasNormalization}
                      iconOnly
                    />
                  )}
                </div>

                {/* Pre Edge Min/Max Inputs */}
                {isSelectingPreEdge && normalizationRegions.pre && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Min (eV)
                      </label>
                      <NumberInput
                        size="sm"
                        variant="bordered"
                        value={
                          Math.round(normalizationRegions.pre[0] * 100) / 100
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
                          Math.round(normalizationRegions.pre[1] * 100) / 100
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
                )}

                {/* Post Edge Min/Max Inputs */}
                {isSelectingPostEdge && normalizationRegions.post && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Min (eV)
                      </label>
                      <NumberInput
                        size="sm"
                        variant="bordered"
                        value={
                          Math.round(normalizationRegions.post[0] * 100) / 100
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
                          Math.round(normalizationRegions.post[1] * 100) / 100
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
                )}
            </div>
          )}

          {selectedTool === "peaks" && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Peak Detection
                </h3>
                <div className="space-y-3 shrink-0">
                  <div className="flex gap-2">
                    <SubToolButton
                      icon={<SparklesIcon className="h-4 w-4" />}
                      tooltip="Auto-detect peaks"
                      isActive={peakDetectionMode === "auto"}
                      onClick={handleAutoDetectPeaks}
                      disabled={spectrumPoints.length === 0}
                      iconOnly
                    />
                    <SubToolButton
                      icon={<PencilIcon className="h-4 w-4" />}
                      tooltip="Click on plot to add peaks manually"
                      isActive={peakDetectionMode === "manual"}
                      onClick={handleManualPeakMode}
                      disabled={spectrumPoints.length === 0}
                      iconOnly
                    />
                  </div>

                  {/* Peak Detection Settings - shown only when auto-detect mode is active */}
                  {peakDetectionMode === "auto" && (
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                      <Tooltip
                        content="Minimum prominence as fraction of max intensity"
                        placement="top"
                        classNames={{
                          base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
                        }}
                      >
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 cursor-help mb-2">
                          Prominence: {(peakParams.minProminence ?? 0.05).toFixed(2)}
                        </label>
                      </Tooltip>
                      <div className="w-full py-2">
                        <Slider
                          size="sm"
                          step={0.01}
                          minValue={0}
                          maxValue={1}
                          value={peakParams.minProminence ?? 0.05}
                          onChange={(value) => {
                            const numValue = typeof value === "number"
                              ? value
                              : (Array.isArray(value) && value.length > 0
                                ? value[0]
                                : 0.05);
                            if (typeof numValue === "number" && Number.isFinite(numValue)) {
                              setPeakParams({
                                ...peakParams,
                                minProminence: numValue,
                              });
                              // Peak detection will be triggered by useEffect when peakParams changes
                            }
                          }}
                          classNames={{
                            base: "w-full",
                            track: "h-2 bg-gray-200 dark:bg-gray-700",
                            filler: "bg-wsu-crimson",
                            thumb: "w-4 h-4 bg-wsu-crimson border-2 border-wsu-crimson cursor-pointer",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <ScrollShadow
                  hideScrollBar
                  className="max-h-[250px]"
                >
                  <div className="space-y-2">
                    {peaks.length === 0 && !isAddingPeak && (
                      <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        No peaks identified. Click &quot;Auto-detect&quot; or add
                        manually.
                      </div>
                    )}

                    {peaks.length > 0 && (
                      <div className="space-y-2">
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
                          className={`relative flex flex-col rounded-lg border ${
                            isSelected
                              ? "border-wsu-crimson bg-wsu-crimson/5 dark:border-wsu-crimson dark:bg-wsu-crimson/10"
                              : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
                          }`}
                          onClick={() =>
                            onPeakSelect(isSelected ? null : peakId)
                          }
                        >
                          {/* Top bar with Energy input and X button */}
                          <div className="relative h-7 bg-gray-300 dark:bg-gray-600 rounded-t-lg flex items-center gap-1.5 px-1.5">
                            <div className="flex-1 min-w-0">
                              <NumberInput
                                size="sm"
                                variant="flat"
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
                                endContent={
                                  <span className="text-xs text-gray-600 dark:text-gray-300 pr-0.5">
                                    eV
                                  </span>
                                }
                                classNames={{
                                  base: "w-full",
                                  input: "text-xs py-0 h-6 bg-transparent text-gray-900 dark:text-gray-100",
                                  inputWrapper: "h-6 min-h-6 bg-transparent shadow-none border-0",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePeak(index);
                              }}
                              className="rounded p-0.5 text-gray-600 hover:text-red-600 hover:bg-red-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 shrink-0"
                              title="Delete peak"
                              aria-label="Delete peak"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="p-1.5">
                            <div className="grid grid-cols-2 gap-1.5">
                              <select
                                value={peak.bond ?? ""}
                                onChange={(e) =>
                                  handleUpdatePeak(index, {
                                    bond: e.target.value || undefined,
                                  })
                                }
                                className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="" disabled>
                                  Bond
                                </option>
                                {BOND_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={peak.transition ?? ""}
                                onChange={(e) =>
                                  handleUpdatePeak(index, {
                                    transition: e.target.value || undefined,
                                  })
                                }
                                className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="" disabled>
                                  Transition
                                </option>
                                {TRANSITION_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
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
                </ScrollShadow>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
