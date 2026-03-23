"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { DatasetState } from "~/features/process-nexafs";
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
        <CheckCircleIcon className="h-4 w-4 text-success" />
      );
    }
    if (statusInfo.status === "error") {
      return (
        <ExclamationTriangleIcon className="h-4 w-4 text-danger" />
      );
    }
    return (
      <div className="border-warning h-4 w-4 rounded-full border-2" />
    );
  };

  return (
    <div
      className={`hover:bg-default cursor-pointer p-3 transition-colors ${
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
          className="border-border text-accent focus:ring-accent mt-0.5 h-4 w-4 cursor-pointer rounded focus:ring-2"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span
              className={`truncate text-sm ${
                isActive ? "text-foreground font-medium" : "text-muted"
              }`}
            >
              {dataset.fileName}
            </span>
          </div>
          {statusInfo.missingFields.length > 0 && (
            <div className="text-muted mt-1 text-xs">
              Missing: {statusInfo.missingFields.join(", ")}
            </div>
          )}
          {statusInfo.errors.length > 0 && (
            <div className="text-danger mt-1 text-xs">
              {statusInfo.errors[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
