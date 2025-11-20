"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Papa from "papaparse";
import { DefaultButton as Button } from "~/app/components/Button";
import { SignInButton } from "~/app/components/SignInButton";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import { FormField } from "~/app/components/FormField";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import type {
  SpectrumPoint,
  SpectrumSelection,
} from "~/app/components/plots/SpectrumPlot";
import { trpc } from "~/trpc/client";
import { ProcessMethod } from "@prisma/client";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { MoleculeSelector } from "~/app/components/contribute/nexafs/MoleculeSelector";
import { SampleInformationSection } from "~/app/components/contribute/nexafs/SampleInformationSection";
import { ExperimentsSection } from "~/app/components/contribute/nexafs/ExperimentsSection";
import type {
  CSVColumnMappings,
  ColumnStats,
  ExperimentConfig,
  ExperimentDatasetMeta,
  GeometryMode,
  GeometryPayload,
  GeometryPair,
  SpectrumStats,
} from "~/app/contribute/nexafs/types";
import {
  analyzeNumericColumns,
  countPointsWithinRange,
  extractGeometryPairs,
  computeNormalizationForExperiment,
  rangesApproximatelyEqual,
  type BareAtomPoint,
} from "~/app/contribute/nexafs/utils";
import { useMoleculeSearch } from "./hooks/useMoleculeSearch";

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

const createEmptyExperiment = (): ExperimentConfig => ({
  id: crypto.randomUUID(),
  instrumentId: "",
  edgeId: "",
  experimentType: "TOTAL_ELECTRON_YIELD",
  measurementDate: "",
  calibrationId: "",
  referenceStandard: "",
  isStandard: false,
  fixedTheta: "",
  fixedPhi: "",
  spectrumPoints: [],
  normalizedPoints: null,
  normalization: null,
  spectrumFile: null,
  spectrumError: null,
  csvColumns: [],
  csvRawData: [],
  csvColumnMappings: { energy: "", absorption: "" },
  spectrumStats: null,
  selectionSummary: null,
  datasets: [],
  activeDatasetId: null,
});

export default function NEXAFSContributePage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const utils = trpc.useUtils();

  const [submitStatus, setSubmitStatus] = useState<
    { type: "success" | "error"; message: string } | undefined
  >(undefined);

  const {
    searchTerm,
    setSearchTerm,
    suggestions,
    manualResults,
    suggestionError,
    manualError,
    isSuggesting,
    isManualSearching,
    runManualSearch,
    selectedMolecule,
    selectedPreferredName,
    setSelectedPreferredName,
    selectMolecule,
    clearSelection,
    allMoleculeNames,
  } = useMoleculeSearch({
    onSelectionChange: () => setSubmitStatus(undefined),
  });

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

  // Molecule selection
  const bareAtomAbsorptionQuery = trpc.physics.getBareAtomAbsorption.useQuery(
    {
      formula: selectedMolecule?.chemicalFormula ?? "C",
    },
    {
      enabled: Boolean(selectedMolecule?.chemicalFormula),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

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
  const bareAtomPoints = bareAtomAbsorptionQuery.data?.points ?? null;
  const bareAtomError = bareAtomAbsorptionQuery.error?.message ?? null;

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
      const edge = await createEdgeMutation.mutateAsync({
        targetatom: newEdgeTargetAtom.trim(),
        corestate: newEdgeCoreState.trim(),
      });
      await utils.experiments.listEdges.invalidate();
      // Update all experiments to use the new edge if they don't have one
      setExperiments((prev) =>
        prev.map((exp) =>
          exp.edgeId === "" ? { ...exp, edgeId: edge.id } : exp,
        ),
      );
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
      const method = await createCalibrationMutation.mutateAsync({
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

  const [processMethod, setProcessMethod] = useState<ProcessMethod | "">("");
  const [substrate, setSubstrate] = useState("");
  const [solvent, setSolvent] = useState("");
  const [thickness, setThickness] = useState<number | "">("");
  const [molecularWeight, setMolecularWeight] = useState<number | "">("");
  const [preparationDate, setPreparationDate] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string | "">("");
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorUrl, setNewVendorUrl] = useState("");

  const [normalizationEnabled, setNormalizationEnabled] = useState(true);
  const [preEdgePointCount, setPreEdgePointCount] = useState(10);
  const [postEdgePointCount, setPostEdgePointCount] = useState(10);
  const [normalizationSelectionTarget, setNormalizationSelectionTarget] =
    useState<"pre" | "post" | null>(null);
  const [
    normalizationSelectionExperimentId,
    setNormalizationSelectionExperimentId,
  ] = useState<string | null>(null);
  const [showBareAtom, setShowBareAtom] = useState(true);

  // Experiments array - each experiment has its own configuration
  const [experiments, setExperiments] = useState<ExperimentConfig[]>([
    createEmptyExperiment(),
  ]);

  const createNexafsMutation =
    trpc.experiments.createWithSpectrum.useMutation();

  // Helper functions to update experiments
  const updateExperiment = (
    experimentId: string,
    updates: Partial<ExperimentConfig>,
  ) => {
    setExperiments((prev) =>
      prev.map((exp) =>
        exp.id === experimentId ? { ...exp, ...updates } : exp,
      ),
    );
  };

  const addExperiment = () => {
    setExperiments((prev) => [...prev, createEmptyExperiment()]);
  };

  const removeExperiment = (experimentId: string) => {
    setExperiments((prev) => {
      const filtered = prev.filter((exp) => exp.id !== experimentId);
      // Ensure at least one experiment exists
      return filtered.length === 0 ? [createEmptyExperiment()] : filtered;
    });
  };

  const addDatasetsToExperiment = (experimentId: string, files: File[]) => {
    const validFiles = files.filter((file) => file instanceof File);
    if (validFiles.length === 0) {
      return;
    }

    const newDatasets: ExperimentDatasetMeta[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      fileSize: file.size,
      label: file.name.replace(/\.[^.]+$/, ""),
      doi: "",
      processedAt: null,
    }));

    setExperiments((prev) =>
      prev.map((experiment) =>
        experiment.id === experimentId
          ? {
              ...experiment,
              datasets: [...experiment.datasets, ...newDatasets],
              activeDatasetId:
                newDatasets[newDatasets.length - 1]?.id ??
                experiment.activeDatasetId,
            }
          : experiment,
      ),
    );

    newDatasets
      .reduce<Promise<void>>(
        (chain, dataset) =>
          chain.then(async () => {
            if (dataset.file) {
              await handleSpectrumFile(dataset.file, experimentId, dataset.id);
            }
          }),
        Promise.resolve(),
      )
      .catch((error) => {
        console.error("Failed to process uploaded dataset(s)", error);
      });
  };

  const selectDatasetForExperiment = (
    experimentId: string,
    datasetId: string,
  ) => {
    const experiment = experiments.find((exp) => exp.id === experimentId);
    const dataset = experiment?.datasets.find((d) => d.id === datasetId);
    if (!dataset || !dataset.file) {
      return;
    }

    setExperiments((prev) =>
      prev.map((exp) =>
        exp.id === experimentId ? { ...exp, activeDatasetId: datasetId } : exp,
      ),
    );

    void handleSpectrumFile(dataset.file, experimentId, datasetId);
  };

  const updateDatasetDoi = (
    experimentId: string,
    datasetId: string,
    doi: string,
  ) => {
    setExperiments((prev) =>
      prev.map((exp) =>
        exp.id === experimentId
          ? {
              ...exp,
              datasets: exp.datasets.map((dataset) =>
                dataset.id === datasetId
                  ? {
                      ...dataset,
                      doi,
                    }
                  : dataset,
              ),
            }
          : exp,
      ),
    );
  };

  const removeDatasetFromExperiment = (
    experimentId: string,
    datasetId: string,
  ) => {
    let datasetToProcess: { id: string; file?: File | null } | null = null;

    setExperiments((prev) =>
      prev.map((exp) => {
        if (exp.id !== experimentId) {
          return exp;
        }

        const remainingDatasets = exp.datasets.filter(
          (dataset) => dataset.id !== datasetId,
        );

        if (remainingDatasets.length === 0) {
          return {
            ...exp,
            datasets: [],
            activeDatasetId: null,
            spectrumFile: null,
            spectrumError: null,
            csvColumns: [],
            csvRawData: [],
            csvColumnMappings: { energy: "", absorption: "" },
            spectrumStats: null,
            selectionSummary: null,
            spectrumPoints: [],
            normalizedPoints: null,
            normalization: null,
          };
        }

        if (exp.activeDatasetId === datasetId) {
          const fallback = remainingDatasets[remainingDatasets.length - 1]!;
          datasetToProcess = { id: fallback.id, file: fallback.file };
          return {
            ...exp,
            datasets: remainingDatasets,
            activeDatasetId: fallback.id,
          };
        }

        return {
          ...exp,
          datasets: remainingDatasets,
        };
      }),
    );

    if (datasetToProcess?.file) {
      void handleSpectrumFile(
        datasetToProcess.file,
        experimentId,
        datasetToProcess.id,
      );
    }
  };

  const handleSpectrumFile = async (
    file: File,
    experimentId: string,
    datasetId?: string,
  ) => {
    const experiment = experiments.find((exp) => exp.id === experimentId);
    if (!experiment) return;

    clearExperimentSpectrum(experimentId);

    updateExperiment(experimentId, {
      spectrumError: null,
      spectrumFile: file,
      spectrumPoints: [],
      csvColumnMappings: { energy: "", absorption: "" },
      spectrumStats: null,
      selectionSummary: null,
      normalizedPoints: null,
      normalization: null,
    });

    try {
      const parsed = await parseCSVFile(file);
      const columns = parsed.meta.fields || [];

      if (columns.length === 0) {
        updateExperiment(experimentId, {
          spectrumError: "CSV file has no columns.",
        });
        return;
      }

      // Auto-detect common column names
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
      const phiCol = columns.find((col) => col.toLowerCase().includes("phi"));

      const columnMappings: CSVColumnMappings = {
        energy: energyCol || columns[0] || "",
        absorption: absorptionCol || columns[1] || "",
        theta: thetaCol || undefined,
        phi: phiCol || undefined,
      };

      updateExperiment(experimentId, {
        csvColumns: columns,
        csvRawData: parsed.data,
        csvColumnMappings: columnMappings,
      });

      if (datasetId) {
        setExperiments((prev) =>
          prev.map((exp) =>
            exp.id === experimentId
              ? {
                  ...exp,
                  activeDatasetId: datasetId,
                  datasets: exp.datasets.map((dataset) =>
                    dataset.id === datasetId
                      ? {
                          ...dataset,
                          file,
                          fileName: file.name,
                          fileSize: file.size,
                          processedAt: Date.now(),
                        }
                      : dataset,
                  ),
                }
              : exp,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to parse spectrum CSV", error);
      updateExperiment(experimentId, {
        spectrumError:
          error instanceof Error
            ? error.message
            : "Failed to parse spectrum CSV file.",
        csvColumns: [],
        csvRawData: [],
      });
    }
  };

  // Apply CSV column mappings to convert data for each experiment
  useEffect(() => {
    if (experiments.length === 0) {
      return;
    }

    let hasChanges = false;
    const nextExperiments = experiments.map((experiment) => {
      let nextExperiment = experiment;
      const patchExperiment = (patch: Partial<ExperimentConfig>) => {
        hasChanges = true;
        nextExperiment = { ...nextExperiment, ...patch };
      };

      if (experiment.csvRawData.length === 0) {
        if (experiment.spectrumPoints.length > 0 || experiment.spectrumError) {
          patchExperiment({
            spectrumPoints: [],
            spectrumError: null,
            selectionSummary: null,
            spectrumStats: null,
            csvColumnMappings: {
              ...experiment.csvColumnMappings,
              theta: undefined,
              phi: undefined,
            },
          });
        }
        return nextExperiment;
      }

      const energyColumn = experiment.csvColumnMappings.energy;
      const absorptionColumn = experiment.csvColumnMappings.absorption;

      if (!energyColumn || !absorptionColumn) {
        if (
          experiment.spectrumPoints.length > 0 ||
          experiment.spectrumError !== null
        ) {
          patchExperiment({
            spectrumPoints: [],
            spectrumError: "Select both energy and absorption columns.",
            selectionSummary: null,
            spectrumStats: null,
          });
        }
        return nextExperiment;
      }

      const thetaColumn = experiment.csvColumnMappings.theta;
      const phiColumn = experiment.csvColumnMappings.phi;

      const numericColumns = new Set<string>([energyColumn, absorptionColumn]);
      if (thetaColumn) numericColumns.add(thetaColumn);
      if (phiColumn) numericColumns.add(phiColumn);

      const numericColumnValues = analyzeNumericColumns(
        experiment.csvRawData,
        numericColumns,
      );

      const invalidColumns = Array.from(numericColumns).filter(
        (column) => numericColumnValues[column]?.sanitizedInvalidRows.length,
      );

      if (invalidColumns.length > 0) {
        patchExperiment({
          spectrumPoints: [],
          spectrumError: `Invalid numeric values detected in columns: ${invalidColumns.join(", ")}`,
          selectionSummary: null,
          spectrumStats: null,
        });
        return nextExperiment;
      }

      const makeStat = (): {
        min: number;
        max: number;
        nanCount: number;
        validCount: number;
      } => ({
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        nanCount: 0,
        validCount: 0,
      });

      const energyStats = makeStat();
      const absorptionStats = makeStat();
      const thetaStats = thetaColumn ? makeStat() : null;
      const phiStats = phiColumn ? makeStat() : null;

      const totalRows = experiment.csvRawData.length;
      const spectrumPoints: SpectrumPoint[] = [];

      experiment.csvRawData.forEach((row) => {
        const energyValue = Number(row[energyColumn] ?? NaN);
        if (!Number.isFinite(energyValue)) {
          energyStats.nanCount += 1;
          energyStats.min = Math.min(energyStats.min, energyValue);
          energyStats.max = Math.max(energyStats.max, energyValue);
        } else {
          energyStats.validCount += 1;
          energyStats.min = Math.min(energyStats.min, energyValue);
          energyStats.max = Math.max(energyStats.max, energyValue);
        }

        const absorptionValue = Number(row[absorptionColumn] ?? NaN);
        if (!Number.isFinite(absorptionValue)) {
          absorptionStats.nanCount += 1;
        } else {
          absorptionStats.validCount += 1;
          absorptionStats.min = Math.min(absorptionStats.min, absorptionValue);
          absorptionStats.max = Math.max(absorptionStats.max, absorptionValue);
        }

        if (
          !Number.isFinite(energyValue) ||
          !Number.isFinite(absorptionValue)
        ) {
          return;
        }

        const thetaValue =
          thetaColumn && row[thetaColumn] !== undefined
            ? Number(row[thetaColumn])
            : undefined;
        const phiValue =
          phiColumn && row[phiColumn] !== undefined
            ? Number(row[phiColumn])
            : undefined;

        if (thetaStats) {
          if (!Number.isFinite(thetaValue ?? NaN)) {
            thetaStats.nanCount += 1;
          } else if (thetaValue !== undefined) {
            thetaStats.validCount += 1;
            thetaStats.min = Math.min(thetaStats.min, thetaValue);
            thetaStats.max = Math.max(thetaStats.max, thetaValue);
          }
        }

        if (phiStats) {
          if (!Number.isFinite(phiValue ?? NaN)) {
            phiStats.nanCount += 1;
          } else if (phiValue !== undefined) {
            phiStats.validCount += 1;
            phiStats.min = Math.min(phiStats.min, phiValue);
            phiStats.max = Math.max(phiStats.max, phiValue);
          }
        }

        const point: SpectrumPoint = {
          energy: energyValue,
          absorption: absorptionValue,
        };

        if (Number.isFinite(thetaValue ?? NaN) && thetaValue !== undefined) {
          point.theta = thetaValue;
        }
        if (Number.isFinite(phiValue ?? NaN) && phiValue !== undefined) {
          point.phi = phiValue;
        }

        spectrumPoints.push(point);
      });

      const spectrumError =
        spectrumPoints.length === 0
          ? "No valid data points found with the selected column mappings."
          : null;

      const geometryPairs = extractGeometryPairs(spectrumPoints);

      const finalizeStats = (
        stat: ReturnType<typeof makeStat> | null,
      ): ColumnStats | undefined => {
        if (!stat) return undefined;
        const hasValid = stat.validCount > 0;
        return {
          min: hasValid ? stat.min : null,
          max: hasValid ? stat.max : null,
          nanCount: stat.nanCount,
          validCount: stat.validCount,
        } satisfies ColumnStats;
      };

      const spectrumStats: SpectrumStats = {
        totalRows,
        validPoints: spectrumPoints.length,
        energy: finalizeStats(energyStats)!,
        absorption: finalizeStats(absorptionStats)!,
        ...(thetaStats ? { theta: finalizeStats(thetaStats) } : {}),
        ...(phiStats ? { phi: finalizeStats(phiStats) } : {}),
      };

      const geometryMode: GeometryMode =
        geometryPairs.length > 0 ? "csv" : "fixed";

      const currentPointsSignature = JSON.stringify(
        experiment.spectrumPoints.map((point) => [
          point.energy,
          point.absorption,
          point.theta,
          point.phi,
        ]),
      );
      const nextPointsSignature = JSON.stringify(
        spectrumPoints.map((point) => [
          point.energy,
          point.absorption,
          point.theta,
          point.phi,
        ]),
      );
      const currentStatsSignature = JSON.stringify(
        experiment.spectrumStats ?? null,
      );
      const nextStatsSignature = JSON.stringify(spectrumStats);

      if (
        currentPointsSignature !== nextPointsSignature ||
        experiment.spectrumError !== spectrumError ||
        currentStatsSignature !== nextStatsSignature
      ) {
        patchExperiment({
          spectrumPoints,
          spectrumError,
          spectrumStats,
          selectionSummary: null,
          csvColumnMappings: {
            ...experiment.csvColumnMappings,
            theta: geometryMode === "csv" ? thetaColumn : undefined,
            phi: geometryMode === "csv" ? phiColumn : undefined,
          },
        });
      }

      return nextExperiment;
    });

    if (hasChanges) {
      setExperiments(nextExperiments);
    }
  }, [experiments]);

  useEffect(() => {
    const barePoints = bareAtomAbsorptionQuery.data?.points ?? null;

    setExperiments((prev) => {
      let changed = false;

      const next = prev.map((experiment) => {
        if (
          !normalizationEnabled ||
          !barePoints ||
          experiment.spectrumPoints.length === 0
        ) {
          if (experiment.normalizedPoints || experiment.normalization) {
            changed = true;
            return {
              ...experiment,
              normalizedPoints: null,
              normalization: null,
            };
          }
          return experiment;
        }

        const result = computeNormalizationForExperiment(
          experiment.spectrumPoints,
          barePoints,
          preEdgePointCount,
          postEdgePointCount,
        );

        if (!result) {
          if (experiment.normalizedPoints || experiment.normalization) {
            changed = true;
            return {
              ...experiment,
              normalizedPoints: null,
              normalization: null,
            };
          }
          return experiment;
        }

        const { normalizedPoints, scale, offset, preRange, postRange } = result;

        let needsUpdate = false;

        if (!experiment.normalizedPoints) {
          needsUpdate = true;
        } else if (
          experiment.normalizedPoints.length !== normalizedPoints.length
        ) {
          needsUpdate = true;
        } else {
          for (let idx = 0; idx < normalizedPoints.length; idx += 1) {
            const priorPoint = experiment.normalizedPoints[idx];
            const nextPoint = normalizedPoints[idx];
            if (!priorPoint || !nextPoint) {
              needsUpdate = true;
              break;
            }
            if (
              Math.abs(priorPoint.absorption - nextPoint.absorption) > 1e-6 ||
              Math.abs(priorPoint.energy - nextPoint.energy) > 1e-9
            ) {
              needsUpdate = true;
              break;
            }
          }
        }

        if (!experiment.normalization) {
          needsUpdate = true;
        } else {
          const norm = experiment.normalization;
          if (
            Math.abs(norm.scale - scale) > 1e-6 ||
            Math.abs(norm.offset - offset) > 1e-6 ||
            !rangesApproximatelyEqual(norm.preRange, preRange) ||
            !rangesApproximatelyEqual(norm.postRange, postRange)
          ) {
            needsUpdate = true;
          }
        }

        if (!needsUpdate) {
          return experiment;
        }

        changed = true;
        return {
          ...experiment,
          normalizedPoints,
          normalization: {
            scale,
            offset,
            preRange,
            postRange,
          },
        };
      });

      return changed ? next : prev;
    });
  }, [
    normalizationEnabled,
    preEdgePointCount,
    postEdgePointCount,
    bareAtomAbsorptionQuery.data?.points,
    experiments,
  ]);

  const applyNormalizationSelection = (
    experimentId: string,
    selection: SpectrumSelection,
  ) => {
    const experiment = experiments.find((exp) => exp.id === experimentId);
    if (!experiment) {
      return;
    }

    const range = {
      min: Math.min(selection.energyMin, selection.energyMax),
      max: Math.max(selection.energyMin, selection.energyMax),
    };

    const selectedCount = countPointsWithinRange(
      experiment.spectrumPoints,
      range,
    );

    if (selectedCount < 2) {
      return;
    }

    if (
      !normalizationSelectionTarget ||
      normalizationSelectionExperimentId !== experimentId
    ) {
      return;
    }

    if (normalizationSelectionTarget === "pre") {
      setPreEdgePointCount(selectedCount);
    } else if (normalizationSelectionTarget === "post") {
      setPostEdgePointCount(selectedCount);
    }

    setNormalizationSelectionTarget(null);
    setNormalizationSelectionExperimentId(null);
  };

  const startNormalizationSelection = (
    experimentId: string,
    target: "pre" | "post",
  ) => {
    setNormalizationSelectionExperimentId(experimentId);
    setNormalizationSelectionTarget(target);
  };

  const clearForm = () => {
    setSearchTerm("");
    clearSelection();
    setProcessMethod("");
    setSubstrate("");
    setSolvent("");
    setThickness("");
    setMolecularWeight("");
    setPreparationDate("");
    setSelectedVendorId("");
    setNewVendorName("");
    setNewVendorUrl("");
    setExperiments([createEmptyExperiment()]);
    setSubmitStatus(undefined);
    setNormalizationEnabled(true);
    setPreEdgePointCount(10);
    setPostEdgePointCount(10);
    setNormalizationSelectionTarget(null);
    setNormalizationSelectionExperimentId(null);
    setShowBareAtom(true);
  };

  const clearExperimentSpectrum = (experimentId: string) => {
    updateExperiment(experimentId, {
      spectrumFile: null,
      spectrumError: null,
      csvColumns: [],
      csvRawData: [],
      csvColumnMappings: { energy: "", absorption: "" },
      selectionSummary: null,
      spectrumStats: null,
      spectrumPoints: [],
      normalizedPoints: null,
      normalization: null,
    });
  };

  const resetExperiment = (experimentId: string) => {
    clearExperimentSpectrum(experimentId);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus(undefined);

    if (!selectedMolecule) {
      setSubmitStatus({
        type: "error",
        message: "Please select a molecule before submitting.",
      });
      return;
    }

    if (!selectedMolecule.id) {
      setSubmitStatus({
        type: "error",
        message:
          "This molecule is not in the database. Please create the molecule first using the 'Contribute Molecule' page.",
      });
      return;
    }

    const geometryPayloadByExperiment: Record<string, GeometryPayload> = {};

    for (const experiment of experiments) {
      if (!experiment.instrumentId) {
        setSubmitStatus({
          type: "error",
          message: `Experiment ${experiments.indexOf(experiment) + 1}: Select an instrument.`,
        });
        return;
      }

      if (!experiment.edgeId) {
        setSubmitStatus({
          type: "error",
          message: `Experiment ${experiments.indexOf(experiment) + 1}: Select an absorption edge.`,
        });
        return;
      }

      const hasThetaMapping = Boolean(experiment.csvColumnMappings.theta);
      const hasPhiMapping = Boolean(experiment.csvColumnMappings.phi);

      if (hasThetaMapping !== hasPhiMapping) {
        setSubmitStatus({
          type: "error",
          message: `Experiment ${experiments.indexOf(experiment) + 1}: Provide both theta and phi column mappings, or leave both unset.`,
        });
        return;
      }

      const hasCsvGeometry =
        hasThetaMapping &&
        hasPhiMapping &&
        experiment.spectrumPoints.length > 0;

      if (hasCsvGeometry) {
        const invalidPoint = experiment.spectrumPoints.find(
          (point) =>
            point.theta === undefined ||
            Number.isNaN(point.theta) ||
            point.phi === undefined ||
            Number.isNaN(point.phi),
        );

        if (invalidPoint) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: Spectrum CSV rows mapped to theta/phi must contain numeric values.`,
          });
          return;
        }

        const uniqueGeometries = extractGeometryPairs(
          experiment.spectrumPoints,
        );

        if (uniqueGeometries.length === 0) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: No valid theta/phi pairs detected in the spectrum CSV.`,
          });
          return;
        }

        geometryPayloadByExperiment[experiment.id] = {
          mode: "csv",
          csvGeometries: uniqueGeometries,
        };
      } else {
        if (!experiment.fixedTheta || !experiment.fixedPhi) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: Provide theta and phi values for fixed geometry.`,
          });
          return;
        }

        const fixedThetaValue = parseFloat(experiment.fixedTheta);
        const fixedPhiValue = parseFloat(experiment.fixedPhi);

        if (
          !Number.isFinite(fixedThetaValue) ||
          !Number.isFinite(fixedPhiValue)
        ) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: Fixed theta and phi must be numeric values.`,
          });
          return;
        }

        geometryPayloadByExperiment[experiment.id] = {
          mode: "fixed",
          fixedTheta: fixedThetaValue,
          fixedPhi: fixedPhiValue,
        };
      }

      if (experiment.spectrumPoints.length === 0) {
        setSubmitStatus({
          type: "error",
          message: `Experiment ${experiments.indexOf(experiment) + 1}: Upload a spectrum CSV with energy and absorption columns.`,
        });
        return;
      }
    }

    let vendorPayload:
      | { existingVendorId: string }
      | { name: string; url?: string }
      | undefined;

    if (selectedVendorId) {
      vendorPayload = { existingVendorId: selectedVendorId };
    } else if (newVendorName.trim()) {
      vendorPayload = {
        name: newVendorName.trim(),
        url: newVendorUrl.trim() ? newVendorUrl.trim() : undefined,
      };
    }

    const generatedSampleIdentifier = crypto.randomUUID();

    try {
      for (const experiment of experiments) {
        const geometryMeta = geometryPayloadByExperiment[experiment.id];
        if (!geometryMeta) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: Unable to resolve geometry definition. Please reconfigure geometry settings.`,
          });
          return;
        }

        const geometryInput =
          geometryMeta.mode === "csv"
            ? {
                mode: "csv" as const,
                csvGeometries: geometryMeta.csvGeometries,
              }
            : {
                mode: "fixed" as const,
                fixed: {
                  theta: geometryMeta.fixedTheta,
                  phi: geometryMeta.fixedPhi,
                },
              };

        await createNexafsMutation.mutateAsync({
          sample: {
            moleculeId: selectedMolecule.id,
            identifier: generatedSampleIdentifier,
            processMethod: processMethod || undefined,
            substrate: substrate.trim() || undefined,
            solvent: solvent.trim() || undefined,
            thickness:
              typeof thickness === "number" && Number.isFinite(thickness)
                ? thickness
                : undefined,
            molecularWeight:
              typeof molecularWeight === "number" &&
              Number.isFinite(molecularWeight)
                ? molecularWeight
                : undefined,
            preparationDate: preparationDate
              ? new Date(preparationDate).toISOString()
              : undefined,
            vendor: vendorPayload ?? {},
          },
          experiment: {
            instrumentId: experiment.instrumentId,
            edgeId: experiment.edgeId,
            experimentType: experiment.experimentType,
            measurementDate: experiment.measurementDate
              ? new Date(experiment.measurementDate).toISOString()
              : undefined,
            calibrationId: experiment.calibrationId || undefined,
            referenceStandard: experiment.referenceStandard.trim() || undefined,
            isStandard: experiment.isStandard,
          },
          geometry: geometryInput,
          spectrum: {
            points: experiment.spectrumPoints,
          },
        });
      }

      setSubmitStatus({
        type: "success",
        message: `Successfully uploaded ${experiments.length} experiment(s).`,
      });

      clearForm();
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
            can add multiple experiments with different configurations for the
            same sample.
          </p>

          <form className="space-y-10" onSubmit={handleSubmit}>
            <MoleculeSelector
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              suggestions={suggestions}
              manualResults={manualResults}
              suggestionError={suggestionError}
              manualError={manualError}
              isSuggesting={isSuggesting}
              isManualSearching={isManualSearching}
              selectedMolecule={selectedMolecule}
              selectedPreferredName={selectedPreferredName}
              setSelectedPreferredName={setSelectedPreferredName}
              allMoleculeNames={allMoleculeNames}
              onUseMolecule={(result) => selectMolecule(result)}
              onManualSearch={runManualSearch}
            />

            <SampleInformationSection
              preparationDate={preparationDate}
              setPreparationDate={setPreparationDate}
              processMethod={processMethod}
              setProcessMethod={setProcessMethod}
              substrate={substrate}
              setSubstrate={setSubstrate}
              solvent={solvent}
              setSolvent={setSolvent}
              thickness={thickness}
              setThickness={setThickness}
              molecularWeight={molecularWeight}
              setMolecularWeight={setMolecularWeight}
              selectedVendorId={selectedVendorId}
              setSelectedVendorId={setSelectedVendorId}
              newVendorName={newVendorName}
              setNewVendorName={setNewVendorName}
              newVendorUrl={newVendorUrl}
              setNewVendorUrl={setNewVendorUrl}
              vendors={vendorsData?.vendors ?? []}
              isLoadingVendors={isLoadingVendors}
            />

            <ExperimentsSection
              experiments={experiments}
              instrumentOptions={instrumentOptions}
              edgeOptions={edgeOptions}
              calibrationOptions={calibrationOptions}
              isLoadingInstruments={isLoadingInstruments}
              isLoadingEdges={isLoadingEdges}
              isLoadingCalibrations={isLoadingCalibrations}
              addExperiment={addExperiment}
              removeExperiment={removeExperiment}
              updateExperiment={updateExperiment}
              handleSpectrumFile={handleSpectrumFile}
              clearExperimentSpectrum={clearExperimentSpectrum}
              normalizationEnabled={normalizationEnabled}
              normalizationSelectionTarget={normalizationSelectionTarget}
              normalizationSelectionExperimentId={
                normalizationSelectionExperimentId
              }
              applyNormalizationSelection={applyNormalizationSelection}
              onStartNormalizationSelection={startNormalizationSelection}
              bareAtomPoints={bareAtomPoints}
              bareAtomLoading={bareAtomAbsorptionQuery.isLoading}
              bareAtomError={bareAtomError}
              showBareAtom={showBareAtom}
              onRequestAddEdge={() => setShowEdgeDialog(true)}
              onRequestAddCalibration={() => setShowCalibrationDialog(true)}
              onUploadDatasets={addDatasetsToExperiment}
              onSelectDataset={selectDatasetForExperiment}
              onRemoveDataset={removeDatasetFromExperiment}
              onDatasetDoiChange={updateDatasetDoi}
            />

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
                  : `Submit ${experiments.length} Experiment${experiments.length > 1 ? "s" : ""}`}
              </Button>
            </div>
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
