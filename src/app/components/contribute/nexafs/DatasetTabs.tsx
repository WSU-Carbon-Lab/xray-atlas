"use client";

import { useState } from "react";
import { Tabs, Tab } from "@heroui/react";
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

  const activeKey = activeDatasetId ?? datasets[0]?.id ?? "";

  return (
    <div className="mb-6">
      <Tabs
        selectedKey={activeKey}
        onSelectionChange={(key) => {
          if (typeof key === "string") {
            onDatasetSelect(key);
          }
        }}
        classNames={{
          base: "w-full",
          tabList:
            "gap-0 w-full relative rounded-none p-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto",
          cursor: "w-full bg-accent",
          tab: "min-w-0 max-w-[200px] px-3 h-12 border-r border-gray-200 dark:border-gray-700 shrink-0",
          tabContent:
            "group-data-[selected=true]:text-accent dark:text-accent-light flex items-center gap-2 min-w-0",
        }}
      >
        {datasets.map((dataset) => {
          const status = getDatasetStatus(dataset);
          const { checks, allComplete } = status;

          return (
            <Tab
              key={dataset.id}
              title={
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  {allComplete ? (
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <div className="flex shrink-0 gap-1">
                      {!checks.molecule && (
                        <span
                          className="h-2 w-2 rounded-full bg-yellow-400"
                          title="Molecule not selected"
                        />
                      )}
                      {!checks.instrument && (
                        <span
                          className="h-2 w-2 rounded-full bg-orange-400"
                          title="Instrument not selected"
                        />
                      )}
                      {!checks.data && (
                        <span
                          className="h-2 w-2 rounded-full bg-red-400"
                          title="No spectrum data"
                        />
                      )}
                    </div>
                  )}
                  {editingId === dataset.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleFinishEdit(dataset.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleFinishEdit(dataset.id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
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
                        handleStartEdit(dataset.id, dataset.fileName);
                      }}
                      className="min-w-0 flex-1 cursor-pointer truncate select-none"
                      title={`${dataset.fileName} - Double-click to rename`}
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
                      onDatasetRemove(dataset.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        e.preventDefault();
                        onDatasetRemove(dataset.id);
                      }
                    }}
                    className="focus:ring-accent ml-auto shrink-0 cursor-pointer rounded p-1 text-gray-400 opacity-70 transition-opacity hover:text-red-600 hover:opacity-100 focus:ring-2 focus:outline-none"
                    title="Remove dataset"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </span>
                </div>
              }
            />
          );
        })}
      </Tabs>
    </div>
  );
}
