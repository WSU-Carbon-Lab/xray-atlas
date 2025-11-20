"use client";

import { useState } from "react";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { DatasetState } from "~/app/contribute/nexafs/types";

interface DatasetTabsProps {
  datasets: DatasetState[];
  activeDatasetId: string | null;
  onDatasetSelect: (datasetId: string) => void;
  onDatasetRemove: (datasetId: string) => void;
  onDatasetRename: (datasetId: string, newName: string) => void;
}

export function DatasetTabs({
  datasets,
  activeDatasetId,
  onDatasetSelect,
  onDatasetRemove,
  onDatasetRename,
}: DatasetTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = (datasetId: string, currentName: string) => {
    setEditingId(datasetId);
    setEditValue(currentName);
  };

  const handleFinishEdit = (datasetId: string) => {
    if (editValue.trim()) {
      onDatasetRename(datasetId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const getDatasetStatus = (dataset: DatasetState) => {
    const checks = {
      molecule: !!dataset.moleculeId,
      instrument: !!dataset.instrumentId,
      edge: !!dataset.edgeId,
      data: dataset.spectrumPoints.length > 0,
    };
    const allComplete = Object.values(checks).every((v) => v);
    return { checks, allComplete };
  };

  if (datasets.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {datasets.map((dataset) => {
          const status = getDatasetStatus(dataset);
          const isActive = dataset.id === activeDatasetId;
          const isEditing = editingId === dataset.id;

          return (
            <div
              key={dataset.id}
              className={`group relative flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 transition-colors ${
                isActive
                  ? "border-wsu-crimson bg-white dark:bg-gray-800"
                  : "border-transparent bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
              }`}
            >
              <button
                type="button"
                onClick={() => onDatasetSelect(dataset.id)}
                className="flex items-center gap-2"
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleFinishEdit(dataset.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleFinishEdit(dataset.id);
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                        setEditValue("");
                      }
                    }}
                    className="min-w-[100px] rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-wsu-crimson focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span
                      className="cursor-pointer text-sm font-medium text-gray-700 hover:text-wsu-crimson dark:text-gray-300"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(dataset.id, dataset.fileName);
                      }}
                    >
                      {dataset.fileName}
                    </span>
                    {status.allComplete && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </>
                )}
              </button>

              {!isEditing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDatasetRemove(dataset.id);
                  }}
                  className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  title="Remove dataset"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}

              {/* Status indicators */}
              {!status.allComplete && (
                <div className="flex gap-1">
                  {!status.molecule && (
                    <span className="h-2 w-2 rounded-full bg-yellow-400" title="Molecule not selected" />
                  )}
                  {!status.instrument && (
                    <span className="h-2 w-2 rounded-full bg-orange-400" title="Instrument not selected" />
                  )}
                  {!status.data && (
                    <span className="h-2 w-2 rounded-full bg-red-400" title="No spectrum data" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
