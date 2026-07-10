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
  collectorOrcidsFromAttributions,
  dedupeDatasetAttributions,
  filterValidOrcidAttributions,
} from "~/lib/nexafs-attribution";
import { findMatchingVendorId } from "~/lib/nexafsVendorLabel";
import {
  parseNexafsFilename,
  normalizeEdge,
  normalizeExperimentMode,
  parseNexafsJson,
  parseCSVFile,
  detectAuxiliarySpectrumColumnNames,
  matchInstrumentIdFromParsedNexafsFilename,
  buildNexafsUploadAutofill,
} from "../utils";
import {
  classifyColumnFillStatus,
  inferPrimaryRepresentation,
  resolvePrimaryAbsorptionColumn,
} from "../utils/channelCompleteness";
import { buildUploadScaleSanityWarnings } from "../utils/uploadScaleSanity";
import type { PrimaryRepresentation } from "../types";

type InstrumentOption = { id: string; name: string; facilityName?: string };
type EdgeOption = { id: string; targetatom: string; corestate: string };

type VendorMatchRow = { id: string; name: string | null | undefined };

type UseNexafsDatasetsOptions = {
  instrumentOptions: InstrumentOption[];
  edgeOptions: EdgeOption[];
  vendors: VendorMatchRow[];
  showToast: (
    message: string,
    type: "success" | "error",
    duration?: number,
  ) => void;
};

function readOptionalFloat(
  row: Record<string, unknown>,
  column: string | undefined,
): number | undefined {
  if (!column) return undefined;
  const raw = row[column];
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (typeof raw === "string") {
    const n = parseFloat(raw.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function isProcessedPrimary(representation: PrimaryRepresentation): boolean {
  return (
    representation === "beta" ||
    representation === "mass_absorption" ||
    representation === "f2" ||
    representation === "epsilon2" ||
    representation === "chi2"
  );
}

function tagNativeChannelFromPrimary(
  point: SpectrumPoint,
  representation: PrimaryRepresentation,
): SpectrumPoint {
  const value = point.absorption;
  if (!Number.isFinite(value)) {
    return point;
  }
  switch (representation) {
    case "beta":
      return { ...point, beta: point.beta ?? value };
    case "mass_absorption":
      return { ...point, massabsorption: point.massabsorption ?? value };
    case "od":
      return { ...point, od: point.od ?? value };
    default:
      return point;
  }
}

export function useNexafsDatasets(options: UseNexafsDatasetsOptions) {
  const { instrumentOptions, edgeOptions, vendors, showToast } = options;
  const [datasets, setDatasets] = useState<DatasetState[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [columnMappingFile, setColumnMappingFile] = useState<{
    file: File;
    datasetId: string;
  } | null>(null);

  const updateDataset = useCallback(
    (
      datasetId: string,
      updates:
        | Partial<DatasetState>
        | ((dataset: DatasetState) => Partial<DatasetState>),
    ) => {
      setDatasets((prev) =>
        prev.map((d) => {
          if (d.id !== datasetId) {
            return d;
          }
          const patch =
            typeof updates === "function" ? updates(d) : updates;
          return { ...d, ...patch };
        }),
      );
    },
    [],
  );

  const openColumnMappingForDataset = useCallback((dataset: DatasetState) => {
    setColumnMappingFile({ file: dataset.file, datasetId: dataset.id });
  }, []);

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
      const thetaColumn = dataset.columnMappings.theta;
      const phiColumn = dataset.columnMappings.phi;

      if (!energyColumn) return;

      const fillStatus = classifyColumnFillStatus(
        dataset.csvRawData,
        dataset.columnMappings,
      );
      const inferred = inferPrimaryRepresentation({
        mappings: dataset.columnMappings,
        fillStatus,
      });

      if (!inferred) {
        updateDataset(datasetId, {
          spectrumError:
            "Could not infer a primary signal column. Map energy and at least one absorption channel (mu, beta, mass_absorption, or od).",
        });
        openColumnMappingForDataset(dataset);
        return;
      }

      const primaryRepresentation = dataset.primaryRepresentationLocked
        ? dataset.primaryRepresentation
        : inferred.primaryRepresentation;

      const absorptionColumn = dataset.primaryRepresentationLocked
        ? resolvePrimaryAbsorptionColumn(
            dataset.columnMappings,
            primaryRepresentation,
          )
        : inferred.absorptionColumn;

      if (!absorptionColumn) {
        updateDataset(datasetId, {
          spectrumError:
            "Primary column mapping is incomplete. Open column mapping and assign the primary signal column.",
        });
        openColumnMappingForDataset(dataset);
        return;
      }

      const needsExplicitChoice =
        inferred.needsExplicitChoice && !dataset.primaryRepresentationLocked;

      if (needsExplicitChoice) {
        openColumnMappingForDataset(dataset);
      }

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

          const cm = dataset.columnMappings;
          const i0v = readOptionalFloat(row, cm.i0);
          if (i0v !== undefined) point.i0 = i0v;
          const odv = readOptionalFloat(row, cm.od);
          if (odv !== undefined) point.od = odv;
          const rawabsErr = readOptionalFloat(row, cm.rawabsError);
          if (rawabsErr !== undefined) point.rawabsError = rawabsErr;
          const odErr = readOptionalFloat(row, cm.odError);
          if (odErr !== undefined) point.odError = odErr;
          const massv = readOptionalFloat(row, cm.massabsorption);
          if (massv !== undefined) point.massabsorption = massv;
          const massErr = readOptionalFloat(row, cm.massabsorptionError);
          if (massErr !== undefined) point.massabsorptionError = massErr;
          const betav = readOptionalFloat(row, cm.beta);
          if (betav !== undefined) point.beta = betav;
          const betaErr = readOptionalFloat(row, cm.betaError);
          if (betaErr !== undefined) point.betaError = betaErr;
          const deltav = readOptionalFloat(row, cm.delta);
          if (deltav !== undefined) point.delta = deltav;
          const deltaErrv = readOptionalFloat(row, cm.deltaError);
          if (deltaErrv !== undefined) point.deltaError = deltaErrv;

          spectrumPoints.push(
            tagNativeChannelFromPrimary(point, primaryRepresentation),
          );
        }

        const warnings = buildUploadScaleSanityWarnings({
          points: spectrumPoints,
          primaryRepresentation,
          bareAtomPoints: dataset.bareAtomPoints,
        });
        if (inferred.needsExplicitChoice) {
          warnings.unshift(
            "Multiple signal columns are filled; confirm the primary representation in column mapping before submitting.",
          );
        }

        updateDataset(datasetId, {
          spectrumPoints,
          spectrumError: undefined,
          columnMappings: {
            ...dataset.columnMappings,
            absorption: absorptionColumn,
          },
          primaryRepresentation,
          primaryInferenceNeedsChoice: needsExplicitChoice,
          uploadParseWarnings: warnings,
          normalizationScope: isProcessedPrimary(primaryRepresentation)
            ? "none"
            : dataset.normalizationScope,
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
    [datasets, openColumnMappingForDataset, updateDataset],
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

        const matchedInstrumentId = matchInstrumentIdFromParsedNexafsFilename(
          parsedFilename,
          instrumentOptions,
        );
        if (matchedInstrumentId) {
          updates.instrumentId = matchedInstrumentId;
        }

        setDatasets((prev) => [...prev, { ...dataset, ...updates }]);
        setActiveDatasetId((prev) => prev ?? dataset.id);

        const isJson = file.name.toLowerCase().endsWith(".json");

        try {
          if (isJson) {
            const { spectrumPoints, columns, rawData, documentMetadata } =
              await parseNexafsJson(file);

            const baseSampleInfo = createEmptyDatasetState(file).sampleInfo;
            const autofill = buildNexafsUploadAutofill({
              parsedFilename,
              documentMetadata,
              instrumentOptions,
              vendors,
              experimentType: updates.experimentType,
              instrumentId: updates.instrumentId,
              baseSampleInfo,
            });

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
              ...detectAuxiliarySpectrumColumnNames(columns),
            };

            setDatasets((prev) =>
              prev.map((d) => {
                if (d.id !== dataset.id) return d;
                return {
                  ...d,
                  ...updates,
                  csvColumns: columns,
                  csvRawData: rawData,
                  columnMappings,
                  spectrumPoints,
                  sampleInfo: autofill.sampleInfo,
                  attributions: dedupeDatasetAttributions([
                    ...filterValidOrcidAttributions(d.attributions),
                    ...autofill.attributions,
                  ]),
                  collectedByUserIds: collectorOrcidsFromAttributions(
                    dedupeDatasetAttributions([
                      ...filterValidOrcidAttributions(d.attributions),
                      ...autofill.attributions,
                    ]),
                  ),
                };
              }),
            );

            if (spectrumPoints.length > 0) {
              setTimeout(() => processDatasetDataRef.current(dataset.id), 50);
            } else {
              const missingColumns: string[] = [];
              if (!columnMappings.energy) missingColumns.push("Energy");
              const inferred = inferPrimaryRepresentation({
                mappings: columnMappings,
                fillStatus: classifyColumnFillStatus(rawData, columnMappings),
              });
              if (!inferred) {
                missingColumns.push(
                  "Primary signal (mu, beta, mass_absorption, or od)",
                );
              }
              if (missingColumns.length > 0) {
                showToast(
                  `Missing required columns: ${missingColumns.join(", ")}. Opening column mapping.`,
                  "error",
                  8000,
                );
                setColumnMappingFile({ file, datasetId: dataset.id });
              } else if (inferred?.needsExplicitChoice) {
                setColumnMappingFile({ file, datasetId: dataset.id });
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
                ...detectAuxiliarySpectrumColumnNames(columns),
              };

              const csvRows = Array.isArray(parsed.data) ? parsed.data : [];
              const missingColumns: string[] = [];
              if (!columnMappings.energy) missingColumns.push("Energy");
              const inferred = inferPrimaryRepresentation({
                mappings: columnMappings,
                fillStatus: classifyColumnFillStatus(csvRows, columnMappings),
              });
              if (!inferred) {
                missingColumns.push(
                  "Primary signal (mu, beta, mass_absorption, or od)",
                );
              }

              const baseSampleInfo = createEmptyDatasetState(file).sampleInfo;
              const autofill = buildNexafsUploadAutofill({
                parsedFilename,
                documentMetadata: null,
                instrumentOptions,
                vendors,
                experimentType: updates.experimentType,
                instrumentId: updates.instrumentId,
                baseSampleInfo,
              });

              setDatasets((prev) =>
                prev.map((d) => {
                  if (d.id !== dataset.id) return d;
                  return {
                    ...d,
                    ...updates,
                    csvColumns: columns,
                    csvRawData: Array.isArray(parsed.data) ? parsed.data : [],
                    columnMappings,
                    sampleInfo: autofill.sampleInfo,
                    attributions: dedupeDatasetAttributions([
                      ...filterValidOrcidAttributions(d.attributions),
                      ...autofill.attributions,
                    ]),
                    collectedByUserIds: collectorOrcidsFromAttributions(
                      dedupeDatasetAttributions([
                        ...filterValidOrcidAttributions(d.attributions),
                        ...autofill.attributions,
                      ]),
                    ),
                  };
                }),
              );

              if (missingColumns.length > 0) {
                showToast(
                  `Missing required columns: ${missingColumns.join(", ")}. Opening column mapping.`,
                  "error",
                  8000,
                );
                setColumnMappingFile({ file, datasetId: dataset.id });
              } else if (inferred?.needsExplicitChoice) {
                setColumnMappingFile({ file, datasetId: dataset.id });
              }

              if (inferred) {
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
    [updateDataset, edgeOptions, instrumentOptions, vendors, showToast],
  );

  useEffect(() => {
    if (vendors.length === 0) return;
    setDatasets((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        const { vendorId, newVendorName } = d.sampleInfo;
        if (vendorId || !newVendorName.trim()) return d;
        const matched = findMatchingVendorId(newVendorName.trim(), vendors);
        if (!matched) return d;
        changed = true;
        return {
          ...d,
          sampleInfo: {
            ...d.sampleInfo,
            vendorId: matched,
            newVendorName: "",
          },
        };
      });
      return changed ? next : prev;
    });
  }, [vendors]);

  const handleColumnMappingConfirm = useCallback(
    (
      mappings: CSVColumnMappings,
      fixedValues?: { theta?: string; phi?: string },
      primaryRepresentation?: PrimaryRepresentation,
    ) => {
      if (!columnMappingFile) return;

      const lockedPrimary = primaryRepresentation ?? "raw_mu";
      const primaryColumn = resolvePrimaryAbsorptionColumn(
        mappings,
        lockedPrimary,
      );

      const updates: Partial<DatasetState> = {
        columnMappings: {
          ...mappings,
          absorption: primaryColumn ?? mappings.absorption,
        },
        primaryInferenceNeedsChoice: false,
        primaryRepresentation: lockedPrimary,
        primaryRepresentationLocked: true,
      };
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
            `${d.id}:${d.columnMappings.energy}:${d.columnMappings.absorption}:${d.primaryRepresentation}:${d.columnMappings.theta ?? ""}:${d.columnMappings.phi ?? ""}:${d.columnMappings.i0 ?? ""}:${d.columnMappings.od ?? ""}:${d.columnMappings.massabsorption ?? ""}:${d.columnMappings.beta ?? ""}:${d.columnMappings.f2 ?? ""}:${d.columnMappings.epsilon2 ?? ""}:${d.columnMappings.chi2 ?? ""}:${d.columnMappings.delta ?? ""}:${d.columnMappings.deltaError ?? ""}:${d.columnMappings.rawabsError ?? ""}:${d.columnMappings.odError ?? ""}:${d.columnMappings.massabsorptionError ?? ""}:${d.columnMappings.betaError ?? ""}:${d.fixedTheta ?? ""}:${d.fixedPhi ?? ""}:${Array.isArray(d.csvRawData) ? d.csvRawData.length : 0}`,
        )
        .join(","),
    [datasets],
  );

  useEffect(() => {
    datasets.forEach((dataset) => {
      if (
        Array.isArray(dataset.csvRawData) &&
        dataset.csvRawData.length > 0 &&
        dataset.columnMappings.energy
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
    openColumnMappingForDataset,
    handleColumnMappingConfirm,
    handleColumnMappingClose,
  };
}
