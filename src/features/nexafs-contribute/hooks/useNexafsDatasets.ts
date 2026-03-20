"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  createEmptyDatasetState,
  EXPERIMENT_TYPE_OPTIONS,
  type DatasetState,
  type CSVColumnMappings,
  type ExperimentTypeOption,
} from "../types";
import {
  parseNexafsFilename,
  normalizeEdge,
  normalizeExperimentMode,
  parseNexafsJson,
  parseCSVFile,
} from "../utils";

type InstrumentOption = { id: string; name: string; facilityName?: string };
type EdgeOption = { id: string; targetatom: string; corestate: string };

type UseNexafsDatasetsOptions = {
  instrumentOptions: InstrumentOption[];
  edgeOptions: EdgeOption[];
  showToast: (
    message: string,
    type: "success" | "error",
    duration?: number,
  ) => void;
};

export function useNexafsDatasets(options: UseNexafsDatasetsOptions) {
  const { instrumentOptions, edgeOptions, showToast } = options;
  const [datasets, setDatasets] = useState<DatasetState[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [columnMappingFile, setColumnMappingFile] = useState<{
    file: File;
    datasetId: string;
  } | null>(null);

  const updateDataset = useCallback(
    (datasetId: string, updates: Partial<DatasetState>) => {
      setDatasets((prev) =>
        prev.map((d) => (d.id === datasetId ? { ...d, ...updates } : d)),
      );
    },
    [],
  );

  const processDatasetData = useCallback(
    (datasetId: string) => {
      const dataset = datasets.find((d) => d.id === datasetId);
      if (
        !dataset ||
        !Array.isArray(dataset.csvRawData) ||
        dataset.csvRawData.length === 0
      )
        return;

      const energyColumn = dataset.columnMappings.energy;
      const absorptionColumn = dataset.columnMappings.absorption;
      const thetaColumn = dataset.columnMappings.theta;
      const phiColumn = dataset.columnMappings.phi;

      if (!energyColumn || !absorptionColumn) return;

      try {
        const spectrumPoints: SpectrumPoint[] = [];

        for (const row of dataset.csvRawData) {
          const energyValue = row[energyColumn];
          const absorptionValue = row[absorptionColumn];

          const energyStr =
            typeof energyValue === "string" || typeof energyValue === "number"
              ? String(energyValue)
              : "";
          const absorptionStr =
            typeof absorptionValue === "string" ||
            typeof absorptionValue === "number"
              ? String(absorptionValue)
              : "";
          const energy = parseFloat(energyStr.trim());
          const absorption = parseFloat(absorptionStr.trim());

          if (isNaN(energy) || isNaN(absorption)) continue;

          const point: SpectrumPoint = { energy, absorption };

          if (
            thetaColumn &&
            row[thetaColumn] !== undefined &&
            row[thetaColumn] !== null
          ) {
            const thetaValueRaw = row[thetaColumn];
            const thetaStr =
              typeof thetaValueRaw === "string" ||
              typeof thetaValueRaw === "number"
                ? String(thetaValueRaw)
                : "";
            const thetaValue = parseFloat(thetaStr.trim());
            if (!isNaN(thetaValue)) point.theta = thetaValue;
          } else if (
            dataset.fixedTheta !== undefined &&
            dataset.fixedTheta !== ""
          ) {
            const fixedThetaValue = parseFloat(dataset.fixedTheta);
            if (!isNaN(fixedThetaValue)) point.theta = fixedThetaValue;
          }

          if (
            phiColumn &&
            row[phiColumn] !== undefined &&
            row[phiColumn] !== null
          ) {
            const phiValueRaw = row[phiColumn];
            const phiStr =
              typeof phiValueRaw === "string" || typeof phiValueRaw === "number"
                ? String(phiValueRaw)
                : "";
            const phiValue = parseFloat(phiStr.trim());
            if (!isNaN(phiValue)) point.phi = phiValue;
          } else if (
            dataset.fixedPhi !== undefined &&
            dataset.fixedPhi !== ""
          ) {
            const fixedPhiValue = parseFloat(dataset.fixedPhi);
            if (!isNaN(fixedPhiValue)) point.phi = fixedPhiValue;
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

  const processDatasetDataRef = useRef(processDatasetData);
  processDatasetDataRef.current = processDatasetData;

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const dataset = createEmptyDatasetState(file);
        const parsedFilename = parseNexafsFilename(file.name);
        const updates: Partial<DatasetState> = {};

        if (parsedFilename.edge) {
          const normalizedEdge = normalizeEdge(parsedFilename.edge);
          if (normalizedEdge) {
            const matchingEdge = edgeOptions.find((edge) => {
              const edgeLabel = `${edge.targetatom}(${edge.corestate})`;
              return (
                edgeLabel === normalizedEdge ||
                edgeLabel.toLowerCase() === normalizedEdge.toLowerCase()
              );
            });
            if (matchingEdge) updates.edgeId = matchingEdge.id;
          }
        }

        if (parsedFilename.experimentMode) {
          const normalizedMode = normalizeExperimentMode(
            parsedFilename.experimentMode,
          );
          if (
            normalizedMode &&
            EXPERIMENT_TYPE_OPTIONS.some((opt) => opt.value === normalizedMode)
          ) {
            updates.experimentType = normalizedMode as ExperimentTypeOption;
          }
        }

        if (parsedFilename.facility) {
          const matchingInstrument = instrumentOptions.find((inst) => {
            const facilityName = inst.facilityName
              ?.toUpperCase()
              .replace(/\s+/g, "");
            const parsedFacility = parsedFilename.facility
              ?.toUpperCase()
              .replace(/\s+/g, "");
            return (
              facilityName === parsedFacility ||
              (facilityName?.includes(parsedFacility ?? "") ?? false) ||
              (parsedFacility?.includes(facilityName ?? "") ?? false)
            );
          });
          if (matchingInstrument) updates.instrumentId = matchingInstrument.id;
        }

        if (parsedFilename.beamline) {
          const matchingInstrument = instrumentOptions.find((inst) => {
            const instrumentName = inst.name.toUpperCase().replace(/\s+/g, "");
            const parsedBeamline = parsedFilename.beamline
              ?.toUpperCase()
              .replace(/\s+/g, "");
            return (
              instrumentName === parsedBeamline ||
              instrumentName.includes(parsedBeamline ?? "") ||
              parsedBeamline?.includes(instrumentName)
            );
          });
          if (matchingInstrument && !updates.instrumentId) {
            updates.instrumentId = matchingInstrument.id;
          }
        }

        setDatasets((prev) => [...prev, { ...dataset, ...updates }]);
        setActiveDatasetId((prev) => prev ?? dataset.id);

        const isJson = file.name.toLowerCase().endsWith(".json");

        try {
          if (isJson) {
            const { spectrumPoints, columns, rawData } =
              await parseNexafsJson(file);

            const detectedEnergyCol = columns.find(
              (col) =>
                col.toLowerCase().includes("energy") ||
                col.toLowerCase().includes("ev") ||
                col.toLowerCase().includes("photon"),
            );
            const detectedAbsorptionCol = columns.find(
              (col) =>
                col.toLowerCase().includes("absorption") ||
                col.toLowerCase().includes("abs") ||
                col.toLowerCase().includes("intensity") ||
                col.toLowerCase().includes("signal") ||
                col.toLowerCase().trim() === "mu",
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
              setTimeout(() => processDatasetDataRef.current(dataset.id), 50);
            } else {
              const missingColumns: string[] = [];
              if (!columnMappings.energy) missingColumns.push("Energy");
              if (!columnMappings.absorption) missingColumns.push("Absorption");
              if (missingColumns.length > 0) {
                showToast(
                  `Missing required columns: ${missingColumns.join(", ")}. Please map columns in the table view.`,
                  "error",
                  8000,
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
                  col.toLowerCase().includes("signal") ||
                  col.toLowerCase().trim() === "mu",
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
                csvRawData: Array.isArray(parsed.data) ? parsed.data : [],
                columnMappings,
              });

              if (missingColumns.length > 0) {
                showToast(
                  `Missing required columns: ${missingColumns.join(", ")}. Please map columns in the table view.`,
                  "error",
                  8000,
                );
              }

              if (columnMappings.energy && columnMappings.absorption) {
                setTimeout(() => processDatasetDataRef.current(dataset.id), 50);
              }
            } else {
              showToast(
                "CSV file has no columns. Please check the file format.",
                "error",
                8000,
              );
            }
          }
        } catch (error) {
          console.error(`Failed to parse ${isJson ? "JSON" : "CSV"}`, error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : `Failed to parse ${isJson ? "JSON" : "CSV"} file.`;

          updateDataset(dataset.id, {
            ...updates,
            spectrumError: errorMessage,
          });
          setColumnMappingFile((prev) =>
            prev?.datasetId === dataset.id ? null : prev,
          );
          showToast(
            `Failed to process ${file.name}: ${errorMessage}`,
            "error",
            10000,
          );
        }
      }
    },
    [updateDataset, edgeOptions, instrumentOptions, showToast],
  );

  const handleColumnMappingConfirm = useCallback(
    (
      mappings: CSVColumnMappings,
      fixedValues?: { theta?: string; phi?: string },
    ) => {
      if (!columnMappingFile) return;

      const updates: Partial<DatasetState> = { columnMappings: mappings };
      if (fixedValues?.theta !== undefined)
        updates.fixedTheta = fixedValues.theta;
      if (fixedValues?.phi !== undefined) updates.fixedPhi = fixedValues.phi;

      const datasetId = columnMappingFile.datasetId;
      updateDataset(datasetId, updates);
      setColumnMappingFile(null);
      setTimeout(() => processDatasetDataRef.current(datasetId), 100);
    },
    [columnMappingFile, updateDataset],
  );

  const handleColumnMappingClose = useCallback(() => {
    setColumnMappingFile(null);
  }, []);

  const datasetsDependency = useMemo(
    () =>
      datasets
        .map(
          (d) =>
            `${d.id}:${d.columnMappings.energy}:${d.columnMappings.absorption}:${d.columnMappings.theta ?? ""}:${d.columnMappings.phi ?? ""}:${d.fixedTheta ?? ""}:${d.fixedPhi ?? ""}:${Array.isArray(d.csvRawData) ? d.csvRawData.length : 0}`,
        )
        .join(","),
    [datasets],
  );

  useEffect(() => {
    datasets.forEach((dataset) => {
      if (
        Array.isArray(dataset.csvRawData) &&
        dataset.csvRawData.length > 0 &&
        dataset.columnMappings.energy &&
        dataset.columnMappings.absorption
      ) {
        processDatasetDataRef.current(dataset.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetsDependency]);

  const handleDatasetSelect = useCallback((datasetId: string) => {
    setActiveDatasetId(datasetId);
  }, []);

  const handleNewDataset = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.json,text/csv,application/json";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length > 0) await handleFilesSelected(files);
    };
    input.click();
  }, [handleFilesSelected]);

  const handleDatasetRemove = useCallback(
    (datasetId: string) => {
      const filtered = datasets.filter((d) => d.id !== datasetId);
      setDatasets(filtered);
      setActiveDatasetId(
        activeDatasetId === datasetId
          ? (filtered[filtered.length - 1]?.id ?? null)
          : activeDatasetId,
      );
    },
    [datasets, activeDatasetId],
  );

  const handleDatasetRename = useCallback(
    (datasetId: string, newName: string) => {
      updateDataset(datasetId, { fileName: newName });
    },
    [updateDataset],
  );

  useEffect(() => {
    if (activeDatasetId) {
      const exists = datasets.some((d) => d.id === activeDatasetId);
      if (!exists && datasets.length > 0) {
        setActiveDatasetId(datasets[datasets.length - 1]?.id ?? null);
      }
    } else if (datasets.length > 0) {
      setActiveDatasetId(datasets[0]?.id ?? null);
    }
  }, [datasets, activeDatasetId]);

  const clearDatasets = useCallback(() => {
    setDatasets([]);
    setActiveDatasetId(null);
    setColumnMappingFile(null);
  }, []);

  return {
    datasets,
    setDatasets,
    activeDatasetId,
    setActiveDatasetId,
    updateDataset,
    processDatasetData,
    handleFilesSelected,
    handleNewDataset,
    handleDatasetSelect,
    handleDatasetRemove,
    handleDatasetRename,
    clearDatasets,
    columnMappingFile,
    setColumnMappingFile,
    handleColumnMappingConfirm,
    handleColumnMappingClose,
  };
}
