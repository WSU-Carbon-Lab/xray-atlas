"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Papa from "papaparse";
import { DefaultButton as Button } from "~/app/components/Button";
import { SignInButton } from "~/app/components/SignInButton";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { FormField } from "~/app/components/FormField";
import { trpc } from "~/trpc/client";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { BrushCleaning } from "lucide-react";
import { Tooltip } from "@heroui/react";
import { useToast, ToastContainer } from "~/app/components/Toast";
import { FileUploadZone } from "~/app/components/contribute/nexafs/FileUploadZone";
import { ColumnMappingModal } from "~/app/components/contribute/nexafs/ColumnMappingModal";
import { DatasetTabs } from "~/app/components/contribute/nexafs/DatasetTabs";
import { DatasetContent } from "~/app/components/contribute/nexafs/DatasetContent";
import type {
  DatasetState,
  CSVColumnMappings,
  ExperimentTypeOption,
} from "~/app/contribute/nexafs/types";
import { createEmptyDatasetState, EXPERIMENT_TYPE_OPTIONS } from "~/app/contribute/nexafs/types";
import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";
import { extractGeometryPairs } from "~/app/contribute/nexafs/utils";
import { parseNexafsFilename, normalizeEdge, normalizeExperimentMode } from "~/app/contribute/nexafs/utils/filenameParser";
import { parseNexafsJson } from "~/app/contribute/nexafs/utils/jsonParser";

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
  const { isSignedIn } = useUser();
  const utils = trpc.useUtils();

  const [submitStatus, setSubmitStatus] = useState<
    { type: "success" | "error"; message: string } | undefined
  >(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFileType, setDraggedFileType] = useState<"csv" | "json" | "mixed" | null>(null);
  const dragCounterRef = useRef(0);
  const { toasts, removeToast, showToast } = useToast();

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

  const instrumentOptions = useMemo(
    () =>
      instrumentsData?.instruments?.map(
        (instrument: {
          id: string;
          name: string;
          facilities?: { name: string | null } | null;
        }) => ({
          id: instrument.id,
          name: instrument.name,
          facilityName: instrument.facilities?.name ?? undefined,
        }),
      ) ?? [],
    [instrumentsData?.instruments],
  );
  const edgeOptions = useMemo(
    () => edgesData?.edges ?? [],
    [edgesData?.edges],
  );
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
  const [newCalibrationDescription, setNewCalibrationDescription] =
    useState("");
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

  // Update dataset helper - memoized to prevent infinite loops
  const updateDataset = useCallback(
    (datasetId: string, updates: Partial<DatasetState>) => {
      setDatasets((prev) =>
        prev.map((d) => (d.id === datasetId ? { ...d, ...updates } : d)),
      );
    },
    [],
  );

  // Process dataset data from CSV - memoized to prevent recreation
  const processDatasetData = useCallback(
    (datasetId: string) => {
      const dataset = datasets.find((d) => d.id === datasetId);
      if (!dataset || dataset.csvRawData.length === 0) return;

      const energyColumn = dataset.columnMappings.energy;
      const absorptionColumn = dataset.columnMappings.absorption;
      const thetaColumn = dataset.columnMappings.theta;
      const phiColumn = dataset.columnMappings.phi;

      if (!energyColumn || !absorptionColumn) {
        return;
      }

      try {
        const spectrumPoints: SpectrumPoint[] = [];

        for (const row of dataset.csvRawData) {
          const energyValue = row[energyColumn];
          const absorptionValue = row[absorptionColumn];

          const energyStr = typeof energyValue === "string" || typeof energyValue === "number" ? String(energyValue) : "";
          const absorptionStr = typeof absorptionValue === "string" || typeof absorptionValue === "number" ? String(absorptionValue) : "";
          const energy = parseFloat(energyStr.trim());
          const absorption = parseFloat(absorptionStr.trim());

          if (isNaN(energy) || isNaN(absorption)) continue;

          const point: SpectrumPoint = { energy, absorption };

          if (thetaColumn && row[thetaColumn] !== undefined && row[thetaColumn] !== null) {
            const thetaValueRaw = row[thetaColumn];
            const thetaStr = typeof thetaValueRaw === "string" || typeof thetaValueRaw === "number" ? String(thetaValueRaw) : "";
            const thetaValue = parseFloat(thetaStr.trim());
            if (!isNaN(thetaValue)) {
              point.theta = thetaValue;
            }
          } else if (dataset.fixedTheta !== undefined && dataset.fixedTheta !== "") {
            const fixedThetaValue = parseFloat(dataset.fixedTheta);
            if (!isNaN(fixedThetaValue)) {
              point.theta = fixedThetaValue;
            }
          }

          if (phiColumn && row[phiColumn] !== undefined && row[phiColumn] !== null) {
            const phiValueRaw = row[phiColumn];
            const phiStr = typeof phiValueRaw === "string" || typeof phiValueRaw === "number" ? String(phiValueRaw) : "";
            const phiValue = parseFloat(phiStr.trim());
            if (!isNaN(phiValue)) {
              point.phi = phiValue;
            }
          } else if (dataset.fixedPhi !== undefined && dataset.fixedPhi !== "") {
            const fixedPhiValue = parseFloat(dataset.fixedPhi);
            if (!isNaN(fixedPhiValue)) {
              point.phi = fixedPhiValue;
            }
          }

          spectrumPoints.push(point);
        }

        updateDataset(datasetId, {
          spectrumPoints,
          spectrumError: undefined,
        });
      } catch (error) {
        updateDataset(datasetId, {
          spectrumError:
            error instanceof Error
              ? error.message
              : "Failed to process spectrum data.",
        });
      }
    },
    [datasets, updateDataset],
  );

  // File upload handling
  const handleFilesSelected = useCallback(async (files: File[]) => {
    for (const file of files) {
      const dataset = createEmptyDatasetState(file);

      const parsedFilename = parseNexafsFilename(file.name);

      const updates: Partial<DatasetState> = {};

      if (parsedFilename.edge) {
        const normalizedEdge = normalizeEdge(parsedFilename.edge);
        if (normalizedEdge) {
          const matchingEdge = edgeOptions.find((edge) => {
            const edgeLabel = `${edge.targetatom}(${edge.corestate})`;
            return edgeLabel === normalizedEdge || edgeLabel.toLowerCase() === normalizedEdge.toLowerCase();
          });
          if (matchingEdge) {
            updates.edgeId = matchingEdge.id;
          }
        }
      }

      if (parsedFilename.experimentMode) {
        const normalizedMode = normalizeExperimentMode(parsedFilename.experimentMode);
        if (normalizedMode && EXPERIMENT_TYPE_OPTIONS.some((opt) => opt.value === normalizedMode)) {
          updates.experimentType = normalizedMode as ExperimentTypeOption;
        }
      }

      if (parsedFilename.facility) {
        const matchingInstrument = instrumentOptions.find((inst) => {
          const facilityName = inst.facilityName?.toUpperCase().replace(/\s+/g, "");
          const parsedFacility = parsedFilename.facility?.toUpperCase().replace(/\s+/g, "");
          return (facilityName === parsedFacility) ||
                 (facilityName?.includes(parsedFacility ?? "") ?? false) ||
                 (parsedFacility?.includes(facilityName ?? "") ?? false);
        });
        if (matchingInstrument) {
          updates.instrumentId = matchingInstrument.id;
        }
      }

      if (parsedFilename.beamline) {
        const matchingInstrument = instrumentOptions.find((inst) => {
          const instrumentName = inst.name.toUpperCase().replace(/\s+/g, "");
          const parsedBeamline = parsedFilename.beamline?.toUpperCase().replace(/\s+/g, "");
          return instrumentName === parsedBeamline ||
                 instrumentName.includes(parsedBeamline ?? "") ||
                 parsedBeamline?.includes(instrumentName);
        });
        if (matchingInstrument && !updates.instrumentId) {
          updates.instrumentId = matchingInstrument.id;
        }
      }

      setDatasets((prev) => {
        const updated = [...prev, { ...dataset, ...updates }];
        if (!activeDatasetId) {
          setActiveDatasetId(dataset.id);
        }
        return updated;
      });

      const isJson = file.name.toLowerCase().endsWith(".json");

      try {
        if (isJson) {
          const { spectrumPoints, columns, rawData } = await parseNexafsJson(file);

          const detectedEnergyCol = columns.find((col) =>
            col.toLowerCase().includes("energy") ||
            col.toLowerCase().includes("ev") ||
            col.toLowerCase().includes("photon"),
          );

          const detectedAbsorptionCol = columns.find((col) =>
            col.toLowerCase().includes("absorption") ||
            col.toLowerCase().includes("abs") ||
            col.toLowerCase().includes("intensity") ||
            col.toLowerCase().includes("signal"),
          );

          const energyCol = detectedEnergyCol ?? columns[0] ?? "";
          const absorptionCol = detectedAbsorptionCol ?? columns[1] ?? "";

          const thetaCol = columns.find((col) =>
            col.toLowerCase().includes("theta"),
          );

          const phiCol = columns.find((col) =>
            col.toLowerCase().includes("phi"),
          );

          const columnMappings: CSVColumnMappings = {
            energy: energyCol,
            absorption: absorptionCol,
            theta: thetaCol ?? undefined,
            phi: phiCol ?? undefined,
          };

          updateDataset(dataset.id, {
            ...updates,
            csvColumns: columns,
            csvRawData: rawData,
            columnMappings,
            spectrumPoints,
          });

          if (spectrumPoints.length > 0) {
            setTimeout(() => {
              processDatasetData(dataset.id);
            }, 50);
          } else {
            const missingColumns: string[] = [];
            if (!columnMappings.energy) {
              missingColumns.push("Energy");
            }
            if (!columnMappings.absorption) {
              missingColumns.push("Absorption");
            }

            if (missingColumns.length > 0) {
              showToast(
                `Missing required columns: ${missingColumns.join(", ")}. Please map columns in the table view.`,
                "error",
                8000
              );
            }
          }
        } else {
          const parsed = await parseCSVFile(file);
          const columns = parsed.meta.fields ?? [];

          if (columns.length > 0) {
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
              energy: energyCol ?? columns[0] ?? "",
              absorption: absorptionCol ?? columns[1] ?? "",
              theta: thetaCol ?? undefined,
              phi: phiCol ?? undefined,
            };

            const missingColumns: string[] = [];
            if (!columnMappings.energy) missingColumns.push("Energy");
            if (!columnMappings.absorption) missingColumns.push("Absorption");

            updateDataset(dataset.id, {
              ...updates,
              csvColumns: columns,
              csvRawData: parsed.data,
              columnMappings,
            });

            if (missingColumns.length > 0) {
              showToast(
                `Missing required columns: ${missingColumns.join(", ")}. Please map columns in the table view.`,
                "error",
                8000
              );
            }

            if (columnMappings.energy && columnMappings.absorption) {
              setTimeout(() => {
                processDatasetData(dataset.id);
              }, 50);
            }
          } else {
            showToast(
              "CSV file has no columns. Please check the file format.",
              "error",
              8000
            );
          }
        }
      } catch (error) {
        console.error(`Failed to parse ${isJson ? "JSON" : "CSV"}`, error);
        const errorMessage = error instanceof Error
          ? error.message
          : `Failed to parse ${isJson ? "JSON" : "CSV"} file.`;

        updateDataset(dataset.id, {
          ...updates,
          spectrumError: errorMessage,
        });

        showToast(
          `Failed to process ${file.name}: ${errorMessage}`,
          "error",
          10000
        );
      }
    }
  }, [updateDataset, processDatasetData, showToast, activeDatasetId, edgeOptions, instrumentOptions]);


  const handleColumnMappingConfirm = (
    mappings: CSVColumnMappings,
    fixedValues?: { theta?: string; phi?: string },
  ) => {
    if (!columnMappingFile) return;

    const updates: Partial<DatasetState> = {
      columnMappings: mappings,
    };

    if (fixedValues) {
      if (fixedValues.theta !== undefined) {
        updates.fixedTheta = fixedValues.theta;
      }
      if (fixedValues.phi !== undefined) {
        updates.fixedPhi = fixedValues.phi;
      }
    }

    const datasetId = columnMappingFile.datasetId;
    updateDataset(datasetId, updates);
    setColumnMappingFile(null);
    // Process immediately after column mappings are confirmed
    setTimeout(() => {
      processDatasetData(datasetId);
    }, 100);
  };

  const handleColumnMappingClose = () => {
    setColumnMappingFile(null);
  };

  // Create a stable dependency string for datasets
  // Exclude spectrumPoints.length to avoid circular dependency - we only track input changes (mappings, raw data)
  const datasetsDependency = useMemo(
    () =>
      datasets
        .map(
          (d) =>
            `${d.id}:${d.columnMappings.energy}:${d.columnMappings.absorption}:${d.columnMappings.theta ?? ""}:${d.columnMappings.phi ?? ""}:${d.fixedTheta ?? ""}:${d.fixedPhi ?? ""}:${d.csvRawData.length}`,
        )
        .join(","),
    [datasets],
  );

  // Process dataset when column mappings change (triggered by inline mapping)
  // Only depends on datasetsDependency and processDatasetData - datasets is removed to avoid circular dependency
  // datasetsDependency already captures all necessary input changes (column mappings, fixed values, raw data length)
  // Note: datasets is used in the effect body but not in deps - this is intentional to avoid circular dependency.
  // Since datasetsDependency is computed from datasets, when datasets changes, datasetsDependency changes,
  // triggering the effect with the latest datasets through closure.
  useEffect(() => {
    datasets.forEach((dataset) => {
      if (
        dataset.csvRawData.length > 0 &&
        dataset.columnMappings.energy &&
        dataset.columnMappings.absorption
      ) {
        // Always reprocess when mappings change to ensure plot updates reactively
        processDatasetData(dataset.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetsDependency, processDatasetData]);

  // Global drag and drop handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);

        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          const items = Array.from(e.dataTransfer.items);
          const fileTypes = items
            .filter((item) => item.kind === "file")
            .map((item) => {
              const mimeType = item.type.toLowerCase();
              if (mimeType === "application/json" || mimeType === "text/json") return "json";
              if (mimeType === "text/csv" || mimeType === "application/csv") return "csv";
              return null;
            })
            .filter((type): type is "csv" | "json" => type !== null);

          if (fileTypes.length > 0) {
            const uniqueTypes = Array.from(new Set(fileTypes));
            if (uniqueTypes.length === 1) {
              setDraggedFileType(uniqueTypes[0]!);
            } else {
              setDraggedFileType("mixed");
            }
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
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      setDraggedFileType(null);

      const files = Array.from(e.dataTransfer?.files ?? []).filter(
        (file) => {
          const fileName = file.name.toLowerCase();
          return fileName.endsWith(".csv") || fileName.endsWith(".json");
        }
      );

      if (files.length > 0) {
        void handleFilesSelected(files);
      }
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

  // Dataset management
  const handleDatasetSelect = (datasetId: string) => {
    setActiveDatasetId(datasetId);
  };

  const handleDatasetRemove = (datasetId: string) => {
    setDatasets((prev) => {
      const filtered = prev.filter((d) => d.id !== datasetId);
      if (activeDatasetId === datasetId) {
        setActiveDatasetId(
          filtered.length > 0
            ? (filtered[filtered.length - 1]?.id ?? null)
            : null,
        );
      }
      return filtered;
    });
  };

  const handleDatasetRename = (datasetId: string, newName: string) => {
    updateDataset(datasetId, { fileName: newName });
  };


  // Submission
  const createNexafsMutation =
    trpc.experiments.createWithSpectrum.useMutation();

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
        if (!dataset.moleculeId) {
          setSubmitStatus({
            type: "error",
            message: `Dataset "${dataset.fileName}": Please select a molecule.`,
          });
          return;
        }

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
            moleculeId: dataset.moleculeId, // Assert non-null after validation check above
            identifier: sampleIdentifier,
            processMethod: dataset.sampleInfo.processMethod ?? undefined,
            substrate:
              dataset.sampleInfo.substrate.trim() === ""
                ? undefined
                : dataset.sampleInfo.substrate.trim(),
            solvent:
              dataset.sampleInfo.solvent.trim() === ""
                ? undefined
                : dataset.sampleInfo.solvent.trim(),
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
            <div className="border-t-accent mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300"></div>
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
            className="hover:text-accent dark:hover:text-accent-light inline-flex items-center gap-2 text-sm text-gray-600 transition-colors dark:text-gray-400"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to contribution options
          </Link>
          <Tooltip
            content="Clear all uploaded datasets and reset the form"
            classNames={{
              base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
            }}
          >
            <Button type="button" variant="bordered" onClick={clearForm}>
              <BrushCleaning className="h-4 w-4" />
              <span>Clear Form</span>
            </Button>
          </Tooltip>
        </div>

        <div className="mx-auto max-w-7xl">
          <ToastContainer toasts={toasts} onRemove={removeToast} />
          <h1 className="mb-3 text-4xl font-bold text-gray-900 dark:text-gray-100">
            Upload NEXAFS Experiment
          </h1>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
            Contribute Near-Edge X-ray Absorption Fine Structure (NEXAFS) data
            including sample metadata, geometry, and spectral measurements. You
            can upload multiple datasets and process them through tabs.
          </p>

          {/* Drag and Drop Overlay */}
          {isDragging && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 rounded-2xl border-4 border-dashed border-accent bg-white/95 p-12 shadow-2xl dark:bg-gray-900/95">
                <DocumentArrowUpIcon className="h-24 w-24 animate-bounce text-accent" />
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {draggedFileType === "json"
                    ? "Drop JSON file here to upload"
                    : draggedFileType === "csv"
                      ? "Drop CSV file here to upload"
                      : "Drop CSV or JSON files here to upload"}
                </p>
              </div>
            </div>
          )}

          <form className="space-y-10" onSubmit={handleSubmit}>

            {/* File Upload Zone */}
            {datasets.length === 0 && (
              <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Upload CSV or JSON Files
                </h2>
                <FileUploadZone
                  onFilesSelected={handleFilesSelected}
                  multiple={true}
                />
              </div>
            )}

            {/* Dataset Tabs */}
            {datasets.length > 0 && (
              <div className="flex-1">
                <DatasetTabs
                  datasets={datasets}
                  activeDatasetId={activeDatasetId}
                  onDatasetSelect={handleDatasetSelect}
                  onDatasetRemove={handleDatasetRemove}
                  onDatasetRename={handleDatasetRename}
                  onNewDataset={async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv,.json,text/csv,application/json";
                    input.multiple = true;
                    input.onchange = async (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files ?? []);
                      if (files.length > 0) {
                        await handleFilesSelected(files);
                      }
                    };
                    input.click();
                  }}
                />

                  {/* Active Dataset Content */}
                  {activeDataset && (
                    <DatasetContent
                      key={activeDataset.id}
                      dataset={activeDataset}
                      onDatasetUpdate={updateDataset}
                      onReloadData={() => {
                        if (activeDataset.id) {
                          processDatasetData(activeDataset.id);
                        }
                      }}
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
              </div>
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
                <Tooltip
                  content="Submit all datasets for review. Files will remain private until approved by an administrator."
                  classNames={{
                    base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
                  }}
                >
                  <Button
                    type="submit"
                    disabled={createNexafsMutation.isPending}
                    className="px-6"
                  >
                    {createNexafsMutation.isPending ? (
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
                  </Button>
                </Tooltip>
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
        onClose={handleColumnMappingClose}
        onConfirm={handleColumnMappingConfirm}
        columns={
          columnMappingFile
            ? (datasets.find((d) => d.id === columnMappingFile.datasetId)
                ?.csvColumns ?? [])
            : []
        }
        rawData={
          columnMappingFile
            ? (datasets.find((d) => d.id === columnMappingFile.datasetId)
                ?.csvRawData ?? [])
            : []
        }
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
            <Tooltip
              content="Cancel creating a new edge"
              classNames={{
                base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
              }}
            >
              <Button
                type="button"
                variant="bordered"
                onClick={() => setShowEdgeDialog(false)}
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </Tooltip>
            <Tooltip
              content="Create a new absorption edge with the specified target atom and core state"
              classNames={{
                base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
              }}
            >
              <Button
                type="button"
                variant="solid"
                onClick={handleCreateEdge}
                disabled={createEdgeMutation.isPending}
              >
                {createEdgeMutation.isPending ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Edge</span>
                  </>
                )}
              </Button>
            </Tooltip>
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
            <Tooltip
              content="Cancel creating a new calibration method"
              classNames={{
                base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
              }}
            >
              <Button
                type="button"
                variant="bordered"
                onClick={() => setShowCalibrationDialog(false)}
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </Tooltip>
            <Tooltip
              content="Create a new calibration method with the specified name and description"
              classNames={{
                base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
              }}
            >
              <Button
                type="button"
                variant="solid"
                onClick={handleCreateCalibration}
                disabled={createCalibrationMutation.isPending}
              >
                {createCalibrationMutation.isPending ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Method</span>
                  </>
                )}
              </Button>
            </Tooltip>
          </div>
        </div>
      </SimpleDialog>

      {renderContent()}
    </>
  );
}
