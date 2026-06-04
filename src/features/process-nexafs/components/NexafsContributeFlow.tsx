"use client";

import { useCallback, type ReactNode } from "react";
import { Form } from "@heroui/react";
import {
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { ContributionFileDropOverlay } from "@/components/contribute";
import {
  ColumnMappingModal,
  NexafsUploadPortal,
  DatasetTabs,
  DatasetContent,
  useDatasetStatus,
} from "~/features/process-nexafs/ui";
import {
  Tooltip,
  Label,
  Description,
  ErrorMessage,
} from "@heroui/react";
import { Button as HeroButton } from "@heroui/react";
import type { DatasetState, CSVColumnMappings } from "../types";
import type { SubmitStatus } from "../hooks/useNexafsSubmit";
import {
  GlobalFileDropZoneProvider,
  useGlobalFileDropZoneContext,
  globalDropZoneProps,
  GLOBAL_DROP_ZONE_IDS,
} from "~/hooks/useGlobalFileDropZone";
import { appendPendingAuxFiles } from "~/lib/pending-aux-file";
import { inferAuxFileKindFromBatch } from "~/lib/aux-file-client";
import {
  getNexafsAuxUploadDefaults,
  setNexafsAuxUploadDefaults,
} from "~/lib/nexafs-aux-upload-defaults";

type InstrumentOption = { id: string; name: string; facilityName?: string };
type EdgeOption = { id: string; targetatom: string; corestate: string };
type VendorOption = { id: string; name: string | null; url?: string | null };

export type NexafsContributeFlowProps = {
  datasets: DatasetState[];
  activeDatasetId: string | null;
  updateDataset: (
    id: string,
    updates:
      | Partial<DatasetState>
      | ((dataset: DatasetState) => Partial<DatasetState>),
  ) => void;
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
  onAuxValidationError?: (message: string) => void;
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
    onAuxValidationError,
  } = props;

  const reportAuxError = useCallback(
    (message: string) => {
      onAuxValidationError?.(message);
    },
    [onAuxValidationError],
  );

  const queueExperimentAux = useCallback(
    (files: File[]) => {
      if (!activeDatasetId) {
        return;
      }
      const defaults = getNexafsAuxUploadDefaults();
      const batchKind = inferAuxFileKindFromBatch(files).kind;
      if (batchKind !== defaults.kind) {
        setNexafsAuxUploadDefaults({ ...defaults, kind: batchKind });
      }
      updateDataset(activeDatasetId, (dataset) => ({
        pendingExperimentAuxFiles: appendPendingAuxFiles(
          dataset.pendingExperimentAuxFiles,
          files,
          "experiment",
          batchKind,
          defaults.description,
          reportAuxError,
        ),
      }));
    },
    [activeDatasetId, reportAuxError, updateDataset],
  );

  const queueSampleAux = useCallback(
    (files: File[]) => {
      if (!activeDatasetId) {
        return;
      }
      const defaults = getNexafsAuxUploadDefaults();
      const batchKind = inferAuxFileKindFromBatch(files).kind;
      if (batchKind !== defaults.kind) {
        setNexafsAuxUploadDefaults({ ...defaults, kind: batchKind });
      }
      updateDataset(activeDatasetId, (dataset) => ({
        pendingSampleAuxFiles: appendPendingAuxFiles(
          dataset.pendingSampleAuxFiles,
          files,
          "sample",
          batchKind,
          defaults.description,
          reportAuxError,
        ),
      }));
    },
    [activeDatasetId, reportAuxError, updateDataset],
  );

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const columnMappingDataset = columnMappingFile
    ? datasets.find((d) => d.id === columnMappingFile.datasetId)
    : null;

  return (
    <GlobalFileDropZoneProvider
      spectrumDropEnabled
      newDatasetUploadLabel={
        datasets.length > 0 ? "a new dataset" : ""
      }
      onSpectrumFiles={(files) => {
        void handleFilesSelected(files);
      }}
      onExperimentAuxFiles={queueExperimentAux}
      onSampleAuxFiles={queueSampleAux}
    >
      <ColumnMappingModal
        isOpen={!!columnMappingFile}
        onClose={handleColumnMappingClose}
        onConfirm={handleColumnMappingConfirm}
        columns={columnMappingDataset?.csvColumns ?? []}
        rawData={columnMappingDataset?.csvRawData ?? []}
        fileName={columnMappingFile?.file.name ?? ""}
      />

      <div
        className={
          datasets.length > 0
            ? "mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col"
            : "mx-auto flex w-full max-w-7xl flex-col"
        }
      >
        <Form
          className={
            datasets.length > 0
              ? "flex min-h-0 w-full flex-1 flex-col"
              : "h-auto w-full space-y-10"
          }
          onSubmit={submit}
        >
          {datasets.length === 0 && (
            <EmptyDatasetDropZone>
              <NexafsUploadPortal onFilesSelected={handleFilesSelected} />
            </EmptyDatasetDropZone>
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

          {submitStatus?.type === "error" && (
            <div
              role="alert"
              className="border-danger/40 bg-danger/10 text-danger-foreground rounded-lg border p-4 text-sm"
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
    </GlobalFileDropZoneProvider>
  );
}

function EmptyDatasetDropZone({ children }: { children: ReactNode }) {
  const dropState = useGlobalFileDropZoneContext();
  const zoneId = GLOBAL_DROP_ZONE_IDS.NEXAFS_NEW_DATASET;

  return (
    <div
      {...globalDropZoneProps(zoneId)}
      className="relative"
    >
      {children}
      <ContributionFileDropOverlay
        variant="inset"
        isDragging={dropState.showOverlayForZone(zoneId)}
        fileKind={dropState.spectrumFileKind ?? "mixed"}
        fileName={dropState.fileName}
        messageOverride={dropState.messageForZone(zoneId)}
      />
    </div>
  );
}
