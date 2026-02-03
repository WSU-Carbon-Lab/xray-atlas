"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { DatasetState } from "~/app/contribute/nexafs/types";
import { useDatasetStatus } from "./hooks/use-dataset-status";

interface QuickConfigPanelItemProps {
  dataset: DatasetState;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleSelection: () => void;
}

export function QuickConfigPanelItem({
  dataset,
  isActive,
  isSelected,
  onSelect,
  onToggleSelection,
}: QuickConfigPanelItemProps) {
  const statusInfo = useDatasetStatus(dataset);

  const getStatusIcon = () => {
    if (statusInfo.status === "complete") {
      return (
        <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
      );
    }
    if (statusInfo.status === "error") {
      return (
        <ExclamationTriangleIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
      );
    }
    return (
      <div className="h-4 w-4 rounded-full border-2 border-yellow-500 dark:border-yellow-400" />
    );
  };

  return (
    <div
      className={`cursor-pointer p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        isActive ? "bg-accent/10 border-l-2 border-accent" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelection();
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-accent focus:ring-2 focus:ring-accent"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span
              className={`truncate text-sm ${
                isActive
                  ? "font-medium text-gray-900 dark:text-gray-100"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {dataset.fileName}
            </span>
          </div>
          {statusInfo.missingFields.length > 0 && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Missing: {statusInfo.missingFields.join(", ")}
            </div>
          )}
          {statusInfo.errors.length > 0 && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {statusInfo.errors[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
