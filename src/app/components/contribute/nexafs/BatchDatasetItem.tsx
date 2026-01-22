"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { DatasetState } from "~/app/contribute/nexafs/types";
import { useDatasetStatus } from "./hooks/useDatasetStatus";

interface BatchDatasetItemProps {
  dataset: DatasetState;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleSelection: () => void;
}

export function BatchDatasetItem({
  dataset,
  isActive,
  isSelected,
  onSelect,
  onToggleSelection,
}: BatchDatasetItemProps) {
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
      className={`flex cursor-pointer items-center gap-2 rounded p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        isActive ? "bg-accent/10" : ""
      }`}
      onClick={onSelect}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          onToggleSelection();
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-accent focus:ring-2 focus:ring-accent"
      />
      {getStatusIcon()}
      <span
        className={`flex-1 truncate text-sm ${
          isActive
            ? "font-medium text-gray-900 dark:text-gray-100"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {dataset.fileName}
      </span>
    </div>
  );
}
