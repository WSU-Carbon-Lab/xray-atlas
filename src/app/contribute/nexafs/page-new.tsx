"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Papa from "papaparse";
import { DefaultButton as Button } from "~/app/components/Button";
import { SignInButton } from "~/app/components/SignInButton";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { FormField } from "~/app/components/FormField";
import { trpc } from "~/trpc/client";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { FileUploadZone } from "~/app/components/contribute/nexafs/FileUploadZone";
import { ColumnMappingModal } from "~/app/components/contribute/nexafs/ColumnMappingModal";
import { DatasetTabs } from "~/app/components/contribute/nexafs/DatasetTabs";
import { DatasetContent } from "~/app/components/contribute/nexafs/DatasetContent";
import type { DatasetState, CSVColumnMappings, SpectrumStats } from "~/app/contribute/nexafs/types";
import { createEmptyDatasetState } from "~/app/contribute/nexafs/types";
import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";
import { analyzeNumericColumns, extractGeometryPairs } from "~/app/contribute/nexafs/utils";

const parseCSVFile = (
  file: File,
): Promise<Papa.ParseResult<Record<string, unknown>>> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });

export default function NEXAFSContributePage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const utils = trpc.useUtils();

  const [submitStatus, setSubmitStatus] = useState<
    { type: "success" | "error"; message: string } | undefined
  >(undefined);

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const { data: agreementStatus, isLoading: isLoadingAgreement } =
    trpc.users.getContributionAgreementStatus.useQuery(undefined, {
      enabled: isSignedIn ?? false,
    });

  useEffect(() => {
    if (isSignedIn && !isLoadingAgreement && !agreementStatus?.accepted) {
      setShowAgreementModal(true);
    }
  }, [isSignedIn, isLoadingAgreement, agreementStatus?.accepted]);

  const handleAgreementAccepted = () => {
    setShowAgreementModal(false);
  };

  // Datasets state
  const [datasets, setDatasets] = useState<DatasetState[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [columnMappingFile, setColumnMappingFile] = useState<{
    file: File;
    datasetId: string;
  } | null>(null);

  // Vendors, instruments, edges, calibration methods
  const { data: vendorsData, isLoading: isLoadingVendors } =
    trpc.vendors.list.useQuery({ limit: 100 });
  const { data: instrumentsData, isLoading: isLoadingInstruments } =
    trpc.instruments.list.useQuery({ limit: 100 });
  const { data: edgesData, isLoading: isLoadingEdges } =
    trpc.experiments.listEdges.useQuery();
  const { data: calibrationMethodsData, isLoading: isLoadingCalibrations } =
    trpc.experiments.listCalibrationMethods.useQuery();

  const instrumentOptions =
    instrumentsData?.instruments?.map((instrument) => ({
      id: instrument.id,
      name: instrument.name,
      facilityName: instrument.facilities?.name ?? undefined,
    })) ?? [];
  const edgeOptions = edgesData?.edges ?? [];
  const calibrationOptions = calibrationMethodsData?.calibrationMethods ?? [];

  // Edge creation dialog
  const [showEdgeDialog, setShowEdgeDialog] = useState(false);
  const [newEdgeTargetAtom, setNewEdgeTargetAtom] = useState("");
  const [newEdgeCoreState, setNewEdgeCoreState] = useState("");
  const createEdgeMutation = trpc.experiments.createEdge.useMutation();

  const handleCreateEdge = async () => {
    if (!newEdgeTargetAtom.trim() || !newEdgeCoreState.trim()) {
      return;
    }

    try {
      await createEdgeMutation.mutateAsync({
        targetatom: newEdgeTargetAtom.trim(),
        corestate: newEdgeCoreState.trim(),
      });
      await utils.experiments.listEdges.invalidate();
      setShowEdgeDialog(false);
      setNewEdgeTargetAtom("");
      setNewEdgeCoreState("");
    } catch (error) {
      console.error("Failed to create edge", error);
    }
  };

  // Calibration method creation dialog
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [newCalibrationName, setNewCalibrationName] = useState("");
  const [newCalibrationDescription, setNewCalibrationDescription] = useState("");
  const createCalibrationMutation =
    trpc.experiments.createCalibrationMethod.useMutation();

  const handleCreateCalibration = async () => {
    if (!newCalibrationName.trim()) {
      return;
    }

    try {
      await createCalibrationMutation.mutateAsync({
        name: newCalibrationName.trim(),
        description: newCalibrationDescription.trim() || undefined,
      });
      await utils.experiments.listCalibrationMethods.invalidate();
      setShowCalibrationDialog(false);
      setNewCalibrationName("");
      setNewCalibrationDescription("");
    } catch (error) {
      console.error("Failed to create calibration method", error);
    }
  };

  // File upload handling
  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      const dataset = createEmptyDatasetState(file);
      setDatasets((prev) => {
        const updated = [...prev, dataset];
        if (!activeDatasetId) {
          setActiveDatasetId(dataset.id);
        }
        return updated;
      });

      // Parse CSV to show column mapping modal
      try {
        const parsed = await parseCSVFile(file);
        const columns = parsed.meta.fields || [];

        if (columns.length > 0) {
          // Auto-detect columns
          const energyCol = columns.find(
            (col) =>
              col.toLowerCase().includes("energy") ||
              col.toLowerCase().includes("ev") ||
              col.toLowerCase().includes("photon"),
          );
          const absorptionCol = columns.find(
            (col) =>
              col.toLowerCase().includes("absorption") ||
              col.toLowerCase().includes("abs") ||
              col.toLowerCase().includes("intensity") ||
              col.toLowerCase().includes("signal"),
          );
          const thetaCol = columns.find((col) =>
            col.toLowerCase().includes("theta"),
          );
          const phiCol = columns.find((col) =>
            col.toLowerCase().includes("phi"),
          );

          const columnMappings: CSVColumnMappings = {
            energy: energyCol || columns[0] || "",
            absorption: absorptionCol || columns[1] || "",
            theta: thetaCol || undefined,
            phi: phiCol || undefined,
          };

          updateDataset(dataset.id, {
            csvColumns: columns,
            csvRawData: parsed.data,
            columnMappings,
          });

          // Show column mapping modal if auto-detection might be wrong
          if (!energyCol || !absorptionCol) {
            setColumnMappingFile({ file, datasetId: dataset.id });
          } else {
            // Auto-process if columns were detected
            setTimeout(() => {
              processDatasetData(dataset.id);
            }, 100);
          }
        }
      } catch (error) {
        console.error("Failed to parse CSV", error);
        updateDataset(dataset.id, {
          spectrumError:
            error instanceof Error
              ? error.message
              : "Failed to parse CSV file.",
        });
      }
    }
  };

  const handleColumnMappingConfirm = (mappings: CSVColumnMappings) => {
    if (!columnMappingFile) return;

    updateDataset(columnMappingFile.datasetId, {
      columnMappings: mappings,
    });
    setColumnMappingFile(null);
    // Process will be triggered by useEffect
  };

  // Process dataset when column mappings change
  useEffect(() => {
    datasets.forEach((dataset) => {
      if (
        dataset.csvRawData.length > 0 &&
        dataset.columnMappings.energy &&
        dataset.columnMappings.absorption &&
        dataset.spectrumPoints.length === 0
      ) {
        processDatasetData(dataset.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasets.length]);

  // Process dataset data from CSV
  const processDatasetData = (datasetId: string) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    if (!dataset || dataset.csvRawData.length === 0) return;

    const energyColumn = dataset.columnMappings.energy;
    const absorptionColumn = dataset.columnMappings.absorption;

    if (!energyColumn || !absorptionColumn) {
      updateDataset(datasetId, {
        spectrumError: "Select both energy and absorption columns.",
        spectrumPoints: [],
      });
      return;
    }

    const thetaColumn = dataset.columnMappings.theta;
    const phiColumn = dataset.columnMappings.phi;

    const numericColumns = new Set<string>([energyColumn, absorptionColumn]);
    if (thetaColumn) numericColumns.add(thetaColumn);
    if (phiColumn) numericColumns.add(phiColumn);

    const numericColumnValues = analyzeNumericColumns(
      dataset.csvRawData,
      numericColumns,
    );

    const invalidColumns = Array.from(numericColumns).filter(
      (column) => numericColumnValues[column]?.sanitizedInvalidRows.length,
    );

    if (invalidColumns.length > 0) {
      updateDataset(datasetId, {
        spectrumError: `Invalid numeric values detected in columns: ${invalidColumns.join(", ")}`,
        spectrumPoints: [],
      });
      return;
    }

    const spectrumPoints: SpectrumPoint[] = [];
    const energyStats = { min: Infinity, max: -Infinity, nanCount: 0, validCount: 0 };
    const absorptionStats = { min: Infinity, max: -Infinity, nanCount: 0, validCount: 0 };

    dataset.csvRawData.forEach((row) => {
      const energyValue = Number(row[energyColumn] ?? NaN);
      const absorptionValue = Number(row[absorptionColumn] ?? NaN);

      if (Number.isFinite(energyValue)) {
        energyStats.validCount += 1;
        energyStats.min = Math.min(energyStats.min, energyValue);
        energyStats.max = Math.max(energyStats.max, energyValue);
      } else {
        energyStats.nanCount += 1;
      }

      if (Number.isFinite(absorptionValue)) {
        absorptionStats.validCount += 1;
        absorptionStats.min = Math.min(absorptionStats.min, absorptionValue);
        absorptionStats.max = Math.max(absorptionStats.max, absorptionValue);
      } else {
        absorptionStats.nanCount += 1;
      }

      if (
        Number.isFinite(energyValue) &&
        Number.isFinite(absorptionValue)
      ) {
        const point: SpectrumPoint = {
          energy: energyValue,
          absorption: absorptionValue,
        };

        if (thetaColumn && row[thetaColumn] !== undefined) {
          const thetaValue = Number(row[thetaColumn]);
          if (Number.isFinite(thetaValue)) {
            point.theta = thetaValue;
          }
        }
        if (phiColumn && row[phiColumn] !== undefined) {
          const phiValue = Number(row[phiColumn]);
          if (Number.isFinite(phiValue)) {
            point.phi = phiValue;
          }
        }

        spectrumPoints.push(point);
      }
    });

    const spectrumStats: SpectrumStats = {
      totalRows: dataset.csvRawData.length,
      validPoints: spectrumPoints.length,
      energy: {
        min: energyStats.validCount > 0 ? energyStats.min : null,
        max: energyStats.validCount > 0 ? energyStats.max : null,
        nanCount: energyStats.nanCount,
        validCount: energyStats.validCount,
      },
      absorption: {
        min: absorptionStats.validCount > 0 ? absorptionStats.min : null,
        max: absorptionStats.validCount > 0 ? absorptionStats.max : null,
        nanCount: absorptionStats.nanCount,
        validCount: absorptionStats.validCount,
      },
    };

    updateDataset(datasetId, {
      spectrumPoints,
      spectrumStats,
      spectrumError: spectrumPoints.length === 0 ? "No valid data points found." : null,
    });
  };

  // Update dataset helper
  const updateDataset = (datasetId: string, updates: Partial<DatasetState>) => {
    setDatasets((prev) =>
      prev.map((d) => (d.id === datasetId ? { ...d, ...updates } : d)),
    );
  };

  // Dataset management
  const handleDatasetSelect = (datasetId: string) => {
    setActiveDatasetId(datasetId);
  };

  const handleDatasetRemove = (datasetId: string) => {
    setDatasets((prev) => {
      const filtered = prev.filter((d) => d.id !== datasetId);
      if (activeDatasetId === datasetId) {
        setActiveDatasetId(filtered.length > 0 ? filtered[filtered.length - 1]?.id ?? null : null);
      }
      return filtered;
    });
  };

  const handleDatasetRename = (datasetId: string, newName: string) => {
    updateDataset(datasetId, { fileName: newName });
  };

  // Submission
  const createNexafsMutation = trpc.experiments.createWithSpectrum.useMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus(undefined);

    if (datasets.length === 0) {
      setSubmitStatus({
        type: "error",
        message: "Please upload at least one dataset.",
      });
      return;
    }

    // Validate all datasets
    for (const dataset of datasets) {
      if (!dataset.moleculeId) {
        setSubmitStatus({
          type: "error",
          message: `Dataset "${dataset.fileName}": Please select a molecule.`,
        });
        return;
      }

      if (!dataset.instrumentId) {
        setSubmitStatus({
          type: "error",
          message: `Dataset "${dataset.fileName}": Please select an instrument.`,
        });
        return;
      }

      if (!dataset.edgeId) {
        setSubmitStatus({
          type: "error",
          message: `Dataset "${dataset.fileName}": Please select an absorption edge.`,
        });
        return;
      }

      if (dataset.spectrumPoints.length === 0) {
        setSubmitStatus({
          type: "error",
          message: `Dataset "${dataset.fileName}": No spectrum data found.`,
        });
        return;
      }

      const hasThetaMapping = Boolean(dataset.columnMappings.theta);
      const hasPhiMapping = Boolean(dataset.columnMappings.phi);

      if (hasThetaMapping !== hasPhiMapping) {
        setSubmitStatus({
          type: "error",
          message: `Dataset "${dataset.fileName}": Provide both theta and phi column mappings, or leave both unset.`,
        });
        return;
      }

      if (!hasThetaMapping && (!dataset.fixedTheta || !dataset.fixedPhi)) {
        setSubmitStatus({
          type: "error",
          message: `Dataset "${dataset.fileName}": Provide theta and phi values for fixed geometry.`,
        });
        return;
      }
    }

    // Submit each dataset
    try {
      for (const dataset of datasets) {
        const geometryInput =
          dataset.columnMappings.theta && dataset.columnMappings.phi
            ? {
                mode: "csv" as const,
                csvGeometries: extractGeometryPairs(dataset.spectrumPoints),
              }
            : {
                mode: "fixed" as const,
                fixed: {
                  theta: parseFloat(dataset.fixedTheta),
                  phi: parseFloat(dataset.fixedPhi),
                },
              };

        let vendorPayload:
          | { existingVendorId: string }
          | { name: string; url?: string }
          | undefined;

        if (dataset.sampleInfo.vendorId) {
          vendorPayload = { existingVendorId: dataset.sampleInfo.vendorId };
        } else if (dataset.sampleInfo.newVendorName.trim()) {
          vendorPayload = {
            name: dataset.sampleInfo.newVendorName.trim(),
            url: dataset.sampleInfo.newVendorUrl.trim() || undefined,
          };
        }

        const sampleIdentifier = crypto.randomUUID();

        await createNexafsMutation.mutateAsync({
          sample: {
            moleculeId: dataset.moleculeId,
            identifier: sampleIdentifier,
            processMethod:
              dataset.sampleInfo.processMethod || undefined,
            substrate: dataset.sampleInfo.substrate.trim() || undefined,
            solvent: dataset.sampleInfo.solvent.trim() || undefined,
            thickness:
              typeof dataset.sampleInfo.thickness === "number" &&
              Number.isFinite(dataset.sampleInfo.thickness)
                ? dataset.sampleInfo.thickness
                : undefined,
            molecularWeight:
              typeof dataset.sampleInfo.molecularWeight === "number" &&
              Number.isFinite(dataset.sampleInfo.molecularWeight)
                ? dataset.sampleInfo.molecularWeight
                : undefined,
            preparationDate: dataset.sampleInfo.preparationDate
              ? new Date(dataset.sampleInfo.preparationDate).toISOString()
              : undefined,
            vendor: vendorPayload ?? {},
          },
          experiment: {
            instrumentId: dataset.instrumentId,
            edgeId: dataset.edgeId,
            experimentType: dataset.experimentType,
            measurementDate: dataset.measurementDate
              ? new Date(dataset.measurementDate).toISOString()
              : undefined,
            calibrationId: dataset.calibrationId || undefined,
            referenceStandard: dataset.referenceStandard.trim() || undefined,
            isStandard: dataset.isStandard,
          },
          geometry: geometryInput,
          spectrum: {
            points: dataset.spectrumPoints,
          },
          peaksets: dataset.peaks.length > 0 ? dataset.peaks : undefined,
        });
      }

      setSubmitStatus({
        type: "success",
        message: `Successfully uploaded ${datasets.length} dataset(s).`,
      });

      // Clear form
      setDatasets([]);
      setActiveDatasetId(null);
    } catch (error) {
      console.error("Failed to submit NEXAFS data", error);
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit NEXAFS data. Please try again.",
      });
    }
  };

  const clearForm = () => {
    setDatasets([]);
    setActiveDatasetId(null);
    setSubmitStatus(undefined);
  };

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);

  const renderContent = () => {
    if (!isSignedIn) {
      return (
        <div className="container mx-auto flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Sign In Required
            </h1>
            <p className="mb-8 text-gray-600 dark:text-gray-400">
              You must be signed in to contribute NEXAFS experiments.
            </p>
            <div className="flex justify-center">
              <SignInButton variant="solid">Sign In</SignInButton>
            </div>
          </div>
        </div>
      );
    }

    if (isLoadingAgreement) {
      return (
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="border-t-wsu-crimson mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/contribute"
            className="hover:text-wsu-crimson dark:hover:text-wsu-crimson inline-flex items-center gap-2 text-sm text-gray-600 transition-colors dark:text-gray-400"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to contribution options
          </Link>
          <Button type="button" variant="bordered" onClick={clearForm}>
            Clear Form
          </Button>
        </div>

        <div className="mx-auto max-w-6xl">
          <h1 className="mb-3 text-4xl font-bold text-gray-900 dark:text-gray-100">
            Upload NEXAFS Experiment
          </h1>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
            Contribute Near-Edge X-ray Absorption Fine Structure (NEXAFS) data
            including sample metadata, geometry, and spectral measurements. You
            can upload multiple datasets and process them through tabs.
          </p>

          <form className="space-y-10" onSubmit={handleSubmit}>
            {/* File Upload Zone */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Upload CSV Files
              </h2>
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
                multiple={true}
              />
            </div>

            {/* Dataset Tabs */}
            {datasets.length > 0 && (
              <>
                <DatasetTabs
                  datasets={datasets}
                  activeDatasetId={activeDatasetId}
                  onDatasetSelect={handleDatasetSelect}
                  onDatasetRemove={handleDatasetRemove}
                  onDatasetRename={handleDatasetRename}
                />

                {/* Active Dataset Content */}
                {activeDataset && (
                  <DatasetContent
                    dataset={activeDataset}
                    onDatasetUpdate={updateDataset}
                    instrumentOptions={instrumentOptions}
                    edgeOptions={edgeOptions}
                    calibrationOptions={calibrationOptions}
                    vendors={vendorsData?.vendors ?? []}
                    isLoadingInstruments={isLoadingInstruments}
                    isLoadingEdges={isLoadingEdges}
                    isLoadingCalibrations={isLoadingCalibrations}
                    isLoadingVendors={isLoadingVendors}
                  />
                )}
              </>
            )}

            {/* Warning */}
            <div className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700 dark:border-yellow-900/40 dark:bg-yellow-900/10 dark:text-yellow-200">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span>
                  Please verify all information before submitting. Spectrum
                  uploads are final and will require administrator review for
                  changes.
                </span>
              </div>
            </div>

            {/* Submit Status */}
            {submitStatus && (
              <div
                className={`rounded-lg border p-4 text-sm ${
                  submitStatus.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-200"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200"
                }`}
              >
                {submitStatus.message}
              </div>
            )}

            {/* Submit Button */}
            {datasets.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Files remain private until reviewed and approved.
                </div>
                <Button
                  type="submit"
                  disabled={createNexafsMutation.isPending}
                  className="px-6"
                >
                  {createNexafsMutation.isPending
                    ? "Submitting..."
                    : `Submit ${datasets.length} Dataset${datasets.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  };

  return (
    <>
      <ContributionAgreementModal
        isOpen={showAgreementModal}
        onClose={() => {
          /* modal requires explicit agreement */
        }}
        onAgree={handleAgreementAccepted}
      />

      <ColumnMappingModal
        isOpen={!!columnMappingFile}
        onClose={() => setColumnMappingFile(null)}
        onConfirm={handleColumnMappingConfirm}
        columns={columnMappingFile ? datasets.find((d) => d.id === columnMappingFile.datasetId)?.csvColumns ?? [] : []}
        rawData={columnMappingFile ? datasets.find((d) => d.id === columnMappingFile.datasetId)?.csvRawData ?? [] : []}
        fileName={columnMappingFile?.file.name ?? ""}
      />

      <SimpleDialog
        isOpen={showEdgeDialog}
        onClose={() => setShowEdgeDialog(false)}
        title="Create New Edge"
      >
        <div className="space-y-4">
          <FormField
            label="Target Atom"
            type="text"
            name="targetAtom"
            value={newEdgeTargetAtom}
            onChange={(value) => setNewEdgeTargetAtom(value as string)}
            required
            placeholder="e.g., C, N, O"
            tooltip="The target atom for the absorption edge (e.g., C for carbon K-edge)"
          />
          <FormField
            label="Core State"
            type="text"
            name="coreState"
            value={newEdgeCoreState}
            onChange={(value) => setNewEdgeCoreState(value as string)}
            required
            placeholder="e.g., K, L1, L2, L3"
            tooltip="The core state of the electron (e.g., K for K-edge)"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="bordered"
              onClick={() => setShowEdgeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              onClick={handleCreateEdge}
              disabled={createEdgeMutation.isPending}
            >
              {createEdgeMutation.isPending ? "Creating..." : "Create Edge"}
            </Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={showCalibrationDialog}
        onClose={() => setShowCalibrationDialog(false)}
        title="Create New Calibration Method"
      >
        <div className="space-y-4">
          <FormField
            label="Name"
            type="text"
            name="calibrationName"
            value={newCalibrationName}
            onChange={(value) => setNewCalibrationName(value as string)}
            required
            placeholder="e.g., Carbon K-edge calibration"
            tooltip="The name of the calibration method"
          />
          <FormField
            label="Description"
            type="textarea"
            name="calibrationDescription"
            value={newCalibrationDescription}
            onChange={(value) => setNewCalibrationDescription(value as string)}
            placeholder="Optional description of the calibration method"
            tooltip="Additional details about the calibration method"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="bordered"
              onClick={() => setShowCalibrationDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              onClick={handleCreateCalibration}
              disabled={createCalibrationMutation.isPending}
            >
              {createCalibrationMutation.isPending
                ? "Creating..."
                : "Create Method"}
            </Button>
          </div>
        </div>
      </SimpleDialog>

      {renderContent()}
    </>
  );
}
