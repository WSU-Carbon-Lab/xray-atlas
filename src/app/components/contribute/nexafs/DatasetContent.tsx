"use client";

import { useState, useEffect, useMemo } from "react";
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
    { id: dataset.moleculeId },
    {
      enabled: !!dataset.moleculeId && (!selectedMolecule || selectedMolecule.id !== dataset.moleculeId),
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
    } else if (!selectedMolecule) {
      onDatasetUpdate(dataset.id, { bareAtomPoints: null });
    }
  }, [selectedMolecule?.chemicalFormula, dataset.spectrumPoints, dataset.id, onDatasetUpdate]);

  // Compute normalization when regions are selected
  useEffect(() => {
    if (
      dataset.bareAtomPoints &&
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
  }, [
    dataset.bareAtomPoints,
    dataset.spectrumPoints,
    dataset.normalizationRegions,
    dataset.id,
    onDatasetUpdate,
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
      <div className="flex items-start gap-4">
        <div className="flex-1">
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
        <Button
          type="button"
          variant="bordered"
          onClick={() => setShowAddMoleculeModal(true)}
        >
          Add Molecule
        </Button>
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
            <SpectrumPlot
              points={plotPoints}
              height={400}
              referenceCurves={referenceCurves}
              normalizationRegions={normalizationRegions}
              selectionTarget={normalizationSelectionTarget}
              onSelectionChange={handleNormalizationSelection}
            />
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
            <FormField
              label="Is Standard"
              type="checkbox"
              name="isStandard"
              value={dataset.isStandard}
              onChange={(value) =>
                onDatasetUpdate(dataset.id, { isStandard: value as boolean })
              }
            />
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
