"use client";

import { useState, useEffect } from "react";
import { Tabs, Chip } from "@heroui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { DatasetState } from "~/app/contribute/nexafs/types";
import { useDatasetStatus } from "./hooks/use-dataset-status";

interface DatasetTabsProps {
  datasets: DatasetState[];
  activeDatasetId: string | null;
  onDatasetSelect: (datasetId: string) => void;
  onDatasetRemove: (datasetId: string) => void;
  onDatasetRename: (datasetId: string, newName: string) => void;
  onNewDataset?: () => void;
}

interface DatasetTabContentProps {
  dataset: DatasetState;
  index: number;
  editingId: string | null;
  editValue: string;
  onStartEdit: (id: string, name: string) => void;
  onFinishEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onRemove: (id: string) => void;
}

function DatasetTabContent({
  dataset,
  index,
  editingId,
  editValue,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onEditValueChange,
  onRemove,
}: DatasetTabContentProps) {
  const statusInfo = useDatasetStatus(dataset);

  const getStatusBadge = () => {
    if (statusInfo.status === "complete") {
      return (
        <Chip
          size="sm"
          variant="primary"
          color="success"
          className="h-5 px-1.5 text-[10px] font-semibold text-white"
        >
          <CheckCircleIcon className="h-3 w-3" />
        </Chip>
      );
    }
    if (statusInfo.status === "error") {
      return (
        <Chip
          size="sm"
          variant="primary"
          color="danger"
          className="h-5 px-1.5 text-[10px] font-semibold text-white"
        >
          <ExclamationTriangleIcon className="h-3 w-3" />
        </Chip>
      );
    }
    return (
      <Chip
        size="sm"
        variant="soft"
        color="warning"
        className="h-5 px-1.5 text-[10px] font-semibold"
      >
        {statusInfo.missingFields.length}
      </Chip>
    );
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 max-w-full">
      {getStatusBadge()}
      {editingId === dataset.id ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={() => onFinishEdit(dataset.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onFinishEdit(dataset.id);
            } else if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="border-accent focus:ring-accent max-w-full min-w-[80px] rounded border bg-white px-1 text-sm focus:ring-2 focus:outline-none dark:bg-gray-800"
          autoFocus
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEdit(dataset.id, dataset.fileName);
          }}
          className="min-w-0 flex-1 cursor-pointer truncate select-none font-medium"
          title={`${dataset.fileName} - Double-click to rename • Cmd+${index + 1} to select`}
        >
          {dataset.fileName}
        </span>
      )}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove(dataset.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            e.preventDefault();
            onRemove(dataset.id);
          }
        }}
        className="focus:ring-accent ml-auto shrink-0 cursor-pointer rounded p-1 text-gray-400 opacity-70 transition-opacity hover:text-red-600 hover:opacity-100 focus:ring-2 focus:outline-none"
        title="Remove dataset"
      >
        <XMarkIcon className="h-4 w-4" />
      </span>
    </div>
  );
}

export function DatasetTabs({
  datasets,
  activeDatasetId,
  onDatasetSelect,
  onDatasetRemove,
  onDatasetRename,
  onNewDataset,
}: DatasetTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleStartEdit = (datasetId: string, currentName: string) => {
    setEditingId(datasetId);
    setEditValue(currentName);
  };

  const handleFinishEdit = (datasetId: string) => {
    if (
      editValue.trim() &&
      editValue.trim() !== datasets.find((d) => d.id === datasetId)?.fileName
    ) {
      onDatasetRename(datasetId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onNewDataset?.();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key) - 1;
        if (index < datasets.length) {
          e.preventDefault();
          onDatasetSelect(datasets[index]!.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [datasets, onDatasetSelect, onNewDataset]);

  if (datasets.length === 0) {
    return null;
  }

  const activeKey = activeDatasetId ?? datasets[0]?.id ?? "";

  const shouldStretch = datasets.length === 1;

  return (
    <div className="mb-6 flex items-stretch border-b border-gray-200 dark:border-gray-700">
      <Tabs
        selectedKey={activeKey}
        onSelectionChange={(key) => {
          if (typeof key === "string") {
            onDatasetSelect(key);
          }
        }}
        className="flex-1 min-w-0"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label="Dataset tabs"
            className="gap-0 w-full relative rounded-none p-0 border-0 overflow-x-auto flex min-w-0"
          >
            {datasets.map((dataset, index) => (
              <Tabs.Tab
                key={dataset.id}
                id={dataset.id}
                className={
                  shouldStretch
                    ? "flex-1 px-4 h-14 border-r border-gray-200 dark:border-gray-700 shrink-0 relative data-[selected=true]:after:content-[''] data-[selected=true]:after:absolute data-[selected=true]:after:bottom-0 data-[selected=true]:after:left-0 data-[selected=true]:after:right-0 data-[selected=true]:after:h-[2px] data-[selected=true]:after:bg-accent dark:data-[selected=true]:after:bg-accent-light data-[selected=true]:bg-gray-50 dark:data-[selected=true]:bg-gray-800/50 transition-all min-w-0 max-w-[200px]"
                    : "min-w-0 max-w-[200px] shrink px-4 h-14 border-r border-gray-200 dark:border-gray-700 relative data-[selected=true]:after:content-[''] data-[selected=true]:after:absolute data-[selected=true]:after:bottom-0 data-[selected=true]:after:left-0 data-[selected=true]:after:right-0 data-[selected=true]:after:h-[2px] data-[selected=true]:after:bg-accent dark:data-[selected=true]:after:bg-accent-light data-[selected=true]:bg-gray-50 dark:data-[selected=true]:bg-gray-800/50 transition-all"
                }
              >
                <DatasetTabContent
                  dataset={dataset}
                  index={index}
                  editingId={editingId}
                  editValue={editValue}
                  onStartEdit={handleStartEdit}
                  onFinishEdit={handleFinishEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditValueChange={setEditValue}
                  onRemove={onDatasetRemove}
                />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {datasets.map((dataset) => (
          <Tabs.Panel key={dataset.id} id={dataset.id} className="hidden">
            <></>
          </Tabs.Panel>
        ))}
      </Tabs>
      {onNewDataset && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewDataset();
          }}
          className="h-14 px-4 border-l border-gray-200 dark:border-gray-700 shrink-0 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          title="Add new dataset (Cmd+K)"
        >
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
            <span className="hidden sm:inline">+ New Dataset</span>
            <span className="sm:hidden">+</span>
          </span>
        </button>
      )}
    </div>
  );
}
