"use client";

import { useState, useEffect, useCallback } from "react";
import { Chip, Button, Tooltip, Tabs } from "@heroui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
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
          className="border-border bg-surface focus:ring-accent max-w-full min-w-[80px] rounded border px-1 text-sm focus:ring-2 focus:outline-none"
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
        className="text-muted focus-visible:ring-accent ml-auto shrink-0 cursor-pointer rounded p-1 opacity-70 transition-colors hover:text-danger hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
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
  const validKey = datasets.some((d) => d.id === activeKey) ? activeKey : undefined;

  const handleSelectionChange = useCallback(
    (key: React.Key) => {
      const id = key == null ? null : String(key);
      if (id && datasets.some((d) => d.id === id)) {
        queueMicrotask(() => onDatasetSelect(id));
      }
    },
    [datasets, onDatasetSelect]
  );

  const shouldStretch = datasets.length === 1;

  return (
    <div className="border-border bg-surface/50 mb-6 flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 shadow-sm">
      <Tabs
        selectedKey={validKey}
        onSelectionChange={handleSelectionChange}
        className="min-w-0 flex-1"
      >
        <Tabs.ListContainer className="w-full">
          <Tabs.List
            aria-label="Dataset tabs"
            className="bg-surface-2 flex h-12 min-w-0 gap-1 overflow-x-auto rounded-full p-1.5 [&_.tabs__list]:flex [&_.tabs__list]:min-w-0 [&_.tabs__list]:flex-1 [&_.tabs__list]:gap-1 [&_.tabs__list]:rounded-full"
          >
            {datasets.map((dataset, index) => (
              <Tabs.Tab
                key={dataset.id}
                id={dataset.id}
                className={`
                  text-secondary flex h-9 min-w-0 max-w-[220px] shrink cursor-pointer items-center rounded-full px-4 transition-colors
                  data-[selected=true]:bg-surface-3 data-[selected=true]:text-foreground
                  data-[selected=true]:ring-2 data-[selected=true]:ring-inset data-[selected=true]:ring-accent/40
                  data-[hovered=true]:text-foreground data-[hovered=true]:data-[selected=false]:bg-surface-3/50
                  ${shouldStretch ? "flex-1" : ""}
                `}
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
      </Tabs>
      {onNewDataset && (
        <Tooltip delay={0}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onPress={() => onNewDataset()}
            className="h-11 shrink-0 gap-2 rounded-lg px-4 font-medium focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Add new dataset (Cmd+N)"
          >
            <PlusIcon className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">
              <span className="hidden sm:inline">New Dataset</span>
              <span className="sm:hidden">New</span>
            </span>
            <kbd className="text-accent-foreground/90 ml-1 hidden rounded border border-current/40 px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline" aria-hidden>
              ⌘N
            </kbd>
          </Button>
          <Tooltip.Content className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg">
            Add a new dataset tab (⌘N)
          </Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
}
