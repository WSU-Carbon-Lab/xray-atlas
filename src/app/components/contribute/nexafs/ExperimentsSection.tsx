"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "~/app/components/Button";
import { CSVUpload } from "~/app/components/CSVUpload";
import { FormField } from "~/app/components/FormField";
import {
  SpectrumPlot,
} from "~/app/components/plots/SpectrumPlot";
import type { SpectrumSelection } from "~/app/components/plots/core/types";
import { AddDatasetButton } from "./AddDatasetButton";
import { SelectionSummary, SpectrumSummary } from "./SpectrumSummary";
import {
  EXPERIMENT_TYPE_OPTIONS,
  type ExperimentConfig,
  type ExperimentTypeOption,
} from "~/app/contribute/nexafs/types";
import { extractGeometryPairs } from "~/app/contribute/nexafs/utils";
import type { BareAtomPoint } from "~/app/contribute/nexafs/types";

type InstrumentOption = {
  id: string;
  name: string;
  facilityName?: string | null;
};

type EdgeOption = {
  id: string;
  targetatom: string;
  corestate: string;
};

type CalibrationOption = {
  id: string;
  name: string;
};

type ExperimentsSectionProps = {
  experiments: ExperimentConfig[];
  instrumentOptions: InstrumentOption[];
  edgeOptions: EdgeOption[];
  calibrationOptions: CalibrationOption[];
  isLoadingInstruments: boolean;
  isLoadingEdges: boolean;
  isLoadingCalibrations: boolean;
  addExperiment: () => void;
  removeExperiment: (experimentId: string) => void;
  updateExperiment: (
    experimentId: string,
    updates: Partial<ExperimentConfig>,
  ) => void;
  handleSpectrumFile: (
    file: File,
    experimentId: string,
    datasetId?: string,
  ) => void;
  clearExperimentSpectrum: (experimentId: string) => void;
  normalizationEnabled: boolean;
  normalizationSelectionTarget: "pre" | "post" | null;
  normalizationSelectionExperimentId: string | null;
  applyNormalizationSelection: (
    experimentId: string,
    selection: SpectrumSelection,
  ) => void;
  onStartNormalizationSelection: (
    experimentId: string,
    target: "pre" | "post",
  ) => void;
  bareAtomPoints: BareAtomPoint[] | null;
  bareAtomLoading: boolean;
  bareAtomError: string | null;
  showBareAtom: boolean;
  onRequestAddEdge: () => void;
  onRequestAddCalibration: () => void;
  onUploadDatasets: (experimentId: string, files: File[]) => void;
  onSelectDataset: (experimentId: string, datasetId: string) => void;
  onRemoveDataset: (experimentId: string, datasetId: string) => void;
  onDatasetDoiChange: (
    experimentId: string,
    datasetId: string,
    doi: string,
  ) => void;
};

export function ExperimentsSection({
  experiments,
  instrumentOptions,
  edgeOptions,
  calibrationOptions,
  isLoadingInstruments,
  isLoadingEdges,
  isLoadingCalibrations,
  addExperiment,
  removeExperiment,
  updateExperiment,
  handleSpectrumFile,
  clearExperimentSpectrum,
  normalizationEnabled,
  normalizationSelectionTarget,
  normalizationSelectionExperimentId,
  applyNormalizationSelection,
  onStartNormalizationSelection,
  bareAtomPoints,
  bareAtomLoading,
  bareAtomError,
  showBareAtom,
  onRequestAddEdge,
  onRequestAddCalibration,
  onUploadDatasets,
  onSelectDataset,
  onRemoveDataset,
  onDatasetDoiChange,
}: ExperimentsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            3. Experiments
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Each experiment bundles instrument metadata, geometry, and spectral
            data.
          </p>
        </div>
        <AddDatasetButton onAdd={addExperiment} />
      </div>

      {experiments.map((experiment, index) => (
        <ExperimentCard
          key={experiment.id}
          experiment={experiment}
          index={index}
          canRemove={experiments.length > 1}
          instrumentOptions={instrumentOptions}
          edgeOptions={edgeOptions}
          calibrationOptions={calibrationOptions}
          isLoadingInstruments={isLoadingInstruments}
          isLoadingEdges={isLoadingEdges}
          isLoadingCalibrations={isLoadingCalibrations}
          onUpdate={updateExperiment}
          onRemove={removeExperiment}
          handleSpectrumFile={handleSpectrumFile}
          clearExperimentSpectrum={clearExperimentSpectrum}
          normalizationEnabled={normalizationEnabled}
          normalizationSelectionTarget={normalizationSelectionTarget}
          normalizationSelectionExperimentId={
            normalizationSelectionExperimentId
          }
          applyNormalizationSelection={applyNormalizationSelection}
          onStartNormalizationSelection={onStartNormalizationSelection}
          bareAtomPoints={bareAtomPoints}
          bareAtomLoading={bareAtomLoading}
          bareAtomError={bareAtomError}
          showBareAtom={showBareAtom}
          onRequestAddEdge={onRequestAddEdge}
          onRequestAddCalibration={onRequestAddCalibration}
          onUploadDatasets={onUploadDatasets}
          onSelectDataset={onSelectDataset}
          onRemoveDataset={onRemoveDataset}
          onDatasetDoiChange={onDatasetDoiChange}
        />
      ))}
    </section>
  );
}

type ExperimentCardProps = {
  experiment: ExperimentConfig;
  index: number;
  canRemove: boolean;
  instrumentOptions: InstrumentOption[];
  edgeOptions: EdgeOption[];
  calibrationOptions: CalibrationOption[];
  isLoadingInstruments: boolean;
  isLoadingEdges: boolean;
  isLoadingCalibrations: boolean;
  onUpdate: (experimentId: string, updates: Partial<ExperimentConfig>) => void;
  onRemove: (experimentId: string) => void;
  handleSpectrumFile: (
    file: File,
    experimentId: string,
    datasetId?: string,
  ) => void;
  clearExperimentSpectrum: (experimentId: string) => void;
  normalizationEnabled: boolean;
  normalizationSelectionTarget: "pre" | "post" | null;
  applyNormalizationSelection: (
    experimentId: string,
    selection: SpectrumSelection,
  ) => void;
  bareAtomPoints: BareAtomPoint[] | null;
  bareAtomLoading: boolean;
  bareAtomError: string | null;
  showBareAtom: boolean;
  onRequestAddEdge: () => void;
  onRequestAddCalibration: () => void;
  onUploadDatasets: (experimentId: string, files: File[]) => void;
  onSelectDataset: (experimentId: string, datasetId: string) => void;
  onRemoveDataset: (experimentId: string, datasetId: string) => void;
  onDatasetDoiChange: (
    experimentId: string,
    datasetId: string,
    doi: string,
  ) => void;
  normalizationSelectionExperimentId: string | null;
  onStartNormalizationSelection: (
    experimentId: string,
    target: "pre" | "post",
  ) => void;
};

function ExperimentCard({
  experiment,
  index,
  canRemove,
  instrumentOptions,
  edgeOptions,
  calibrationOptions,
  isLoadingInstruments,
  isLoadingEdges,
  isLoadingCalibrations,
  onUpdate,
  onRemove,
  handleSpectrumFile,
  clearExperimentSpectrum,
  normalizationEnabled,
  normalizationSelectionTarget,
  applyNormalizationSelection,
  bareAtomPoints,
  bareAtomLoading,
  bareAtomError,
  showBareAtom,
  onRequestAddEdge,
  onRequestAddCalibration,
  onUploadDatasets,
  onSelectDataset,
  onRemoveDataset,
  onDatasetDoiChange,
  normalizationSelectionExperimentId,
  onStartNormalizationSelection,
}: ExperimentCardProps) {
  const displayPoints =
    normalizationEnabled && experiment.normalizedPoints
      ? experiment.normalizedPoints
      : experiment.spectrumPoints;

  const referenceCurves =
    showBareAtom && bareAtomPoints
      ? [
          {
            label: "Bare Atom Absorption (ρ = 1 g/cm³)",
            color: "#111827",
            points: bareAtomPoints.map((point) => ({
              energy: point.energy,
              absorption: point.absorption,
            })),
          },
        ]
      : [];

  const activeDataset =
    experiment.datasets.find(
      (dataset) => dataset.id === experiment.activeDatasetId,
    ) ?? experiment.datasets[experiment.datasets.length - 1];

  const isSelectingNormalizationRegion =
    normalizationSelectionTarget !== null &&
    normalizationSelectionExperimentId === experiment.id;

  const displayAbsorptionStats = (() => {
    if (
      normalizationEnabled &&
      experiment.normalization &&
      experiment.spectrumStats?.absorption
    ) {
      const rawStats = experiment.spectrumStats.absorption;
      const transformed = [rawStats.min, rawStats.max]
        .filter((value): value is number => value !== null)
        .map(
          (value) =>
            experiment.normalization!.scale * value +
            experiment.normalization!.offset,
        );

      if (transformed.length === 2) {
        const [first, second] = transformed as [number, number];
        const minValue = Math.min(first, second);
        const maxValue = Math.max(first, second);
        return {
          min: minValue,
          max: maxValue,
        };
      }
    }

    if (experiment.spectrumStats?.absorption) {
      return {
        min: experiment.spectrumStats.absorption.min,
        max: experiment.spectrumStats.absorption.max,
      };
    }

    return undefined;
  })();

  const geometryPairs = extractGeometryPairs(experiment.spectrumPoints);
  const usingCsvGeometry = geometryPairs.length > 0;
  const thetaColumn = experiment.csvColumnMappings.theta;
  const phiColumn = experiment.csvColumnMappings.phi;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Experiment {index + 1}
        </h3>
        {canRemove && (
          <Button
            type="button"
            variant="bordered"
            onClick={() => onRemove(experiment.id)}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <TrashIcon className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Datasets
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upload CSV files below to add new datasets
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {experiment.datasets.length === 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                No datasets uploaded yet.
              </span>
            )}
            {experiment.datasets.map((dataset) => (
              <div
                key={dataset.id}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  dataset.id === experiment.activeDatasetId
                    ? "border-accent bg-accent/10 text-accent dark:text-accent-light"
                    : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectDataset(experiment.id, dataset.id)}
                  className="font-medium"
                >
                  {dataset.label}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveDataset(experiment.id, dataset.id)}
                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  aria-label={`Remove dataset ${dataset.label}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {activeDataset && (
            <FormField
              label="Dataset DOI (optional)"
              type="text"
              name={`dataset-doi-${activeDataset.id}`}
              value={activeDataset.doi}
              onChange={(value) =>
                onDatasetDoiChange(
                  experiment.id,
                  activeDataset.id,
                  (value as string) ?? "",
                )
              }
              placeholder="e.g., https://doi.org/10.1234/example"
              tooltip="Provide a DOI that references the uploaded dataset."
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Instrument"
            type="select"
            name={`instrument-${experiment.id}`}
            value={experiment.instrumentId}
            onChange={(value) =>
              onUpdate(experiment.id, {
                instrumentId: value as string,
              })
            }
            required
            tooltip="Select the instrument used for this experiment"
            options={[
              {
                value: "",
                label: isLoadingInstruments
                  ? "Loading instruments..."
                  : "Select instrument",
              },
              ...instrumentOptions.map((instrument) => ({
                value: instrument.id,
                label: `${instrument.name}${
                  instrument.facilityName ? ` — ${instrument.facilityName}` : ""
                }`,
              })),
            ]}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor={`edge-${experiment.id}`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Absorption Edge
              </label>
              <button
                type="button"
                onClick={onRequestAddEdge}
                className="text-accent dark:text-accent-light flex items-center gap-1 text-xs hover:underline"
              >
                <PlusIcon className="h-3 w-3" />
                Add new
              </button>
            </div>
            <select
              id={`edge-${experiment.id}`}
              value={experiment.edgeId}
              onChange={(event) =>
                onUpdate(experiment.id, {
                  edgeId: event.target.value,
                })
              }
              required
              className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="" disabled>
                {isLoadingEdges ? "Loading edges..." : "Select edge"}
              </option>
              {edgeOptions.map((edge) => (
                <option key={edge.id} value={edge.id}>
                  {edge.targetatom} — {edge.corestate}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Experiment Type"
            type="select"
            name={`experimentType-${experiment.id}`}
            value={experiment.experimentType}
            onChange={(value) =>
              onUpdate(experiment.id, {
                experimentType: value as ExperimentTypeOption,
              })
            }
            tooltip="The type of NEXAFS experiment performed"
            options={EXPERIMENT_TYPE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
          <FormField
            label="Measurement Date"
            type="date"
            name={`measurementDate-${experiment.id}`}
            value={experiment.measurementDate}
            onChange={(value) =>
              onUpdate(experiment.id, {
                measurementDate: value as string,
              })
            }
            tooltip="The date when the experiment was performed"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor={`calibration-method-${experiment.id}`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Calibration Method (optional)
              </label>
              <button
                type="button"
                onClick={onRequestAddCalibration}
                className="text-accent dark:text-accent-light flex items-center gap-1 text-xs hover:underline"
              >
                <PlusIcon className="h-3 w-3" />
                Add new
              </button>
            </div>
            <select
              id={`calibration-method-${experiment.id}`}
              value={experiment.calibrationId}
              onChange={(event) =>
                onUpdate(experiment.id, {
                  calibrationId: event.target.value,
                })
              }
              className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">
                {isLoadingCalibrations
                  ? "Loading calibration methods..."
                  : "Select calibration method"}
              </option>
              {calibrationOptions.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FormField
              label="Reference Standard (optional)"
              type="text"
              name={`referenceStandard-${experiment.id}`}
              value={experiment.referenceStandard}
              onChange={(value) =>
                onUpdate(experiment.id, {
                  referenceStandard: value as string,
                })
              }
              placeholder="Reference standard used"
              tooltip="The reference standard used for calibration"
            />
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={experiment.isStandard}
                onChange={(event) =>
                  onUpdate(experiment.id, {
                    isStandard: event.target.checked,
                  })
                }
                className="text-accent dark:text-accent-light focus:ring-accent"
              />
              Mark as standard experiment
            </label>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
            Geometry Configuration
          </h4>
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            {usingCsvGeometry ? (
              <>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Using theta/phi data from spectrum columns{" "}
                  {thetaColumn && phiColumn
                    ? `"${thetaColumn}" and "${phiColumn}".`
                    : "."}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {geometryPairs.length} unique orientation
                  {geometryPairs.length === 1 ? "" : "s"} detected from the
                  spectrum CSV.
                </p>
              </>
            ) : (
              <>
                {thetaColumn &&
                  phiColumn &&
                  experiment.spectrumPoints.length > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Theta/phi columns were selected but no usable numeric
                      values were detected. Fixed geometry inputs will be used
                      instead.
                    </p>
                  )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Provide fixed theta and phi angles (degrees). These are
                  required when the spectrum CSV does not include theta/phi
                  columns.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Theta (°)"
                    type="number"
                    name={`fixedTheta-${experiment.id}`}
                    value={experiment.fixedTheta}
                    onChange={(value) =>
                      onUpdate(experiment.id, {
                        fixedTheta: value === "" ? "" : String(value),
                      })
                    }
                    tooltip="The polar angle theta in degrees"
                    step={0.01}
                  />
                  <FormField
                    label="Phi (°)"
                    type="number"
                    name={`fixedPhi-${experiment.id}`}
                    value={experiment.fixedPhi}
                    onChange={(value) =>
                      onUpdate(experiment.id, {
                        fixedPhi: value === "" ? "" : String(value),
                      })
                    }
                    tooltip="The azimuthal angle phi in degrees"
                    step={0.01}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
            Spectrum Data
          </h4>
          <CSVUpload
            label="Spectrum CSV"
            description="Upload one or more CSV files with spectral data. The active dataset will appear in the chart below."
            acceptedFileTypes=".csv"
            file={experiment.spectrumFile}
            multiple
            onFilesSelect={(files) => onUploadDatasets(experiment.id, files)}
            onFileSelect={(file) =>
              handleSpectrumFile(
                file,
                experiment.id,
                experiment.activeDatasetId ?? undefined,
              )
            }
            onRemove={() => clearExperimentSpectrum(experiment.id)}
            error={experiment.spectrumError ?? undefined}
          />

          {experiment.csvColumns.length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Map CSV Columns
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Energy Column"
                  type="select"
                  name={`energyColumn-${experiment.id}`}
                  value={experiment.csvColumnMappings.energy}
                  onChange={(value) =>
                    onUpdate(experiment.id, {
                      csvColumnMappings: {
                        ...experiment.csvColumnMappings,
                        energy: value as string,
                      },
                    })
                  }
                  required
                  tooltip="Select the column containing energy values (in eV)"
                  options={[
                    { value: "", label: "Select energy column" },
                    ...experiment.csvColumns.map((col) => ({
                      value: col,
                      label: col,
                    })),
                  ]}
                />
                <FormField
                  label="Absorption/Intensity Column"
                  type="select"
                  name={`absorptionColumn-${experiment.id}`}
                  value={experiment.csvColumnMappings.absorption}
                  onChange={(value) =>
                    onUpdate(experiment.id, {
                      csvColumnMappings: {
                        ...experiment.csvColumnMappings,
                        absorption: value as string,
                      },
                    })
                  }
                  required
                  tooltip="Select the column containing absorption or intensity values"
                  options={[
                    { value: "", label: "Select absorption column" },
                    ...experiment.csvColumns.map((col) => ({
                      value: col,
                      label: col,
                    })),
                  ]}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Theta Column (optional)"
                  type="select"
                  name={`thetaColumn-${experiment.id}`}
                  value={experiment.csvColumnMappings.theta ?? ""}
                  onChange={(value) =>
                    onUpdate(experiment.id, {
                      csvColumnMappings: {
                        ...experiment.csvColumnMappings,
                        theta:
                          (value as string) === ""
                            ? undefined
                            : (value as string),
                      },
                    })
                  }
                  tooltip="Select the column containing theta values. Selecting both theta and phi enables automatic geometry detection."
                  options={[
                    { value: "", label: "No theta column" },
                    ...experiment.csvColumns.map((col) => ({
                      value: col,
                      label: col,
                    })),
                  ]}
                />
                <FormField
                  label="Phi Column (optional)"
                  type="select"
                  name={`phiColumn-${experiment.id}`}
                  value={experiment.csvColumnMappings.phi ?? ""}
                  onChange={(value) =>
                    onUpdate(experiment.id, {
                      csvColumnMappings: {
                        ...experiment.csvColumnMappings,
                        phi:
                          (value as string) === ""
                            ? undefined
                            : (value as string),
                      },
                    })
                  }
                  tooltip="Select the column containing phi values. Selecting both theta and phi enables automatic geometry detection."
                  options={[
                    { value: "", label: "No phi column" },
                    ...experiment.csvColumns.map((col) => ({
                      value: col,
                      label: col,
                    })),
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {experiment.spectrumStats && (
          <SpectrumSummary stats={experiment.spectrumStats} />
        )}

        <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Normalization ranges
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="bordered"
                className="text-xs"
                onClick={() =>
                  onStartNormalizationSelection(experiment.id, "pre")
                }
              >
                Select Pre-edge
              </Button>
              <Button
                type="button"
                variant="bordered"
                className="text-xs"
                onClick={() =>
                  onStartNormalizationSelection(experiment.id, "post")
                }
              >
                Select Post-edge
              </Button>
            </div>
          </div>
          {isSelectingNormalizationRegion && normalizationSelectionTarget && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Drag on the chart to highlight the{" "}
              {normalizationSelectionTarget === "pre"
                ? "pre-edge"
                : "post-edge"}{" "}
              range.
            </p>
          )}
          {experiment.normalization?.preRange && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Pre-edge range: {experiment.normalization.preRange[0].toFixed(3)}{" "}
              – {experiment.normalization.preRange[1].toFixed(3)} eV
            </p>
          )}
          {experiment.normalization?.postRange && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Post-edge range:{" "}
              {experiment.normalization.postRange[0].toFixed(3)} –{" "}
              {experiment.normalization.postRange[1].toFixed(3)} eV
            </p>
          )}
        </div>

        {experiment.spectrumPoints.length > 0 && (
          <div className="space-y-3">
            <SpectrumPlot
              points={displayPoints}
              energyStats={experiment.spectrumStats?.energy}
              absorptionStats={displayAbsorptionStats}
              referenceCurves={referenceCurves}
              onSelectionChange={(selection) => {
                onUpdate(experiment.id, {
                  selectionSummary: selection,
                });
                if (selection && normalizationSelectionTarget) {
                  applyNormalizationSelection(experiment.id, selection);
                }
              }}
            />
            {experiment.selectionSummary && (
              <SelectionSummary selection={experiment.selectionSummary} />
            )}
            {bareAtomLoading && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loading bare atom absorption curve…
              </p>
            )}
            {bareAtomError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Unable to load bare atom absorption data: {bareAtomError}
              </p>
            )}
            {normalizationEnabled && experiment.normalization && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-200">
                <p className="font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
                  Normalization Applied
                </p>
                <p>
                  Scale: {experiment.normalization.scale.toPrecision(4)} ·
                  Offset: {experiment.normalization.offset.toPrecision(4)}
                </p>
                {experiment.normalization.preRange && (
                  <p>
                    Pre-edge: {experiment.normalization.preRange[0].toFixed(3)}{" "}
                    – {experiment.normalization.preRange[1].toFixed(3)}
                  </p>
                )}
                {experiment.normalization.postRange && (
                  <p>
                    Post-edge:{" "}
                    {experiment.normalization.postRange[0].toFixed(3)} –{" "}
                    {experiment.normalization.postRange[1].toFixed(3)}
                  </p>
                )}
              </div>
            )}
            {normalizationEnabled && !experiment.normalization && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                Normalization requires at least two distinct data points across
                the chosen pre- and post-edge ranges.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
