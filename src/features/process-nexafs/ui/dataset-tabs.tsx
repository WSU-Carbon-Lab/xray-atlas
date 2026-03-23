"use client";

import { useState, useEffect, useCallback } from "react";
import { Chip, Button, Tooltip, Tabs } from "@heroui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { skipToken } from "@tanstack/react-query";
import type { DatasetState } from "~/features/process-nexafs";
import { useDatasetStatus } from "./hooks/use-dataset-status";
import { trpc } from "~/trpc/client";
import {
  MoleculeSelectModal,
  InstrumentSelectModal,
  EdgeSelectModal,
} from "./descriptor-select-modals";

type InstrumentOption = { id: string; name: string; facilityName?: string };
type EdgeOption = { id: string; targetatom: string; corestate: string };

interface DatasetTabsProps {
  datasets: DatasetState[];
  activeDatasetId: string | null;
  onDatasetSelect: (datasetId: string) => void;
  onDatasetRemove: (datasetId: string) => void;
  onNewDataset?: () => void;
  instrumentOptions: InstrumentOption[];
  edgeOptions: EdgeOption[];
  updateDataset: (id: string, updates: Partial<DatasetState>) => void;
}

type DescriptorModalType = "molecule" | "instrument" | "edge" | null;

interface DescriptorTabContentProps {
  dataset: DatasetState;
  index: number;
  isActive: boolean;
  instrumentOptions: InstrumentOption[];
  edgeOptions: EdgeOption[];
  onOpenModal: (type: DescriptorModalType, datasetId: string) => void;
  onRemove: (id: string) => void;
}

function MoleculeLabel({ moleculeId }: { moleculeId: string | null }) {
  const { data } = trpc.molecules.getById.useQuery(
    moleculeId ? { id: moleculeId } : skipToken,
    { enabled: !!moleculeId },
  );
  if (!moleculeId) {
    return (
      <span className="text-warning cursor-pointer underline decoration-dotted decoration-from-font underline-offset-1">
        Molecule (required)
      </span>
    );
  }
  if (!data) {
    return <span className="text-muted-foreground font-mono">…</span>;
  }
  return (
    <span className="cursor-pointer font-mono font-medium hover:underline">
      {data.chemicalFormula ?? data.iupacName ?? "—"}
    </span>
  );
}

function DescriptorTabContent({
  dataset,
  index,
  isActive,
  instrumentOptions,
  edgeOptions,
  onOpenModal,
  onRemove,
}: DescriptorTabContentProps) {
  const statusInfo = useDatasetStatus(dataset);
  const instrument = dataset.instrumentId
    ? instrumentOptions.find((i) => i.id === dataset.instrumentId)
    : null;
  const edge = dataset.edgeId
    ? edgeOptions.find((e) => e.id === dataset.edgeId)
    : null;

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

  const handleSegmentClick = (
    e: React.MouseEvent,
    type: DescriptorModalType,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onOpenModal(type, dataset.id);
  };

  return (
    <div className="flex max-w-full min-w-0 flex-1 items-center gap-1.5">
      {getStatusBadge()}
      <span className="text-muted-foreground shrink-0"> </span>
      <button
        type="button"
        onClick={(e) => handleSegmentClick(e, "molecule")}
        className={`focus-visible:ring-accent min-w-0 rounded px-0.5 text-left focus:outline-none focus-visible:ring-2 ${
          isActive ? "whitespace-nowrap" : "max-w-[75px] truncate"
        }`}
        title="Click to select molecule (required)"
      >
        <MoleculeLabel moleculeId={dataset.moleculeId} />
      </button>
      <span className="text-muted-foreground shrink-0"> , </span>
      <button
        type="button"
        onClick={(e) => handleSegmentClick(e, "instrument")}
        className={`focus-visible:ring-accent min-w-0 rounded px-0.5 text-left focus:outline-none focus-visible:ring-2 ${
          isActive ? "whitespace-nowrap" : "max-w-[55px] truncate"
        }`}
        title="Click to select instrument (required)"
      >
        {instrument ? (
          <span className="font-medium">{instrument.name}</span>
        ) : (
          <span className="text-warning underline decoration-dotted decoration-from-font underline-offset-1">
            Instrument (required)
          </span>
        )}
      </button>
      <span className="text-muted-foreground shrink-0"> , </span>
      <button
        type="button"
        onClick={(e) => handleSegmentClick(e, "edge")}
        className={`focus-visible:ring-accent min-w-0 rounded px-0.5 text-left focus:outline-none focus-visible:ring-2 ${
          isActive ? "whitespace-nowrap" : "max-w-[46px] truncate"
        }`}
        title="Click to select edge (required)"
      >
        {edge ? (
          <span className="font-mono font-medium">
            {edge.targetatom}({edge.corestate})
          </span>
        ) : (
          <span className="text-warning underline decoration-dotted decoration-from-font underline-offset-1">
            Edge (required)
          </span>
        )}
      </button>
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
        className="text-muted focus-visible:ring-accent hover:text-danger ml-auto shrink-0 cursor-pointer rounded p-1 opacity-70 transition-colors hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
        title="Remove dataset"
        aria-label={`Remove dataset, Cmd+${index + 1} to select`}
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
  onNewDataset,
  instrumentOptions,
  edgeOptions,
  updateDataset,
}: DatasetTabsProps) {
  const [modalType, setModalType] = useState<DescriptorModalType>(null);
  const [datasetIdForModal, setDatasetIdForModal] = useState<string | null>(
    null,
  );

  const openModal = useCallback((type: DescriptorModalType, id: string) => {
    setModalType(type);
    setDatasetIdForModal(id);
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    setDatasetIdForModal(null);
  }, []);

  const handleMoleculeSelect = useCallback(
    (moleculeId: string) => {
      if (datasetIdForModal) {
        updateDataset(datasetIdForModal, { moleculeId });
      }
      closeModal();
    },
    [datasetIdForModal, updateDataset, closeModal],
  );

  const handleInstrumentSelect = useCallback(
    (instrumentId: string) => {
      if (datasetIdForModal) {
        updateDataset(datasetIdForModal, { instrumentId });
      }
      closeModal();
    },
    [datasetIdForModal, updateDataset, closeModal],
  );

  const handleEdgeSelect = useCallback(
    (edgeId: string) => {
      if (datasetIdForModal) {
        updateDataset(datasetIdForModal, { edgeId });
      }
      closeModal();
    },
    [datasetIdForModal, updateDataset, closeModal],
  );

  const handleSelectionChange = useCallback(
    (key: React.Key) => {
      const id = key == null ? null : String(key);
      if (id && datasets.some((d) => d.id === id)) {
        queueMicrotask(() => onDatasetSelect(id));
      }
    },
    [datasets, onDatasetSelect],
  );

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
  const validKey = datasets.some((d) => d.id === activeKey)
    ? activeKey
    : undefined;

  const shouldStretch = datasets.length === 1;

  return (
    <>
      <div className="border-border bg-surface/50 mb-6 flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <Tabs
            selectedKey={validKey}
            onSelectionChange={handleSelectionChange}
            className="min-w-0"
          >
            <Tabs.ListContainer className="min-w-0">
              <Tabs.List
                aria-label="Dataset tabs"
                className="bg-surface-2 flex h-12 min-w-0 gap-1 overflow-x-auto rounded-full p-1.5 [&_.tabs__list]:flex [&_.tabs__list]:min-w-0 [&_.tabs__list]:flex-1 [&_.tabs__list]:gap-1 [&_.tabs__list]:overflow-x-auto [&_.tabs__list]:rounded-full"
              >
                {datasets.map((dataset, index) => (
                  <Tabs.Tab
                    key={dataset.id}
                    id={dataset.id}
                    className={`text-secondary data-[selected=true]:bg-surface-3 data-[selected=true]:text-foreground data-[selected=true]:ring-accent/40 data-[hovered=true]:text-foreground data-[hovered=true]:data-[selected=false]:bg-surface-3/50 flex h-9 min-w-0 shrink-0 cursor-pointer items-center rounded-full px-4 transition-[width,max-width,background-color,color,box-shadow] duration-250 ease-out data-[selected=true]:ring-2 data-[selected=true]:ring-inset ${shouldStretch ? "flex-1" : "w-[220px] max-w-[220px] data-[selected=true]:w-auto data-[selected=true]:max-w-fit"}`}
                  >
                    <DescriptorTabContent
                      dataset={dataset}
                      index={index}
                      isActive={dataset.id === validKey}
                      instrumentOptions={instrumentOptions}
                      edgeOptions={edgeOptions}
                      onOpenModal={openModal}
                      onRemove={onDatasetRemove}
                    />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>
        {onNewDataset && (
          <Tooltip delay={0}>
            <Button
              type="button"
              variant="primary"
              size="md"
              onPress={() => onNewDataset()}
              className="focus-visible:ring-accent h-11 shrink-0 gap-2 rounded-lg px-4 font-medium focus-visible:ring-2"
              aria-label="Add new dataset (Cmd+N)"
            >
              <PlusIcon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">New Dataset</span>
                <span className="sm:hidden">New</span>
              </span>
              <kbd
                className="text-accent-foreground/90 ml-1 hidden rounded border border-current/40 px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline"
                aria-hidden
              >
                ⌘N
              </kbd>
            </Button>
            <Tooltip.Content className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg">
              Add a new dataset tab (⌘N)
            </Tooltip.Content>
          </Tooltip>
        )}
      </div>

      <MoleculeSelectModal
        isOpen={modalType === "molecule"}
        onClose={closeModal}
        onSelect={handleMoleculeSelect}
      />
      <InstrumentSelectModal
        isOpen={modalType === "instrument"}
        onClose={closeModal}
        onSelect={handleInstrumentSelect}
        instruments={instrumentOptions}
      />
      <EdgeSelectModal
        isOpen={modalType === "edge"}
        onClose={closeModal}
        onSelect={handleEdgeSelect}
        edges={edgeOptions}
      />
    </>
  );
}
