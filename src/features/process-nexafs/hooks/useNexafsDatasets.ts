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
  normalizeEdge,
  normalizeExperimentMode,
  parseNexafsJson,
  parseCSVFile,
  detectAuxiliarySpectrumColumnNames,
  matchInstrumentIdFromParsedNexafsFilename,
  buildNexafsUploadAutofill,
  parseNexafsFilename,
  experimentTypeFromParsedFilename,
  isSpectrumUploadFileName,
  moleculeLookupTokens,
} from "../utils";
import {
  resolveUploadFixedPhi,
  DEFAULT_UPLOAD_PHI_DEGREES,
} from "../utils/default-upload-phi";
import {
  csvParseNeedsUserHelp,
  detectCsvParseChallenges,
  detectSpectrumColumnNames,
} from "../utils/csvParseChallenge";
import { describeInvalidPolarizationGeometry } from "../utils/polarizationAngle";
import type { CsvParseOptionsState } from "../types";
import type { ParseNexafsCsvOptions } from "../utils/csv";
import {
  applySpectrumEnergyConflictResolution,
  detectSpectrumEnergyConflictGroups,
  preflightSpectrumPointsEnergyUniqueness,
  type SpectrumEnergyConflictGroup,
  type SpectrumEnergyConflictResolutionChoice,
} from "~/lib/nexafs/spectrumPointEnergyUniqueness";

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
  /**
   * Resolves a filename molecule token (for example `ZnPc`) to an Atlas molecule id.
   * Prefer exact synonym / common-name matches.
   */
  resolveMoleculeIdFromToken?: (
    token: string,
  ) => Promise<string | null>;
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

export function useNexafsDatasets(options: UseNexafsDatasetsOptions) {
  const {
    instrumentOptions,
    edgeOptions,
    vendors,
    showToast,
    resolveMoleculeIdFromToken,
  } = options;
  const [datasets, setDatasets] = useState<DatasetState[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [batchInstrumentId, setBatchInstrumentIdState] = useState("");
  const [columnMappingFile, setColumnMappingFile] = useState<{
    file: File;
    datasetId: string;
  } | null>(null);
  const [energyConflictModal, setEnergyConflictModal] = useState<{
    datasetId: string;
    groups: SpectrumEnergyConflictGroup[];
  } | null>(null);

  const setBatchInstrumentId = useCallback(
    (instrumentId: string, applyToExisting = true) => {
      setBatchInstrumentIdState(instrumentId);
      if (applyToExisting && instrumentId) {
        setDatasets((prev) =>
          prev.map((dataset) =>
            dataset.instrumentId === instrumentId
              ? dataset
              : { ...dataset, instrumentId },
          ),
        );
      }
    },
    [],
  );

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
          } else {
            const effectiveFixedPhi = resolveUploadFixedPhi(
              dataset.fixedPhi,
              Boolean(phiColumn),
            );
            if (effectiveFixedPhi !== undefined && effectiveFixedPhi !== "") {
              const fixedPhiValue = parseFloat(effectiveFixedPhi);
              if (!isNaN(fixedPhiValue)) point.phi = fixedPhiValue;
            }
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

          spectrumPoints.push(point);
        }

        const invalidGeometryMessages: string[] = [];
        const seenGeometry = new Set<string>();
        for (const point of spectrumPoints) {
          if (
            typeof point.theta !== "number" ||
            typeof point.phi !== "number" ||
            !Number.isFinite(point.theta) ||
            !Number.isFinite(point.phi)
          ) {
            continue;
          }
          const key = `${point.theta}:${point.phi}`;
          if (seenGeometry.has(key)) continue;
          seenGeometry.add(key);
          const message = describeInvalidPolarizationGeometry(
            point.theta,
            point.phi,
          );
          if (message) invalidGeometryMessages.push(message);
        }

        const challenges = detectCsvParseChallenges({
          columns: dataset.csvColumns,
          rawData: dataset.csvRawData,
          mappings: dataset.columnMappings,
          spectrumPointCount: spectrumPoints.length,
          invalidGeometryMessage:
            invalidGeometryMessages.length > 0
              ? invalidGeometryMessages.join(" | ")
              : null,
        });

        const challengeMessages = challenges.map((c) => c.message);
        const preflight = preflightSpectrumPointsEnergyUniqueness(spectrumPoints);

        if (!preflight.ok) {
          setEnergyConflictModal({
            datasetId,
            groups: preflight.conflicts,
          });
          updateDataset(datasetId, {
            spectrumPoints,
            spectrumError: undefined,
            csvParseChallenges: [
              ...challengeMessages,
              `Duplicate photon energies with conflicting values (${preflight.conflicts.length} group${preflight.conflicts.length === 1 ? "" : "s"}). Resolve before submit.`,
            ],
          });
          return;
        }

        if (preflight.collapsedCount > 0) {
          showToast(
            `Removed ${preflight.collapsedCount} identical duplicate energy row${preflight.collapsedCount === 1 ? "" : "s"} from "${dataset.fileName}".`,
            "success",
            5000,
          );
        }

        updateDataset(datasetId, {
          spectrumPoints: preflight.points,
          spectrumError: undefined,
          csvParseChallenges: challengeMessages,
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
    [datasets, showToast, updateDataset],
  );

  const processDatasetDataRef = useRef(processDatasetData);
  processDatasetDataRef.current = processDatasetData;

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const spectrumFiles = files.filter((file) =>
        isSpectrumUploadFileName(file.name),
      );
      const skippedCount = files.length - spectrumFiles.length;
      if (skippedCount > 0) {
        showToast(
          `Skipped ${skippedCount} non-CSV/JSON file${skippedCount === 1 ? "" : "s"}.`,
          "error",
          6000,
        );
      }
      if (spectrumFiles.length === 0) {
        if (files.length > 0) {
          showToast(
            "No CSV or JSON spectrum files found in the drop.",
            "error",
            8000,
          );
        }
        return;
      }

      for (const file of spectrumFiles) {
        const dataset = createEmptyDatasetState(file);
        const parsedFilename = parseNexafsFilename(file.name);
        const updates: Partial<DatasetState> = {};

        const experimentType = experimentTypeFromParsedFilename(parsedFilename);
        if (experimentType) {
          updates.experimentType = experimentType;
        } else if (parsedFilename.experimentMode) {
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

        const matchedInstrumentId = matchInstrumentIdFromParsedNexafsFilename(
          parsedFilename,
          instrumentOptions,
        );
        if (batchInstrumentId) {
          updates.instrumentId = batchInstrumentId;
        } else if (matchedInstrumentId) {
          updates.instrumentId = matchedInstrumentId;
        }

        if (parsedFilename.moleculeToken && resolveMoleculeIdFromToken) {
          const tokens = moleculeLookupTokens(parsedFilename.moleculeToken);
          for (const token of tokens) {
            const moleculeId = await resolveMoleculeIdFromToken(token);
            if (moleculeId) {
              updates.moleculeId = moleculeId;
              break;
            }
          }
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

            const detected = detectSpectrumColumnNames(columns);
            const energyCol = detected.energy ?? columns[0] ?? "";
            const absorptionCol = detected.absorption ?? columns[1] ?? "";

            const columnMappings: CSVColumnMappings = {
              energy: energyCol,
              absorption: absorptionCol,
              theta: detected.theta,
              phi: detected.phi,
              ...detectAuxiliarySpectrumColumnNames(columns),
            };

            const geometryDefaults: Partial<DatasetState> = {};
            if (!detected.phi) {
              geometryDefaults.fixedPhi = String(DEFAULT_UPLOAD_PHI_DEGREES);
            }

            setDatasets((prev) =>
              prev.map((d) => {
                if (d.id !== dataset.id) return d;
                return {
                  ...d,
                  ...updates,
                  ...geometryDefaults,
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
            const parseOptions: ParseNexafsCsvOptions = {
              headerRowIndex: 0,
              skipRowsAfterHeader: 0,
            };
            const parsed = await parseCSVFile(file, parseOptions);
            const columns = parsed.columns;

            if (columns.length > 0) {
              const detected = detectSpectrumColumnNames(columns);
              const columnMappings: CSVColumnMappings = {
                energy: detected.energy ?? "",
                absorption: detected.absorption ?? "",
                theta: detected.theta,
                phi: detected.phi,
                ...detectAuxiliarySpectrumColumnNames(columns),
              };

              const csvGeometryDefaults: Partial<DatasetState> = {};
              if (!detected.phi) {
                csvGeometryDefaults.fixedPhi = String(DEFAULT_UPLOAD_PHI_DEGREES);
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

              const csvParseOptions: CsvParseOptionsState = {
                headerRowIndex: parsed.options.headerRowIndex,
                skipRowsAfterHeader: parsed.options.skipRowsAfterHeader,
              };

              const preliminaryChallenges = detectCsvParseChallenges({
                columns,
                rawData: parsed.data,
                mappings: columnMappings,
                spectrumPointCount:
                  columnMappings.energy && columnMappings.absorption
                    ? parsed.data.length
                    : 0,
              });

              setDatasets((prev) =>
                prev.map((d) => {
                  if (d.id !== dataset.id) return d;
                  return {
                    ...d,
                    ...updates,
                    ...csvGeometryDefaults,
                    csvColumns: columns,
                    csvRawData: parsed.data,
                    csvParseOptions,
                    csvParseChallenges: preliminaryChallenges.map(
                      (c) => c.message,
                    ),
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

              if (csvParseNeedsUserHelp(preliminaryChallenges)) {
                setColumnMappingFile({ file, datasetId: dataset.id });
                showToast(
                  `Need help mapping columns in ${file.name}. Adjust header/data rows or pick Energy and Absorption.`,
                  "error",
                  10000,
                );
              } else if (columnMappings.energy && columnMappings.absorption) {
                setTimeout(() => processDatasetDataRef.current(dataset.id), 50);
              }
            } else {
              setDatasets((prev) =>
                prev.map((d) => {
                  if (d.id !== dataset.id) return d;
                  return {
                    ...d,
                    ...updates,
                    csvParseChallenges: [
                      "No columns were detected. Try a different header row or delimiter.",
                    ],
                    spectrumError: "CSV file has no columns.",
                  };
                }),
              );
              setColumnMappingFile({ file, datasetId: dataset.id });
              showToast(
                "CSV file has no columns. Please check the file format or choose a header row.",
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
    [updateDataset, edgeOptions, instrumentOptions, vendors, showToast, batchInstrumentId, resolveMoleculeIdFromToken],
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
    async (
      mappings: CSVColumnMappings,
      fixedValues?: { theta?: string; phi?: string },
      parseOptions?: CsvParseOptionsState,
    ) => {
      if (!columnMappingFile) return;

      const datasetId = columnMappingFile.datasetId;
      const file = columnMappingFile.file;
      const nextParseOptions: CsvParseOptionsState = parseOptions ?? {
        headerRowIndex: 0,
        skipRowsAfterHeader: 0,
      };

      try {
        const parsed = await parseCSVFile(file, nextParseOptions);
        const updates: Partial<DatasetState> = {
          columnMappings: mappings,
          csvColumns: parsed.columns,
          csvRawData: parsed.data,
          csvParseOptions: {
            headerRowIndex: parsed.options.headerRowIndex,
            skipRowsAfterHeader: parsed.options.skipRowsAfterHeader,
          },
          csvParseChallenges: [],
          spectrumError: null,
        };
        if (fixedValues?.theta !== undefined) {
          updates.fixedTheta = fixedValues.theta;
        }
        if (fixedValues?.phi !== undefined) {
          updates.fixedPhi = fixedValues.phi;
        } else if (!mappings.phi) {
          updates.fixedPhi = String(DEFAULT_UPLOAD_PHI_DEGREES);
        }

        updateDataset(datasetId, updates);
        setColumnMappingFile(null);
        setTimeout(() => processDatasetDataRef.current(datasetId), 100);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to re-parse CSV with the selected options.";
        updateDataset(datasetId, { spectrumError: message });
        showToast(message, "error", 8000);
      }
    },
    [columnMappingFile, updateDataset, showToast],
  );

  const handleColumnMappingClose = useCallback(() => {
    setColumnMappingFile(null);
  }, []);

  const datasetsDependency = useMemo(
    () =>
      datasets
        .map(
          (d) =>
            `${d.id}:${d.columnMappings.energy}:${d.columnMappings.absorption}:${d.columnMappings.theta ?? ""}:${d.columnMappings.phi ?? ""}:${d.columnMappings.i0 ?? ""}:${d.columnMappings.od ?? ""}:${d.columnMappings.massabsorption ?? ""}:${d.columnMappings.beta ?? ""}:${d.columnMappings.delta ?? ""}:${d.columnMappings.deltaError ?? ""}:${d.columnMappings.rawabsError ?? ""}:${d.columnMappings.odError ?? ""}:${d.columnMappings.massabsorptionError ?? ""}:${d.columnMappings.betaError ?? ""}:${d.fixedTheta ?? ""}:${d.fixedPhi ?? ""}:${Array.isArray(d.csvRawData) ? d.csvRawData.length : 0}`,
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

  const handleNewFolder = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.json,text/csv,application/json";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
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
    setEnergyConflictModal(null);
    setBatchInstrumentIdState("");
  }, []);

  const handleEnergyConflictClose = useCallback(() => {
    setEnergyConflictModal(null);
  }, []);

  const requestEnergyConflictResolution = useCallback(
    (datasetId: string) => {
      const dataset = datasets.find((entry) => entry.id === datasetId);
      if (!dataset) return;
      const groups = detectSpectrumEnergyConflictGroups(dataset.spectrumPoints);
      if (groups.length === 0) return;
      setActiveDatasetId(datasetId);
      setEnergyConflictModal({ datasetId, groups });
    },
    [datasets],
  );

  const handleEnergyConflictResolve = useCallback(
    (resolutionByGroupKey: Map<string, SpectrumEnergyConflictResolutionChoice>) => {
      if (!energyConflictModal) return;
      const dataset = datasets.find(
        (entry) => entry.id === energyConflictModal.datasetId,
      );
      if (!dataset) return;

      const resolved = applySpectrumEnergyConflictResolution(
        dataset.spectrumPoints,
        resolutionByGroupKey,
      );
      const preflight = preflightSpectrumPointsEnergyUniqueness(resolved);
      const finalPoints = preflight.ok ? preflight.points : resolved;

      updateDataset(energyConflictModal.datasetId, {
        spectrumPoints: finalPoints,
        spectrumError: null,
        csvParseChallenges: dataset.csvParseChallenges.filter(
          (message) =>
            !message.startsWith(
              "Duplicate photon energies with conflicting values",
            ),
        ),
      });
      setEnergyConflictModal(null);
      showToast(
        `Resolved duplicate energy conflicts in "${dataset.fileName}".`,
        "success",
      );
    },
    [datasets, energyConflictModal, showToast, updateDataset],
  );

  return {
    datasets,
    setDatasets,
    activeDatasetId,
    setActiveDatasetId,
    updateDataset,
    processDatasetData,
    handleFilesSelected,
    handleNewDataset,
    handleNewFolder,
    handleDatasetSelect,
    handleDatasetRemove,
    handleDatasetRename,
    clearDatasets,
    batchInstrumentId,
    setBatchInstrumentId,
    columnMappingFile,
    setColumnMappingFile,
    handleColumnMappingConfirm,
    handleColumnMappingClose,
    energyConflictModal,
    handleEnergyConflictClose,
    handleEnergyConflictResolve,
    requestEnergyConflictResolution,
  };
}
