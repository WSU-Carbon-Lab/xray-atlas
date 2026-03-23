"use client";

import { useEffect, useRef, useState } from "react";
import { Form } from "@heroui/react";
import {
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { ContributionFileDropOverlay } from "@/components/contribute";
import {
  FileUploadZone,
  ColumnMappingModal,
  DatasetTabs,
  DatasetContent,
  useDatasetStatus,
} from "~/features/process-nexafs/ui";
import { Tooltip, Label, Description, ErrorMessage } from "@heroui/react";
import { Button as HeroButton } from "@heroui/react";
import type { DatasetState, CSVColumnMappings } from "../types";
import type { SubmitStatus } from "../hooks/useNexafsSubmit";

type InstrumentOption = { id: string; name: string; facilityName?: string };
type EdgeOption = { id: string; targetatom: string; corestate: string };
type VendorOption = { id: string; name: string | null; url?: string | null };

export type NexafsContributeFlowProps = {
  datasets: DatasetState[];
  activeDatasetId: string | null;
  updateDataset: (id: string, updates: Partial<DatasetState>) => void;
  processDatasetData: (id: string) => void;
  handleFilesSelected: (files: File[]) => void | Promise<void>;
  handleNewDataset: () => void;
  handleDatasetSelect: (id: string) => void;
  handleDatasetRemove: (id: string) => void;
  columnMappingFile: { file: File; datasetId: string } | null;
  handleColumnMappingConfirm: (
    mappings: CSVColumnMappings,
    fixedValues?: { theta?: string; phi?: string },
  ) => void;
  handleColumnMappingClose: () => void;
  instrumentOptions: InstrumentOption[];
  edgeOptions: EdgeOption[];
  calibrationOptions: {
    id: string;
    name: string;
    description: string | null;
  }[];
  vendors: VendorOption[];
  isLoadingInstruments: boolean;
  isLoadingEdges: boolean;
  isLoadingCalibrations: boolean;
  isLoadingVendors: boolean;
  submit: (event?: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  submitStatus: SubmitStatus;
  setSubmitStatus: (status: SubmitStatus) => void;
  isPending: boolean;
};

function DatasetMissingFieldsMessage({ dataset }: { dataset: DatasetState }) {
  const statusInfo = useDatasetStatus(dataset);
  if (statusInfo.missingFields.length === 0) {
    return null;
  }

  const tabSelectableFields = statusInfo.missingFields.filter((field) =>
    ["Molecule", "Instrument", "Edge"].includes(field),
  );
  const missingList = statusInfo.missingFields.join(", ");

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-danger mb-3 flex items-start gap-3 border-l-2 px-2 py-1.5"
    >
      <span className="bg-danger-soft-hover text-danger mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <Label className="text-danger block text-xs font-bold tracking-wide uppercase">
          Missing required dataset fields
        </Label>
        <Description className="mt-0.5 block text-xs text-red-300">
          {tabSelectableFields.length > 0
            ? "Set missing tab fields by clicking Molecule, Instrument, or Edge in the active dataset tab."
            : "Complete the remaining required fields in the form below."}
        </Description>
        <ErrorMessage className="mt-1 block text-sm font-semibold text-red-400">
          Missing: {missingList}
        </ErrorMessage>
      </div>
    </div>
  );
}

export function NexafsContributeFlow(props: NexafsContributeFlowProps) {
  const {
    datasets,
    activeDatasetId,
    updateDataset,
    processDatasetData,
    handleFilesSelected,
    handleNewDataset,
    handleDatasetSelect,
    handleDatasetRemove,
    columnMappingFile,
    handleColumnMappingConfirm,
    handleColumnMappingClose,
    instrumentOptions,
    edgeOptions,
    calibrationOptions,
    vendors,
    isLoadingInstruments,
    isLoadingEdges,
    isLoadingCalibrations,
    isLoadingVendors,
    submit,
    submitStatus,
    isPending,
  } = props;

  const [isDragging, setIsDragging] = useState(false);
  const [draggedFileType, setDraggedFileType] = useState<
    "csv" | "json" | "mixed" | null
  >(null);
  const [draggedFileName, setDraggedFileName] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
        if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
          const items = Array.from(e.dataTransfer.items);
          const firstFile = items
            .find((item) => item.kind === "file")
            ?.getAsFile();
          if (firstFile?.name) setDraggedFileName(firstFile.name);
          const fileTypes = items
            .filter((item) => item.kind === "file")
            .map((item) => {
              const mimeType = item.type.toLowerCase();
              if (mimeType === "application/json" || mimeType === "text/json")
                return "json";
              if (mimeType === "text/csv" || mimeType === "application/csv")
                return "csv";
              return null;
            })
            .filter((type): type is "csv" | "json" => type !== null);
          if (fileTypes.length > 0) {
            const uniqueTypes = Array.from(new Set(fileTypes));
            setDraggedFileType(
              uniqueTypes.length === 1 ? uniqueTypes[0]! : "mixed",
            );
          }
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
        setDraggedFileType(null);
        setDraggedFileName(null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      setDraggedFileType(null);
      setDraggedFileName(null);
      const files = Array.from(e.dataTransfer?.files ?? []).filter((file) => {
        const name = file.name.toLowerCase();
        return name.endsWith(".csv") || name.endsWith(".json");
      });
      if (files.length > 0) void handleFilesSelected(files);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleFilesSelected]);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const columnMappingDataset = columnMappingFile
    ? datasets.find((d) => d.id === columnMappingFile.datasetId)
    : null;

  return (
    <>
      <ColumnMappingModal
        isOpen={!!columnMappingFile}
        onClose={handleColumnMappingClose}
        onConfirm={handleColumnMappingConfirm}
        columns={columnMappingDataset?.csvColumns ?? []}
        rawData={columnMappingDataset?.csvRawData ?? []}
        fileName={columnMappingFile?.file.name ?? ""}
      />

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
        <ContributionFileDropOverlay
          isDragging={isDragging}
          fileKind={draggedFileType ?? "mixed"}
          fileName={draggedFileName}
        />

        <Form
          className={
            datasets.length > 0
              ? "flex min-h-0 w-full flex-1 flex-col"
              : "space-y-10"
          }
          onSubmit={submit}
        >
          {datasets.length === 0 && (
            <div className="border-border bg-surface mb-8 rounded-xl border p-6 shadow-sm">
              <h2 className="text-foreground mb-4 text-xl font-semibold">
                Upload CSV or JSON Files
              </h2>
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
                multiple={true}
              />
            </div>
          )}

          {datasets.length > 0 && (
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <DatasetTabs
                datasets={datasets}
                activeDatasetId={activeDatasetId}
                onDatasetSelect={handleDatasetSelect}
                onDatasetRemove={handleDatasetRemove}
                onNewDataset={handleNewDataset}
                instrumentOptions={instrumentOptions}
                edgeOptions={edgeOptions}
                updateDataset={updateDataset}
              />

              {activeDataset && (
                <DatasetMissingFieldsMessage dataset={activeDataset} />
              )}

              {activeDataset && (
                <DatasetContent
                  key={activeDataset.id}
                  dataset={activeDataset}
                  onDatasetUpdate={updateDataset}
                  onReloadData={() => processDatasetData(activeDataset.id)}
                  instrumentOptions={instrumentOptions}
                  edgeOptions={edgeOptions}
                  calibrationOptions={calibrationOptions.map((c) => ({
                    id: c.id,
                    name: c.name,
                  }))}
                  vendors={vendors.map((v) => ({
                    id: v.id,
                    name: v.name ?? "",
                  }))}
                  isLoadingInstruments={isLoadingInstruments}
                  isLoadingEdges={isLoadingEdges}
                  isLoadingCalibrations={isLoadingCalibrations}
                  isLoadingVendors={isLoadingVendors}
                />
              )}
            </div>
          )}

          {submitStatus && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                submitStatus.type === "success"
                  ? "border-success/40 bg-success/10 text-success-foreground"
                  : "border-danger/40 bg-danger/10 text-danger-foreground"
              }`}
            >
              {submitStatus.message}
            </div>
          )}

          {datasets.length > 0 && (
            <div className="flex items-center justify-end">
              <Tooltip delay={0}>
                <HeroButton
                  type="submit"
                  variant="primary"
                  isDisabled={isPending}
                  className="gap-2 px-6 font-medium"
                >
                  {isPending ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      <span>
                        Submit {datasets.length} Dataset
                        {datasets.length > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </HeroButton>
                <Tooltip.Content className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg">
                  Submit all datasets for review. Files will remain private
                  until approved by an administrator.
                </Tooltip.Content>
              </Tooltip>
            </div>
          )}
        </Form>
      </div>
    </>
  );
}
