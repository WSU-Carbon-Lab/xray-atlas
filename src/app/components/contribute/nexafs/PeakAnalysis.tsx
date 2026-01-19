"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "~/app/components/Button";
import { FormField } from "~/app/components/FormField";
import type { PeakData } from "~/app/contribute/nexafs/types";
import { detectPeaks, convertToPeakData } from "~/app/contribute/nexafs/utils/peakDetection";
import type { SpectrumPoint } from "~/app/components/plots/core/types";

interface PeakAnalysisProps {
  peaks: PeakData[];
  spectrumPoints: SpectrumPoint[];
  normalizedPoints: SpectrumPoint[] | null;
  onPeaksChange: (peaks: PeakData[]) => void;
}

const BOND_OPTIONS = [
  { value: "", label: "Select bond..." },
  { value: "C-C", label: "C-C" },
  { value: "C=C", label: "C=C" },
  { value: "C≡C", label: "C≡C" },
  { value: "C-O", label: "C-O" },
  { value: "C=O", label: "C=O" },
  { value: "C-N", label: "C-N" },
  { value: "C=N", label: "C=N" },
  { value: "C-H", label: "C-H" },
  { value: "O-H", label: "O-H" },
  { value: "N-H", label: "N-H" },
  { value: "Other", label: "Other" },
];

const TRANSITION_OPTIONS = [
  { value: "", label: "Select transition..." },
  { value: "π*", label: "π*" },
  { value: "σ*", label: "σ*" },
  { value: "Rydberg", label: "Rydberg" },
  { value: "Other", label: "Other" },
];

export function PeakAnalysis({
  peaks,
  spectrumPoints,
  normalizedPoints,
  onPeaksChange,
}: PeakAnalysisProps) {
  const [isAddingPeak, setIsAddingPeak] = useState(false);
  const [newPeakEnergy, setNewPeakEnergy] = useState("");
  const [newPeakBond, setNewPeakBond] = useState("");
  const [newPeakTransition, setNewPeakTransition] = useState("");

  const handleIdentifyPeaks = () => {
    // Use normalized points if available, otherwise use raw points
    const pointsToAnalyze = normalizedPoints ?? spectrumPoints;

    if (pointsToAnalyze.length === 0) {
      return;
    }

    const detected = detectPeaks(pointsToAnalyze, {
      minProminence: 0.05, // 5% of max intensity
    });

    const newPeaks = convertToPeakData(detected);
    onPeaksChange([...peaks, ...newPeaks]);
  };

  const handleAddPeak = () => {
    const energy = parseFloat(newPeakEnergy);
    if (!Number.isFinite(energy)) {
      return;
    }

    const newPeak: PeakData = {
      energy,
      bond: newPeakBond || undefined,
      transition: newPeakTransition || undefined,
    };

    onPeaksChange([...peaks, newPeak]);
    setIsAddingPeak(false);
    setNewPeakEnergy("");
    setNewPeakBond("");
    setNewPeakTransition("");
  };

  const handleUpdatePeak = (index: number, updates: Partial<PeakData>) => {
    const updated = [...peaks];
    updated[index] = { ...updated[index]!, ...updates };
    onPeaksChange(updated);
  };

  const handleDeletePeak = (index: number) => {
    onPeaksChange(peaks.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Peaks ({peaks.length})
        </h4>
        <Button
          type="button"
          variant="bordered"
          size="sm"
          onClick={handleIdentifyPeaks}
          disabled={spectrumPoints.length === 0}
        >
          Auto-detect
        </Button>
      </div>

      {peaks.length === 0 && !isAddingPeak && (
        <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No peaks identified. Click &quot;Auto-detect&quot; or add manually.
        </div>
      )}

      {peaks.length > 0 && (
        <div className="space-y-3">
          {peaks.map((peak, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50"
            >
              <div className="flex-1 space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Energy (eV)
                  </label>
                  <input
                    type="number"
                    value={peak.energy}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (Number.isFinite(val)) {
                        handleUpdatePeak(index, { energy: val });
                      }
                    }}
                    step="0.1"
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                        handleUpdatePeak(index, { bond: e.target.value || undefined })
                      }
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                onClick={() => handleDeletePeak(index)}
                className="rounded p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                title="Delete peak"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isAddingPeak ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Energy (eV) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={newPeakEnergy}
                onChange={(e) => setNewPeakEnergy(e.target.value)}
                step="0.1"
                placeholder="e.g., 285.0"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                  onChange={(e) => setNewPeakTransition(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                disabled={!newPeakEnergy || !Number.isFinite(parseFloat(newPeakEnergy))}
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
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="bordered"
          size="sm"
          onClick={() => setIsAddingPeak(true)}
          className="mt-4 w-full"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Peak
        </Button>
      )}
    </div>
  );
}
