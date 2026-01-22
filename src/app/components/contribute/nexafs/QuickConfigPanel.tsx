"use client";

import { useState } from "react";
import { Chip } from "@heroui/react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { DatasetState } from "~/app/contribute/nexafs/types";
import { QuickConfigPanelItem } from "./QuickConfigPanelItem";

interface QuickConfigPanelProps {
  datasets: DatasetState[];
  activeDatasetId: string | null;
  onDatasetSelect: (datasetId: string) => void;
  selectedDatasetIds: Set<string>;
  onToggleSelection: (datasetId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export function QuickConfigPanel({
  datasets,
  activeDatasetId,
  onDatasetSelect,
  selectedDatasetIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
}: QuickConfigPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (datasets.length === 0) {
    return null;
  }

  const statusCounts = { complete: 0, incomplete: 0, error: 0 };
  datasets.forEach((dataset) => {
    const hasMolecule = !!dataset.moleculeId;
    const hasInstrument = !!dataset.instrumentId;
    const hasEdge = !!dataset.edgeId;
    const hasMapping =
      !!dataset.columnMappings.energy && !!dataset.columnMappings.absorption;
    const hasData = dataset.spectrumPoints.length > 0;
    const hasError = !!dataset.spectrumError;

    if (hasError) {
      statusCounts.error++;
    } else if (hasMolecule && hasInstrument && hasEdge && hasMapping && hasData) {
      statusCounts.complete++;
    } else {
      statusCounts.incomplete++;
    }
  });
  const { complete: completeCount, incomplete: incompleteCount, error: errorCount } = statusCounts;

  return (
    <div
      className={`flex flex-col border-r border-gray-200 bg-white transition-all dark:border-gray-700 dark:bg-gray-800 ${
        isCollapsed ? "w-12" : "w-80"
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700">
        {!isCollapsed && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Datasets Overview
          </h3>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
        >
          <ChevronRightIcon
            className={`h-4 w-4 transition-transform ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="border-b border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Status Summary</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-accent hover:underline"
                >
                  Select All
                </button>
                {selectedDatasetIds.size > 0 && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={onClearSelection}
                      className="text-accent hover:underline"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Chip
                size="sm"
                variant="flat"
                color="success"
                classNames={{ base: "h-6 px-2", content: "text-xs" }}
              >
                {completeCount} Complete
              </Chip>
              <Chip
                size="sm"
                variant="flat"
                color="warning"
                classNames={{ base: "h-6 px-2", content: "text-xs" }}
              >
                {incompleteCount} Incomplete
              </Chip>
              {errorCount > 0 && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="danger"
                  classNames={{ base: "h-6 px-2", content: "text-xs" }}
                >
                  {errorCount} Error
                </Chip>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {datasets.map((dataset) => (
                <QuickConfigPanelItem
                  key={dataset.id}
                  dataset={dataset}
                  isActive={dataset.id === activeDatasetId}
                  isSelected={selectedDatasetIds.has(dataset.id)}
                  onSelect={() => onDatasetSelect(dataset.id)}
                  onToggleSelection={() => onToggleSelection(dataset.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
