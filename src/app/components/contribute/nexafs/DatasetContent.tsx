"use client";

import { useState, useEffect, useMemo } from "react";
import { skipToken } from "@tanstack/react-query";
import { PencilIcon } from "@heroicons/react/24/outline";
import { SpectrumPlot } from "~/app/components/plots/SpectrumPlot";
import type { SpectrumSelection } from "~/app/components/plots/core/types";
import { AnalysisToolbar } from "./AnalysisToolbar";
import { AddMoleculeModal } from "./AddMoleculeModal";
import { AddFacilityModal } from "./AddFacilityModal";
import { SampleInformationSection } from "./SampleInformationSection";
import { InlineColumnMapping } from "./InlineColumnMapping";
import {
  VisualizationToggle,
  type VisualizationMode,
  type GraphStyle,
} from "./VisualizationToggle";
import { trpc } from "~/trpc/client";
import { useMoleculeSearch } from "~/app/contribute/nexafs/hooks/useMoleculeSearch";
import type { MoleculeSearchResult } from "~/app/contribute/nexafs/types";
import { calculateBareAtomAbsorption } from "~/app/contribute/nexafs/utils/bareAtomCalculation";
import {
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
  extractAtomsFromFormula,
} from "~/app/contribute/nexafs/utils";
import type { DatasetState, PeakData } from "~/app/contribute/nexafs/types";
import type { DifferenceSpectrum } from "~/app/contribute/nexafs/utils/differenceSpectra";
import type { CursorMode } from "~/app/components/plots/visx/components/CursorModeSelector";

interface DatasetContentProps {
  dataset: DatasetState;
  onDatasetUpdate: (datasetId: string, updates: Partial<DatasetState>) => void;
  onReloadData?: () => void;
  instrumentOptions: Array<{ id: string; name: string; facilityName?: string }>;
  edgeOptions: Array<{ id: string; targetatom: string; corestate: string }>;
  calibrationOptions: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string }>;
  isLoadingInstruments: boolean;
  isLoadingEdges: boolean;
  isLoadingCalibrations: boolean;
  isLoadingVendors: boolean;
}

export function DatasetContent({
  dataset,
  onDatasetUpdate,
  onReloadData,
  instrumentOptions,
  edgeOptions,
  calibrationOptions: _calibrationOptions,
  vendors,
  isLoadingInstruments: _isLoadingInstruments,
  isLoadingEdges: _isLoadingEdges,
  isLoadingCalibrations: _isLoadingCalibrations,
  isLoadingVendors,
}: DatasetContentProps) {
  const [showAddMoleculeModal, setShowAddMoleculeModal] = useState(false);
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [isCalculatingBareAtom, setIsCalculatingBareAtom] = useState(false);
  const [bareAtomError, setBareAtomError] = useState<string | null>(null);
  const [normalizationSelectionTarget, setNormalizationSelectionTarget] =
    useState<"pre" | "post" | null>(null);
  const [isManualPeakMode, setIsManualPeakMode] = useState(false);
  const [differenceSpectra, setDifferenceSpectra] = useState<
    DifferenceSpectrum[]
  >([]);
  const [showThetaData, setShowThetaData] = useState(false);
  const [showPhiData, setShowPhiData] = useState(false);
  const [selectedGeometry, setSelectedGeometry] = useState<{
    theta?: number;
    phi?: number;
  } | null>(null);
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("table");
  const [graphStyle, setGraphStyle] = useState<GraphStyle>("line");
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");

  // Molecule search hook - per dataset
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
    allMoleculeNames,
    selectMolecule,
  } = useMoleculeSearch({
    onSelectionChange: (molecule) => {
      if (molecule?.id) {
        onDatasetUpdate(dataset.id, { moleculeId: molecule.id });
      } else {
        onDatasetUpdate(dataset.id, { moleculeId: null });
      }
    },
  });

  // Sync molecule selection with dataset - fetch molecule if ID is set but molecule not loaded
  const moleculeQuery = trpc.molecules.getById.useQuery(
    dataset.moleculeId ? { id: dataset.moleculeId } : skipToken,
    {
      enabled:
        !!dataset.moleculeId &&
        (!selectedMolecule || selectedMolecule.id !== dataset.moleculeId),
    },
  );

  useEffect(() => {
    if (
      moleculeQuery.data &&
      (!selectedMolecule || selectedMolecule.id !== moleculeQuery.data.id)
    ) {
      const molecule: MoleculeSearchResult = {
        id: moleculeQuery.data.id,
        iupacName: moleculeQuery.data.iupacName,
        commonName:
          moleculeQuery.data.commonName?.[0] ?? moleculeQuery.data.iupacName,
        synonyms: moleculeQuery.data.commonName ?? [],
        inchi: moleculeQuery.data.InChI,
        smiles: moleculeQuery.data.SMILES,
        chemicalFormula: moleculeQuery.data.chemicalFormula,
        casNumber: moleculeQuery.data.casNumber ?? null,
        pubChemCid: moleculeQuery.data.pubChemCid ?? null,
        imageUrl: moleculeQuery.data.imageUrl ?? undefined,
      };
      selectMolecule(molecule);
    }
  }, [moleculeQuery.data, selectedMolecule, selectMolecule]);

  // Extract atoms from selected molecule's chemical formula
  const moleculeAtoms = useMemo(() => {
    return selectedMolecule?.chemicalFormula
      ? extractAtomsFromFormula(selectedMolecule.chemicalFormula)
      : new Set<string>();
  }, [selectedMolecule?.chemicalFormula]);

  // Filter edge options to only show edges for atoms present in the molecule
  const availableEdgeOptions = useMemo(() => {
    if (moleculeAtoms.size === 0 || !dataset.moleculeLocked) {
      return edgeOptions;
    }

    return edgeOptions.filter((edge) =>
      moleculeAtoms.has(edge.targetatom.toUpperCase()),
    );
  }, [edgeOptions, moleculeAtoms, dataset.moleculeLocked]);

  // Check if current edge selection matches molecule atoms
  const selectedEdge = edgeOptions.find((e) => e.id === dataset.edgeId);
  const edgeAtomMatches =
    !selectedMolecule ||
    !selectedEdge ||
    moleculeAtoms.has(selectedEdge.targetatom.toUpperCase());

  // Clear edge selection if molecule is locked and edge doesn't match
  useEffect(() => {
    if (
      dataset.moleculeLocked &&
      selectedMolecule &&
      selectedEdge &&
      !edgeAtomMatches
    ) {
      onDatasetUpdate(dataset.id, { edgeId: "" });
    }
  }, [
    dataset.moleculeLocked,
    selectedMolecule,
    selectedEdge,
    edgeAtomMatches,
    dataset.id,
    onDatasetUpdate,
  ]);

  // Calculate bare atom absorption when molecule is selected
  useEffect(() => {
    if (
      selectedMolecule?.chemicalFormula &&
      dataset.spectrumPoints.length > 0
    ) {
      // Only recalculate if bare atom points don't exist
      // Note: We always recalculate when molecule changes since BareAtomPoint doesn't store the formula
      const needsRecalculation =
        !dataset.bareAtomPoints || dataset.bareAtomPoints.length === 0;

      if (needsRecalculation) {
        setIsCalculatingBareAtom(true);
        setBareAtomError(null);

        calculateBareAtomAbsorption(
          selectedMolecule.chemicalFormula,
          dataset.spectrumPoints,
        )
          .then((points) => {
            onDatasetUpdate(dataset.id, { bareAtomPoints: points });
            setIsCalculatingBareAtom(false);
          })
          .catch((error) => {
            console.error("Failed to calculate bare atom absorption:", error);
            setBareAtomError(
              error instanceof Error ? error.message : "Calculation failed",
            );
            setIsCalculatingBareAtom(false);
          });
      }
    } else if (!selectedMolecule && dataset.bareAtomPoints) {
      onDatasetUpdate(dataset.id, { bareAtomPoints: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMolecule?.chemicalFormula,
    dataset.spectrumPoints.length,
    dataset.id,
  ]);

  // Compute normalization when regions are selected
  useEffect(() => {
    if (
      dataset.spectrumPoints.length > 0 &&
      dataset.normalizationRegions.pre &&
      dataset.normalizationRegions.post
    ) {
      const preRange = dataset.normalizationRegions.pre;
      const postRange = dataset.normalizationRegions.post;

      let result: ReturnType<typeof computeNormalizationForExperiment> | null =
        null;

      if (dataset.normalizationType === "bare-atom") {
        // Bare atom normalization requires bare atom points
        if (dataset.bareAtomPoints && dataset.bareAtomPoints.length > 0) {
          // Count points in each range
          const preCount = dataset.spectrumPoints.filter(
            (p) => p.energy >= preRange[0] && p.energy <= preRange[1],
          ).length;
          const postCount = dataset.spectrumPoints.filter(
            (p) => p.energy >= postRange[0] && p.energy <= postRange[1],
          ).length;

          if (preCount > 0 && postCount > 0) {
            result = computeNormalizationForExperiment(
              dataset.spectrumPoints,
              dataset.bareAtomPoints,
              preCount,
              postCount,
            );
          }
        }
      } else {
        // Zero-one normalization
        result = computeZeroOneNormalization(
          dataset.spectrumPoints,
          preRange,
          postRange,
        );
      }

      if (result) {
        // Only update if normalization actually changed
        const currentNormalization = dataset.normalization;
        const needsUpdate =
          !currentNormalization ||
          currentNormalization.scale !== result.scale ||
          currentNormalization.offset !== result.offset ||
          currentNormalization.preRange?.[0] !== result.preRange?.[0] ||
          currentNormalization.preRange?.[1] !== result.preRange?.[1] ||
          currentNormalization.postRange?.[0] !== result.postRange?.[0] ||
          currentNormalization.postRange?.[1] !== result.postRange?.[1];

        if (needsUpdate) {
          onDatasetUpdate(dataset.id, {
            normalizedPoints: result.normalizedPoints,
            normalization: {
              scale: result.scale,
              offset: result.offset,
              preRange: result.preRange,
              postRange: result.postRange,
            },
          });
        }
      } else {
        // Clear normalization if it cannot be computed
        // This happens when switching to bare-atom without bare atom points,
        // or when zero-one normalization fails
        if (
          dataset.normalizedPoints !== null ||
          dataset.normalization !== null
        ) {
          onDatasetUpdate(dataset.id, {
            normalizedPoints: null,
            normalization: null,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataset.bareAtomPoints?.length,
    dataset.spectrumPoints.length,
    dataset.normalizationRegions.pre?.[0],
    dataset.normalizationRegions.pre?.[1],
    dataset.normalizationRegions.post?.[0],
    dataset.normalizationRegions.post?.[1],
    dataset.normalizationType,
    dataset.id,
  ]);

  const handleMoleculeCreated = (moleculeId: string) => {
    setShowAddMoleculeModal(false);
    // The molecule selector should refresh and select the new molecule
    // For now, we'll just close the modal - the user can search for it
  };

  const handleFacilityCreated = (facilityId: string, instrumentId: string) => {
    setShowAddFacilityModal(false);
    onDatasetUpdate(dataset.id, { instrumentId });
  };

  const handleNormalizationSelection = (
    selection: SpectrumSelection | null,
  ) => {
    if (!selection || !normalizationSelectionTarget) return;

    const range: [number, number] = [
      Math.min(selection.energyMin, selection.energyMax),
      Math.max(selection.energyMin, selection.energyMax),
    ];

    if (normalizationSelectionTarget === "pre") {
      onDatasetUpdate(dataset.id, {
        normalizationRegions: {
          ...dataset.normalizationRegions,
          pre: range,
        },
      });
    } else {
      onDatasetUpdate(dataset.id, {
        normalizationRegions: {
          ...dataset.normalizationRegions,
          post: range,
        },
      });
    }

    setNormalizationSelectionTarget(null);
  };

  const handleToggleLock = () => {
    onDatasetUpdate(dataset.id, {
      normalizationLocked: !dataset.normalizationLocked,
    });
  };

  const handleToggleMoleculeLock = () => {
    onDatasetUpdate(dataset.id, {
      moleculeLocked: !dataset.moleculeLocked,
    });
  };

  // Prepare plot data
  const plotPoints = dataset.normalizedPoints ?? dataset.spectrumPoints;
  const referenceCurves = dataset.bareAtomPoints
    ? [
        {
          label: "Bare Atom Absorption",
          points: dataset.bareAtomPoints,
          color: "#6b7280",
        },
      ]
    : [];

  const normalizationRegions = dataset.normalizationLocked
    ? {
        pre: dataset.normalizationRegions.pre,
        post: dataset.normalizationRegions.post,
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Column Mapping Section - Show when CSV data exists but no spectrum points AND not in table mode */}
      {dataset.csvRawData.length > 0 &&
        dataset.csvColumns.length > 0 &&
        visualizationMode !== "table" &&
        (!dataset.spectrumPoints.length ||
          !dataset.columnMappings.energy ||
          !dataset.columnMappings.absorption) && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <InlineColumnMapping
              columns={dataset.csvColumns}
              rawData={dataset.csvRawData}
              mappings={dataset.columnMappings}
              fixedTheta={dataset.fixedTheta}
              fixedPhi={dataset.fixedPhi}
              onMappingsChange={(newMappings) => {
                onDatasetUpdate(dataset.id, { columnMappings: newMappings });
                if (onReloadData) {
                  setTimeout(() => {
                    onReloadData();
                  }, 100);
                }
              }}
              onFixedValuesChange={(values) => {
                const updates: Partial<DatasetState> = {};
                if (values.theta !== undefined) {
                  updates.fixedTheta = values.theta;
                }
                if (values.phi !== undefined) {
                  updates.fixedPhi = values.phi;
                }
                onDatasetUpdate(dataset.id, updates);
                if (onReloadData) {
                  setTimeout(() => {
                    onReloadData();
                  }, 100);
                }
              }}
            />
          </div>
        )}

      {/* Main Content Area */}
      <div className="flex items-stretch gap-6">
        {/* Analysis Toolbar */}
        <AnalysisToolbar
          hasMolecule={!!dataset.moleculeId}
          hasData={dataset.spectrumPoints.length > 0}
          hasNormalization={!!dataset.normalization}
          normalizationLocked={dataset.normalizationLocked}
          normalizationType={dataset.normalizationType}
          onNormalizationTypeChange={(type) => {
            onDatasetUpdate(dataset.id, { normalizationType: type });
          }}
          onPreEdgeSelect={() => setNormalizationSelectionTarget("pre")}
          onPostEdgeSelect={() => setNormalizationSelectionTarget("post")}
          onToggleLock={handleToggleLock}
          isSelectingPreEdge={normalizationSelectionTarget === "pre"}
          isSelectingPostEdge={normalizationSelectionTarget === "post"}
          normalizationRegions={dataset.normalizationRegions}
          onNormalizationRegionChange={(type, range) => {
            onDatasetUpdate(dataset.id, {
              normalizationRegions: {
                ...dataset.normalizationRegions,
                [type]: range,
              },
            });
          }}
          peaks={dataset.peaks.map((peak, index) => ({
            ...peak,
            id: peak.id ?? `peak-${index}-${peak.energy}`,
          }))}
          spectrumPoints={dataset.spectrumPoints}
          normalizedPoints={dataset.normalizedPoints}
          selectedPeakId={dataset.selectedPeakId}
          onPeaksChange={(peaks) => onDatasetUpdate(dataset.id, { peaks })}
          onPeakSelect={(peakId) =>
            onDatasetUpdate(dataset.id, { selectedPeakId: peakId })
          }
          onPeakUpdate={(peakId, energy) => {
            const updatedPeaks = dataset.peaks.map((peak) => {
              const currentId =
                peak.id ?? `peak-${dataset.peaks.indexOf(peak)}-${peak.energy}`;
              if (currentId === peakId) {
                return { ...peak, energy };
              }
              return peak;
            });
            onDatasetUpdate(dataset.id, { peaks: updatedPeaks });
          }}
          onPeakAdd={(energy) => {
            const newPeak = {
              energy: Math.round(energy * 100) / 100,
              id: `peak-manual-${Date.now()}`,
            } as PeakData & { id: string };
            onDatasetUpdate(dataset.id, {
              peaks: [...dataset.peaks, newPeak],
            });
          }}
          isManualPeakMode={isManualPeakMode}
          onManualPeakModeChange={setIsManualPeakMode}
          differenceSpectra={differenceSpectra}
          onDifferenceSpectraChange={setDifferenceSpectra}
          showThetaData={showThetaData}
          showPhiData={showPhiData}
          onShowThetaDataChange={setShowThetaData}
          onShowPhiDataChange={setShowPhiData}
          selectedGeometry={selectedGeometry}
          onSelectedGeometryChange={setSelectedGeometry}
          onReloadData={onReloadData}
          moleculeId={dataset.moleculeId}
          instrumentId={dataset.instrumentId}
          edgeId={dataset.edgeId}
          onMoleculeChange={(moleculeId) =>
            onDatasetUpdate(dataset.id, { moleculeId })
          }
          onInstrumentChange={(instrumentId) =>
            onDatasetUpdate(dataset.id, { instrumentId })
          }
          onEdgeChange={(edgeId) => {
            onDatasetUpdate(dataset.id, { edgeId });
          }}
          instrumentOptions={instrumentOptions}
          edgeOptions={edgeOptions}
          availableEdgeOptions={availableEdgeOptions}
          onAddFacility={() => setShowAddFacilityModal(true)}
          moleculeSearchTerm={searchTerm}
          onMoleculeSearchTermChange={setSearchTerm}
          moleculeSuggestions={suggestions}
          moleculeManualResults={manualResults}
          moleculeSuggestionError={suggestionError}
          moleculeManualError={manualError}
          isMoleculeSuggesting={isSuggesting}
          isMoleculeManualSearching={isManualSearching}
          selectedMolecule={selectedMolecule}
          selectedMoleculePreferredName={selectedPreferredName}
          onSelectedMoleculePreferredNameChange={setSelectedPreferredName}
          allMoleculeNames={allMoleculeNames}
          onUseMolecule={(result) => selectMolecule(result)}
          onMoleculeManualSearch={runManualSearch}
          moleculeLocked={dataset.moleculeLocked}
          onToggleMoleculeLock={handleToggleMoleculeLock}
          edgeAtomMatches={edgeAtomMatches}
          selectedEdge={selectedEdge}
        />

        {/* Plot and Analysis */}
        <div className="flex-1">
          {/* Visualization Toggle and Plot */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <VisualizationToggle
                mode={visualizationMode}
                graphStyle={graphStyle}
                onModeChange={setVisualizationMode}
                onGraphStyleChange={setGraphStyle}
              />
            </div>
            <div className="min-h-[600px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              {visualizationMode === "graph" && plotPoints.length > 0 ? (
                <SpectrumPlot
                  points={plotPoints}
                  height={600}
                  referenceCurves={referenceCurves}
                  normalizationRegions={normalizationRegions}
                  selectionTarget={normalizationSelectionTarget}
                  onSelectionChange={handleNormalizationSelection}
                  peaks={dataset.peaks.map((peak, index) => ({
                    energy: peak.energy,
                    id: peak.id ?? `peak-${index}-${peak.energy}`,
                  }))}
                  selectedPeakId={dataset.selectedPeakId}
                  onPeakSelect={(peakId) =>
                    onDatasetUpdate(dataset.id, { selectedPeakId: peakId })
                  }
                  onPeakUpdate={(peakId, energy) => {
                    const roundedEnergy = Math.round(energy * 100) / 100;
                    const updatedPeaks = dataset.peaks.map((peak) => {
                      const currentId =
                        peak.id ??
                        `peak-${dataset.peaks.indexOf(peak)}-${peak.energy}`;
                      if (currentId === peakId) {
                        return { ...peak, energy: roundedEnergy };
                      }
                      return peak;
                    });
                    onDatasetUpdate(dataset.id, { peaks: updatedPeaks });
                  }}
                  onPeakDelete={(peakId) => {
                    const updatedPeaks = dataset.peaks.filter((peak) => {
                      const currentId =
                        peak.id ??
                        `peak-${dataset.peaks.indexOf(peak)}-${peak.energy}`;
                      return currentId !== peakId;
                    });
                    onDatasetUpdate(dataset.id, {
                      peaks: updatedPeaks,
                      selectedPeakId:
                        dataset.selectedPeakId === peakId
                          ? null
                          : dataset.selectedPeakId,
                    });
                  }}
                  onPeakAdd={(energy) => {
                    const roundedEnergy = Math.round(energy * 100) / 100;

                    // Estimate amplitude from spectrum at this energy
                    const pointsToAnalyze =
                      dataset.normalizedPoints ?? dataset.spectrumPoints;
                    let amplitude: number | undefined;
                    if (pointsToAnalyze.length > 0) {
                      // Find closest point to estimate amplitude
                      let closestPoint = pointsToAnalyze[0];
                      let minDistance = Math.abs(
                        pointsToAnalyze[0]!.energy - roundedEnergy,
                      );
                      for (const point of pointsToAnalyze) {
                        const distance = Math.abs(point.energy - roundedEnergy);
                        if (distance < minDistance) {
                          minDistance = distance;
                          closestPoint = point;
                        }
                      }
                      amplitude = closestPoint?.absorption;
                    }

                    const newPeak = {
                      energy: roundedEnergy,
                      amplitude,
                      id: `peak-manual-${Date.now()}`,
                    } as PeakData & { id: string };
                    onDatasetUpdate(dataset.id, {
                      peaks: [...dataset.peaks, newPeak],
                    });
                  }}
                  isManualPeakMode={isManualPeakMode}
                  differenceSpectra={differenceSpectra}
                  showThetaData={showThetaData}
                  showPhiData={showPhiData}
                  selectedGeometry={selectedGeometry}
                  cursorMode={cursorMode}
                  onCursorModeChange={setCursorMode}
                />
              ) : visualizationMode === "table" ? (
                dataset.csvRawData.length > 0 &&
                dataset.csvColumns.length > 0 ? (
                  <InlineColumnMapping
                    columns={dataset.csvColumns}
                    rawData={dataset.csvRawData}
                    mappings={dataset.columnMappings}
                    fixedTheta={dataset.fixedTheta}
                    fixedPhi={dataset.fixedPhi}
                    onMappingsChange={(newMappings) => {
                      onDatasetUpdate(dataset.id, {
                        columnMappings: newMappings,
                      });
                      if (onReloadData) {
                        setTimeout(() => {
                          onReloadData();
                        }, 100);
                      }
                    }}
                    onFixedValuesChange={(values) => {
                      const updates: Partial<DatasetState> = {};
                      if (values.theta !== undefined) {
                        updates.fixedTheta = values.theta;
                      }
                      if (values.phi !== undefined) {
                        updates.fixedPhi = values.phi;
                      }
                      onDatasetUpdate(dataset.id, updates);
                      if (onReloadData) {
                        setTimeout(() => {
                          onReloadData();
                        }, 100);
                      }
                    }}
                  />
                ) : dataset.spectrumPoints.length > 0 ? (
                  <div className="max-h-[600px] overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-300">
                            Energy (eV)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-300">
                            Absorption
                          </th>
                          {plotPoints.some(
                            (p) => typeof p.theta === "number",
                          ) && (
                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-300">
                              θ (°)
                            </th>
                          )}
                          {plotPoints.some(
                            (p) => typeof p.phi === "number",
                          ) && (
                            <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-300">
                              φ (°)
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {dataset.spectrumPoints
                          .slice(0, 1000)
                          .map((point, index) => (
                            <tr
                              key={`${point.energy}-${index}`}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                              <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-100">
                                {point.energy.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-100">
                                {point.absorption.toExponential(3)}
                              </td>
                              {dataset.spectrumPoints.some(
                                (p) => typeof p.theta === "number",
                              ) && (
                                <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-100">
                                  {typeof point.theta === "number"
                                    ? point.theta.toFixed(1)
                                    : "-"}
                                </td>
                              )}
                              {dataset.spectrumPoints.some(
                                (p) => typeof p.phi === "number",
                              ) && (
                                <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-100">
                                  {typeof point.phi === "number"
                                    ? point.phi.toFixed(1)
                                    : "-"}
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {dataset.spectrumPoints.length > 1000 && (
                      <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                        Showing first 1000 of {dataset.spectrumPoints.length}{" "}
                        points
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <p className="font-medium">No data available</p>
                      <p className="mt-1 text-sm">
                        Upload a CSV file to see the table
                      </p>
                    </div>
                  </div>
                )
              ) : dataset.spectrumError ? (
                <div className="flex h-[400px] items-center justify-center text-red-600 dark:text-red-400">
                  <div className="text-center">
                    <p className="font-medium">Error processing data</p>
                    <p className="mt-1 text-sm">{dataset.spectrumError}</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <p className="font-medium">No spectrum data</p>
                    <p className="mt-1 text-sm">
                      Upload a CSV file to see the plot
                    </p>
                  </div>
                </div>
              )}
              {isCalculatingBareAtom && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Calculating bare atom absorption...
                </div>
              )}
              {bareAtomError && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {bareAtomError}
                </div>
              )}
            </div>

            {/* Selection Mode Toast */}
            {normalizationSelectionTarget && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  normalizationSelectionTarget === "pre"
                    ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                    : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <PencilIcon className="h-4 w-4" />
                  <span>
                    {normalizationSelectionTarget === "pre"
                      ? "Draw on the plot to select the pre edge region"
                      : "Draw on the plot to select the post edge region"}
                  </span>
                </div>
              </div>
            )}

            {/* Peak Drag Toast - only show when manual peak mode is active */}
            {dataset.peaks.length > 0 && isManualPeakMode && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <PencilIcon className="h-4 w-4" />
                  <span>
                    You can drag existing peaks on the plot to adjust.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sample Information */}
      <div>
        <SampleInformationSection
          preparationDate={dataset.sampleInfo.preparationDate}
          setPreparationDate={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, preparationDate: value },
            })
          }
          processMethod={dataset.sampleInfo.processMethod}
          setProcessMethod={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, processMethod: value },
            })
          }
          substrate={dataset.sampleInfo.substrate}
          setSubstrate={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, substrate: value },
            })
          }
          solvent={dataset.sampleInfo.solvent}
          setSolvent={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, solvent: value },
            })
          }
          thickness={dataset.sampleInfo.thickness}
          setThickness={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, thickness: value },
            })
          }
          molecularWeight={dataset.sampleInfo.molecularWeight}
          setMolecularWeight={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, molecularWeight: value },
            })
          }
          selectedVendorId={dataset.sampleInfo.vendorId}
          setSelectedVendorId={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, vendorId: value },
            })
          }
          newVendorName={dataset.sampleInfo.newVendorName}
          setNewVendorName={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, newVendorName: value },
            })
          }
          newVendorUrl={dataset.sampleInfo.newVendorUrl}
          setNewVendorUrl={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, newVendorUrl: value },
            })
          }
          vendors={vendors}
          isLoadingVendors={isLoadingVendors}
        />
      </div>

      {/* Modals */}
      <AddMoleculeModal
        isOpen={showAddMoleculeModal}
        onClose={() => setShowAddMoleculeModal(false)}
        onMoleculeCreated={handleMoleculeCreated}
      />
      <AddFacilityModal
        isOpen={showAddFacilityModal}
        onClose={() => setShowAddFacilityModal(false)}
        onFacilityCreated={handleFacilityCreated}
      />
    </div>
  );
}
