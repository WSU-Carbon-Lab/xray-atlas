"use client";

import { useState, useEffect, useMemo } from "react";
import { skipToken } from "@tanstack/react-query";
import { SpectrumPlot, type SpectrumPoint, type SpectrumSelection } from "~/app/components/plots/SpectrumPlot";
import { MoleculeSelector } from "./MoleculeSelector";
import { AnalysisToolbar } from "./AnalysisToolbar";
import { PeakAnalysis } from "./PeakAnalysis";
import { AddMoleculeModal } from "./AddMoleculeModal";
import { AddFacilityModal } from "./AddFacilityModal";
import { SampleInformationSection } from "./SampleInformationSection";
import { FormField } from "~/app/components/FormField";
import { DefaultButton as Button } from "~/app/components/Button";
import { trpc } from "~/trpc/client";
import { useMoleculeSearch } from "~/app/contribute/nexafs/hooks/useMoleculeSearch";
import type { MoleculeSearchResult } from "~/app/contribute/nexafs/types";
import { calculateBareAtomAbsorption } from "~/app/contribute/nexafs/utils/bareAtomCalculation";
import { computeNormalizationForExperiment } from "~/app/contribute/nexafs/utils";
import type {
  DatasetState,
  BareAtomPoint,
  PeakData,
  SampleInfo,
} from "~/app/contribute/nexafs/types";
import {
  EXPERIMENT_TYPE_OPTIONS,
  type ExperimentTypeOption,
} from "~/app/contribute/nexafs/types";

interface DatasetContentProps {
  dataset: DatasetState;
  onDatasetUpdate: (datasetId: string, updates: Partial<DatasetState>) => void;
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
  instrumentOptions,
  edgeOptions,
  calibrationOptions,
  vendors,
  isLoadingInstruments,
  isLoadingEdges,
  isLoadingCalibrations,
  isLoadingVendors,
}: DatasetContentProps) {
  const [showAddMoleculeModal, setShowAddMoleculeModal] = useState(false);
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [isCalculatingBareAtom, setIsCalculatingBareAtom] = useState(false);
  const [bareAtomError, setBareAtomError] = useState<string | null>(null);
  const [normalizationSelectionTarget, setNormalizationSelectionTarget] = useState<"pre" | "post" | null>(null);

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
    clearSelection,
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
    if (moleculeQuery.data && (!selectedMolecule || selectedMolecule.id !== moleculeQuery.data.id)) {
      const molecule: MoleculeSearchResult = {
        id: moleculeQuery.data.id,
        iupacName: moleculeQuery.data.iupacname,
        commonName: moleculeQuery.data.moleculesynonyms[0]?.synonym ?? moleculeQuery.data.iupacname,
        synonyms: moleculeQuery.data.moleculesynonyms.map((s) => s.synonym),
        inchi: moleculeQuery.data.inchi,
        smiles: moleculeQuery.data.smiles,
        chemicalFormula: moleculeQuery.data.chemicalformula,
        casNumber: moleculeQuery.data.casnumber,
        pubChemCid: moleculeQuery.data.pubchemcid,
        imageUrl: moleculeQuery.data.imageurl ?? undefined,
      };
      selectMolecule(molecule);
    }
  }, [moleculeQuery.data, selectedMolecule, selectMolecule]);

  // Calculate bare atom absorption when molecule is selected
  useEffect(() => {
    if (selectedMolecule?.chemicalFormula && dataset.spectrumPoints.length > 0) {
      // Only recalculate if bare atom points don't exist or formula changed
      const needsRecalculation =
        !dataset.bareAtomPoints ||
        dataset.bareAtomPoints.length === 0 ||
        (selectedMolecule.chemicalFormula !== dataset.bareAtomPoints[0] && dataset.spectrumPoints.length > 0);

      if (needsRecalculation) {
        setIsCalculatingBareAtom(true);
        setBareAtomError(null);

        calculateBareAtomAbsorption(selectedMolecule.chemicalFormula, dataset.spectrumPoints)
          .then((points) => {
            onDatasetUpdate(dataset.id, { bareAtomPoints: points });
            setIsCalculatingBareAtom(false);
          })
          .catch((error) => {
            console.error("Failed to calculate bare atom absorption:", error);
            setBareAtomError(error instanceof Error ? error.message : "Calculation failed");
            setIsCalculatingBareAtom(false);
          });
      }
    } else if (!selectedMolecule && dataset.bareAtomPoints) {
      onDatasetUpdate(dataset.id, { bareAtomPoints: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMolecule?.chemicalFormula, dataset.spectrumPoints.length, dataset.id]);

  // Compute normalization when regions are selected
  useEffect(() => {
    if (
      dataset.bareAtomPoints &&
      dataset.bareAtomPoints.length > 0 &&
      dataset.spectrumPoints.length > 0 &&
      dataset.normalizationRegions.pre &&
      dataset.normalizationRegions.post
    ) {
      const preRange = dataset.normalizationRegions.pre;
      const postRange = dataset.normalizationRegions.post;

      // Count points in each range
      const preCount = dataset.spectrumPoints.filter(
        (p) => p.energy >= preRange[0] && p.energy <= preRange[1],
      ).length;
      const postCount = dataset.spectrumPoints.filter(
        (p) => p.energy >= postRange[0] && p.energy <= postRange[1],
      ).length;

      if (preCount > 0 && postCount > 0) {
        const result = computeNormalizationForExperiment(
          dataset.spectrumPoints,
          dataset.bareAtomPoints,
          preCount,
          postCount,
        );

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

  const handleNormalizationSelection = (selection: SpectrumSelection | null) => {
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
      {/* Molecule Selector */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6">
        {/* Analysis Toolbar */}
        <AnalysisToolbar
          hasMolecule={!!dataset.moleculeId}
          hasData={dataset.spectrumPoints.length > 0}
          hasNormalization={!!dataset.normalization}
          normalizationLocked={dataset.normalizationLocked}
          onPreEdgeSelect={() => setNormalizationSelectionTarget("pre")}
          onPostEdgeSelect={() => setNormalizationSelectionTarget("post")}
          onToggleLock={handleToggleLock}
          onIdentifyPeaks={() => {
            // Peak identification is handled in PeakAnalysis component
          }}
          isSelectingPreEdge={normalizationSelectionTarget === "pre"}
          isSelectingPostEdge={normalizationSelectionTarget === "post"}
        />

        {/* Plot and Analysis */}
        <div className="flex-1 space-y-6">
          {/* Spectrum Plot */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {plotPoints.length > 0 ? (
              <SpectrumPlot
                points={plotPoints}
                height={400}
                referenceCurves={referenceCurves}
                normalizationRegions={normalizationRegions}
                selectionTarget={normalizationSelectionTarget}
                onSelectionChange={handleNormalizationSelection}
              />
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
                  <p className="mt-1 text-sm">Upload a CSV file to see the plot</p>
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

          {/* Peak Analysis */}
          {dataset.spectrumPoints.length > 0 && (
            <PeakAnalysis
              peaks={dataset.peaks}
              spectrumPoints={dataset.spectrumPoints}
              normalizedPoints={dataset.normalizedPoints}
              onPeaksChange={(peaks) => onDatasetUpdate(dataset.id, { peaks })}
            />
          )}
        </div>
      </div>

      {/* Experiment Configuration */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Experiment Configuration
          </h3>
          <div className="space-y-4">
            <FormField
              label="Instrument"
              type="select"
              name="instrumentId"
              value={dataset.instrumentId}
              onChange={(value) =>
                onDatasetUpdate(dataset.id, { instrumentId: value as string })
              }
              required
              options={[
                { value: "", label: "Select instrument..." },
                ...instrumentOptions.map((opt) => ({
                  value: opt.id,
                  label: `${opt.name}${opt.facilityName ? ` (${opt.facilityName})` : ""}`,
                })),
              ]}
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField
                  label="Edge"
                  type="select"
                  name="edgeId"
                  value={dataset.edgeId}
                  onChange={(value) =>
                    onDatasetUpdate(dataset.id, { edgeId: value as string })
                  }
                  required
                  options={[
                    { value: "", label: "Select edge..." },
                    ...edgeOptions.map((opt) => ({
                      value: opt.id,
                      label: `${opt.targetatom} ${opt.corestate}-edge`,
                    })),
                  ]}
                />
              </div>
              <Button
                type="button"
                variant="bordered"
                size="sm"
                onClick={() => {
                  // Open edge creation dialog - this would need to be handled by parent
                }}
              >
                Add
              </Button>
            </div>
            <FormField
              label="Experiment Type"
              type="select"
              name="experimentType"
              value={dataset.experimentType}
              onChange={(value) =>
                onDatasetUpdate(dataset.id, {
                  experimentType: value as ExperimentTypeOption,
                })
              }
              options={EXPERIMENT_TYPE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
            <FormField
              label="Measurement Date"
              type="date"
              name="measurementDate"
              value={dataset.measurementDate}
              onChange={(value) =>
                onDatasetUpdate(dataset.id, { measurementDate: value as string })
              }
            />
            <FormField
              label="Calibration Method"
              type="select"
              name="calibrationId"
              value={dataset.calibrationId}
              onChange={(value) =>
                onDatasetUpdate(dataset.id, { calibrationId: value as string })
              }
              options={[
                { value: "", label: "None" },
                ...calibrationOptions.map((opt) => ({
                  value: opt.id,
                  label: opt.name,
                })),
              ]}
            />
            <FormField
              label="Reference Standard"
              type="text"
              name="referenceStandard"
              value={dataset.referenceStandard}
              onChange={(value) =>
                onDatasetUpdate(dataset.id, { referenceStandard: value as string })
              }
            />
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <input
                id={`is-standard-${dataset.id}`}
                type="checkbox"
                checked={dataset.isStandard}
                onChange={(event) =>
                  onDatasetUpdate(dataset.id, { isStandard: event.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-wsu-crimson focus:ring-wsu-crimson"
              />
              <label
                htmlFor={`is-standard-${dataset.id}`}
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Is Standard
              </label>
            </div>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              variant="bordered"
              size="sm"
              onClick={() => setShowAddFacilityModal(true)}
            >
              Add Facility/Instrument
            </Button>
          </div>
        </div>

        {/* Sample Information */}
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
