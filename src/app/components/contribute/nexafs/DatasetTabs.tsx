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
            "gap-2 w-full relative rounded-none p-0 border-b border-gray-200 dark:border-gray-700",
          cursor: "w-full bg-wsu-crimson",
          tab: "max-w-fit px-4 h-12",
          tabContent: "group-data-[selected=true]:text-wsu-crimson",
        }}
      >
        {datasets.map((dataset) => {
          const status = getDatasetStatus(dataset);
          const { checks, allComplete } = status;

          return (
            <Tab
              key={dataset.id}
              title={
                <div className="flex items-center gap-2">
                  {allComplete ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="flex gap-1">
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
                      className="border-wsu-crimson focus:ring-wsu-crimson min-w-[100px] rounded border bg-white px-1 text-sm focus:ring-2 focus:outline-none dark:bg-gray-800"
                      autoFocus
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(dataset.id, dataset.fileName);
                      }}
                      className="cursor-pointer select-none"
                      title="Double-click to rename"
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
                    className="focus:ring-wsu-crimson ml-2 cursor-pointer rounded p-1 text-gray-400 opacity-0 transition-opacity group-data-[selected=true]:opacity-100 hover:text-red-600 focus:ring-2 focus:outline-none"
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
