"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Papa from "papaparse";
import { DefaultButton as Button } from "~/app/components/Button";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import { CSVUpload } from "~/app/components/CSVUpload";
import { DataPreviewTable } from "~/app/components/DataPreviewTable";
import { FormField } from "~/app/components/FormField";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { trpc } from "~/trpc/client";
import { ProcessMethod } from "@prisma/client";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const EXPERIMENT_TYPE_OPTIONS = [
  { value: "TOTAL_ELECTRON_YIELD", label: "Total Electron Yield" },
  { value: "PARTIAL_ELECTRON_YIELD", label: "Partial Electron Yield" },
  { value: "FLUORESCENT_YIELD", label: "Fluorescent Yield" },
  { value: "TRANSMISSION", label: "Transmission" },
] as const;

const PROCESS_METHOD_OPTIONS = [
  { value: "DRY", label: "Dry" },
  { value: "SOLVENT", label: "Solvent" },
] as const;

type ExperimentTypeOption = (typeof EXPERIMENT_TYPE_OPTIONS)[number]["value"];

interface MoleculeSearchResult {
  id: string;
  iupacName: string;
  commonName: string;
  synonyms: string[];
  inchi: string;
  smiles: string;
  chemicalFormula: string;
  casNumber: string | null;
  pubChemCid: string | null;
  imageUrl?: string;
}

interface GeometryDataItem {
  theta: number;
  phi: number;
}

interface SpectrumPoint {
  energy: number;
  absorption: number;
  theta?: number;
  phi?: number;
}

interface CSVColumnMappings {
  energy: string;
  absorption: string;
  theta?: string;
  phi?: string;
}

interface ExperimentConfig {
  id: string; // Unique ID for this experiment config
  instrumentId: string;
  edgeId: string;
  experimentType: ExperimentTypeOption;
  measurementDate: string;
  calibrationId: string;
  referenceStandard: string;
  isStandard: boolean;
  geometryMode: "fixed" | "csv";
  fixedTheta: string;
  fixedPhi: string;
  geometryData: GeometryDataItem[];
  geometryFile: File | null;
  geometryError: string | null;
  spectrumPoints: SpectrumPoint[];
  spectrumFile: File | null;
  spectrumError: string | null;
  csvColumns: string[];
  csvRawData: Record<string, unknown>[];
  csvColumnMappings: CSVColumnMappings;
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

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

// Check if string looks like a CAS number (XXX-XX-X pattern)
const isCASNumber = (str: string): boolean => {
  return /^\d{2,7}-\d{2}-\d$/.test(str.trim());
};

const createEmptyExperiment = (): ExperimentConfig => ({
  id: crypto.randomUUID(),
  instrumentId: "",
  edgeId: "",
  experimentType: "TOTAL_ELECTRON_YIELD",
  measurementDate: "",
  calibrationId: "",
  referenceStandard: "",
  isStandard: false,
  geometryMode: "fixed",
  fixedTheta: "",
  fixedPhi: "",
  geometryData: [],
  geometryFile: null,
  geometryError: null,
  spectrumPoints: [],
  spectrumFile: null,
  spectrumError: null,
  csvColumns: [],
  csvRawData: [],
  csvColumnMappings: { energy: "", absorption: "" },
});

export default function NEXAFSContributePage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const utils = trpc.useUtils();

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
  const [moleculeSearchTerm, setMoleculeSearchTerm] = useState("");
  const [moleculeSearchResult, setMoleculeSearchResult] =
    useState<MoleculeSearchResult | null>(null);
  const [moleculeSearchError, setMoleculeSearchError] = useState<string | null>(
    null,
  );
  const [selectedMolecule, setSelectedMolecule] =
    useState<MoleculeSearchResult | null>(null);
  const [selectedPreferredName, setSelectedPreferredName] =
    useState<string>("");
  const [searchService, setSearchService] = useState<string>("");

  const moleculeSearchQuery = trpc.molecules.search.useQuery(
    { query: moleculeSearchTerm },
    { enabled: false, retry: false },
  );

  const handleSearchMolecule = async () => {
    if (!moleculeSearchTerm.trim()) {
      setMoleculeSearchError("Enter a molecule name, synonym, or CAS number.");
      return;
    }

    setMoleculeSearchError(null);
    setSearchService("");
    const searchTerm = moleculeSearchTerm.trim();

    // Check if search term looks like CAS number
    if (isCASNumber(searchTerm)) {
      try {
        setSearchService("CAS");
        const casResult = await utils.external.searchCas.fetch({
          casNumber: searchTerm,
        });

        if (casResult.ok && casResult.data?.casRegistryNumber) {
          // Use CAS data to improve PubChem search
          const moleculeName = casResult.data.moleculeName || searchTerm;
          const casRN = casResult.data.casRegistryNumber;

          try {
            setSearchService("PubChem (via CAS)");
            const pubchemResult = await utils.external.searchPubchem.fetch({
              query: moleculeName,
              type: "name",
            });

            if (pubchemResult.ok && pubchemResult.data) {
              const result = pubchemResult.data;
              const allSynonyms = Array.isArray(result.synonyms)
                ? result.synonyms
                : [];

              const moleculeResult: MoleculeSearchResult = {
                id: "", // Will be set if found in database
                iupacName: result.iupacName || moleculeName,
                commonName: result.commonName || moleculeName,
                synonyms: allSynonyms,
                inchi: result.inchi || "",
                smiles: result.smiles || "",
                chemicalFormula: result.chemicalFormula || "",
                casNumber: casRN,
                pubChemCid: result.pubChemCid || null,
              };

              // Try database search with CAS number
              try {
                const dbResult = await utils.molecules.search.fetch({
                  query: casRN,
                });
                if (dbResult.ok && dbResult.data) {
                  moleculeResult.id = dbResult.data.id;
                  moleculeResult.iupacName = dbResult.data.iupacName;
                  moleculeResult.commonName = dbResult.data.commonName;
                  moleculeResult.synonyms = dbResult.data.synonyms;
                  setSearchService("Database");
                }
              } catch {
                // Database search failed, use PubChem data
              }

              setMoleculeSearchResult(moleculeResult);
              setSelectedPreferredName(moleculeResult.commonName);
              return;
            }
          } catch (pubchemError) {
            // PubChem search failed, try database
          }
        }
      } catch (casError) {
        // CAS search failed, continue to other methods
      }
    }

    // Try database search first
    try {
      setSearchService("Database");
      const dbResult = await utils.molecules.search.fetch({
        query: searchTerm,
      });

      if (dbResult.ok && dbResult.data) {
        const result = dbResult.data;
        setMoleculeSearchResult(result as MoleculeSearchResult);
        setSelectedPreferredName(result.commonName);
        return;
      }
    } catch (dbError) {
      // Database search failed, try PubChem
    }

    // Try PubChem search
    try {
      setSearchService("PubChem");
      const pubchemResult = await utils.external.searchPubchem.fetch({
        query: searchTerm,
        type: /^\d+$/.test(searchTerm) ? "cid" : "name",
      });

      if (pubchemResult.ok && pubchemResult.data) {
        const result = pubchemResult.data;
        const allSynonyms = Array.isArray(result.synonyms)
          ? result.synonyms
          : [];

        const moleculeResult: MoleculeSearchResult = {
          id: "",
          iupacName: result.iupacName || searchTerm,
          commonName: result.commonName || searchTerm,
          synonyms: allSynonyms,
          inchi: result.inchi || "",
          smiles: result.smiles || "",
          chemicalFormula: result.chemicalFormula || "",
          casNumber: result.casNumber || null,
          pubChemCid: result.pubChemCid || null,
        };

        setMoleculeSearchResult(moleculeResult);
        setSelectedPreferredName(moleculeResult.commonName);
        return;
      }
    } catch (pubchemError) {
      setMoleculeSearchError(
        "Molecule not found in database, PubChem, or CAS. Please try a different search term.",
      );
    }
  };

  // Vendors, instruments, edges, calibration methods
  const { data: vendorsData, isLoading: isLoadingVendors } =
    trpc.vendors.list.useQuery({ limit: 100 });
  const { data: instrumentsData, isLoading: isLoadingInstruments } =
    trpc.instruments.list.useQuery({ limit: 100 });
  const { data: edgesData, isLoading: isLoadingEdges } =
    trpc.experiments.listEdges.useQuery();
  const { data: calibrationMethodsData, isLoading: isLoadingCalibrations } =
    trpc.experiments.listCalibrationMethods.useQuery();

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

  // Sample metadata
  const [sampleIdentifier, setSampleIdentifier] = useState("");
  const [processMethod, setProcessMethod] = useState<ProcessMethod | "">("");
  const [substrate, setSubstrate] = useState("");
  const [solvent, setSolvent] = useState("");
  const [thickness, setThickness] = useState<number | "">("");
  const [molecularWeight, setMolecularWeight] = useState<number | "">("");
  const [preparationDate, setPreparationDate] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string | "">("");
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorUrl, setNewVendorUrl] = useState("");

  // Experiments array - each experiment has its own configuration
  const [experiments, setExperiments] = useState<ExperimentConfig[]>([
    createEmptyExperiment(),
  ]);

  const [submitStatus, setSubmitStatus] = useState<
    { type: "success" | "error"; message: string } | undefined
  >(undefined);

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

  const handleGeometryFile = async (file: File, experimentId: string) => {
    const experiment = experiments.find((exp) => exp.id === experimentId);
    if (!experiment) return;

    updateExperiment(experimentId, {
      geometryError: null,
      geometryFile: file,
    });

    try {
      const parsed = await parseCSVFile(file);
      const columns = parsed.meta.fields || [];

      // Try to auto-detect theta and phi columns
      const thetaCol = columns.find((col) =>
        col.toLowerCase().includes("theta"),
      );
      const phiCol = columns.find((col) => col.toLowerCase().includes("phi"));

      const cleanedRows = parsed.data
        .map((row) => {
          const thetaValue = thetaCol
            ? toNumber(row[thetaCol])
            : toNumber(row.theta);
          const phiValue = phiCol ? toNumber(row[phiCol]) : toNumber(row.phi);
          return {
            theta: thetaValue,
            phi: phiValue,
          };
        })
        .filter(
          (row) => Number.isFinite(row.theta) && Number.isFinite(row.phi),
        );

      if (cleanedRows.length === 0) {
        updateExperiment(experimentId, {
          geometryData: [],
          geometryError: "No valid theta/phi values found in geometry CSV.",
        });
        return;
      }

      updateExperiment(experimentId, {
        geometryData: cleanedRows as GeometryDataItem[],
      });
    } catch (error) {
      console.error("Failed to parse geometry CSV", error);
      updateExperiment(experimentId, {
        geometryError:
          error instanceof Error
            ? error.message
            : "Failed to parse geometry CSV file.",
        geometryData: [],
      });
    }
  };

  const handleSpectrumFile = async (file: File, experimentId: string) => {
    const experiment = experiments.find((exp) => exp.id === experimentId);
    if (!experiment) return;

    updateExperiment(experimentId, {
      spectrumError: null,
      spectrumFile: file,
      spectrumPoints: [],
      csvColumnMappings: { energy: "", absorption: "" },
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
    experiments.forEach((experiment) => {
      if (
        experiment.csvRawData.length > 0 &&
        experiment.csvColumnMappings.energy &&
        experiment.csvColumnMappings.absorption
      ) {
        const mappedPoints: SpectrumPoint[] = experiment.csvRawData
          .map((row) => {
            const energy = toNumber(row[experiment.csvColumnMappings.energy]);
            const absorption = toNumber(
              row[experiment.csvColumnMappings.absorption],
            );
            const theta = experiment.csvColumnMappings.theta
              ? toNumber(row[experiment.csvColumnMappings.theta])
              : undefined;
            const phi = experiment.csvColumnMappings.phi
              ? toNumber(row[experiment.csvColumnMappings.phi])
              : undefined;

            return {
              energy,
              absorption,
              theta: Number.isFinite(theta) ? theta : undefined,
              phi: Number.isFinite(phi) ? phi : undefined,
            };
          })
          .filter(
            (point) =>
              Number.isFinite(point.energy) &&
              Number.isFinite(point.absorption),
          );

        // Only update if the mapped points actually changed
        const currentPointsStr = JSON.stringify(experiment.spectrumPoints);
        const newPointsStr = JSON.stringify(mappedPoints);
        if (currentPointsStr !== newPointsStr) {
          updateExperiment(experiment.id, {
            spectrumPoints: mappedPoints,
            spectrumError:
              mappedPoints.length === 0
                ? "No valid data points found with the selected column mappings."
                : null,
          });
        }
      } else if (experiment.csvRawData.length === 0) {
        // Clear spectrum points if CSV data is cleared
        if (experiment.spectrumPoints.length > 0) {
          updateExperiment(experiment.id, {
            spectrumPoints: [],
            spectrumError: null,
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    experiments
      .map(
        (e) =>
          `${e.id}:${e.csvRawData.length}:${e.csvColumnMappings.energy}:${e.csvColumnMappings.absorption}:${e.csvColumnMappings.theta}:${e.csvColumnMappings.phi}`,
      )
      .join("|"),
  ]);

  const clearForm = () => {
    setMoleculeSearchTerm("");
    setMoleculeSearchResult(null);
    setSelectedMolecule(null);
    setSelectedPreferredName("");
    setMoleculeSearchError(null);
    setSearchService("");
    setSampleIdentifier("");
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
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Sign In Required
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            You must be signed in to contribute NEXAFS experiments.
          </p>
          <Link href="/sign-in">
            <Button variant="solid">Sign In</Button>
          </Link>
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

    // Validate all experiments
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

      if (experiment.geometryMode === "fixed") {
        if (!experiment.fixedTheta || !experiment.fixedPhi) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: Provide theta and phi values for fixed geometry mode.`,
          });
          return;
        }
      } else {
        if (experiment.geometryData.length === 0) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: Upload a geometry CSV containing theta and phi columns.`,
          });
          return;
        }
        const pointsMissingGeometry = experiment.spectrumPoints.some(
          (point) => point.theta === undefined || point.phi === undefined,
        );
        if (pointsMissingGeometry) {
          setSubmitStatus({
            type: "error",
            message: `Experiment ${experiments.indexOf(experiment) + 1}: Spectrum CSV must include theta and phi columns for each row when using geometry CSV mode.`,
          });
          return;
        }
      }

      if (experiment.spectrumPoints.length === 0) {
        setSubmitStatus({
          type: "error",
          message: `Experiment ${experiments.indexOf(experiment) + 1}: Upload a spectrum CSV with energy and absorption columns.`,
        });
        return;
      }
    }

    const vendorPayload = {
      existingVendorId: selectedVendorId || undefined,
      name: newVendorName.trim() ? newVendorName.trim() : undefined,
      url: newVendorUrl.trim() ? newVendorUrl.trim() : undefined,
    } as const;

    try {
      // Generate a single identifier for all experiments if not provided
      // This ensures all experiments are linked to the same sample
      let sharedIdentifier = sampleIdentifier.trim();
      if (!sharedIdentifier) {
        // Generate a unique identifier that will be used for all experiments
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        sharedIdentifier = `SAMPLE-${timestamp}-${random}`;
      }

      // Submit each experiment separately - they will all use the same sample
      for (const experiment of experiments) {
        await createNexafsMutation.mutateAsync({
          sample: {
            moleculeId: selectedMolecule.id,
            identifier: sharedIdentifier,
            processMethod: processMethod
              ? (processMethod as ProcessMethod)
              : undefined,
            substrate: substrate.trim() || undefined,
            solvent: solvent.trim() || undefined,
            thickness:
              typeof thickness === "number" && !Number.isNaN(thickness)
                ? thickness
                : undefined,
            molecularWeight:
              typeof molecularWeight === "number" &&
              !Number.isNaN(molecularWeight)
                ? molecularWeight
                : undefined,
            preparationDate: preparationDate
              ? new Date(preparationDate).toISOString()
              : undefined,
            vendor: vendorPayload,
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
          geometry:
            experiment.geometryMode === "fixed"
              ? {
                  mode: "fixed" as const,
                  fixed: {
                    theta: parseFloat(experiment.fixedTheta),
                    phi: parseFloat(experiment.fixedPhi),
                  },
                }
              : {
                  mode: "csv" as const,
                  csvGeometries: experiment.geometryData,
                },
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

  const allMoleculeNames = useMemo(() => {
    if (!moleculeSearchResult) return [];
    const names = [
      moleculeSearchResult.commonName,
      moleculeSearchResult.iupacName,
      ...moleculeSearchResult.synonyms,
    ].filter((name, index, arr) => name && arr.indexOf(name) === index);
    return names;
  }, [moleculeSearchResult]);

  return (
    <>
      <ContributionAgreementModal
        isOpen={showAgreementModal}
        onClose={() => {
          /* non-dismissible */
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
            onChange={(e) => setNewEdgeTargetAtom(e.target.value)}
            required
            placeholder="e.g., C, N, O"
            tooltip="The target atom for the absorption edge (e.g., C for carbon K-edge)"
          />
          <FormField
            label="Core State"
            type="text"
            name="coreState"
            value={newEdgeCoreState}
            onChange={(e) => setNewEdgeCoreState(e.target.value)}
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
            onChange={(e) => setNewCalibrationName(e.target.value)}
            required
            placeholder="e.g., Carbon K-edge calibration"
            tooltip="The name of the calibration method"
          />
          <FormField
            label="Description"
            type="textarea"
            name="calibrationDescription"
            value={newCalibrationDescription}
            onChange={(e) => setNewCalibrationDescription(e.target.value)}
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
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                1. Select Molecule
              </h2>

              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <div>
                  <label
                    htmlFor="molecule-search"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Search Molecule
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id="molecule-search"
                        value={moleculeSearchTerm}
                        onChange={(event) =>
                          setMoleculeSearchTerm(event.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearchMolecule();
                          }
                        }}
                        placeholder="Search by name, synonym, CAS, or PubChem CID"
                        className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                    <Button
                      type="button"
                      variant="bordered"
                      onClick={handleSearchMolecule}
                      disabled={moleculeSearchQuery.isFetching}
                    >
                      {moleculeSearchQuery.isFetching
                        ? "Searching..."
                        : "Search"}
                    </Button>
                  </div>
                  {searchService && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Searching via: {searchService}
                    </p>
                  )}
                  {moleculeSearchError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {moleculeSearchError}
                    </p>
                  )}
                </div>
              </div>

              {moleculeSearchResult && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {moleculeSearchResult.commonName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          IUPAC: {moleculeSearchResult.iupacName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Formula:{" "}
                          {moleculeSearchResult.chemicalFormula || "N/A"}
                        </p>
                        {moleculeSearchResult.casNumber && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            CAS: {moleculeSearchResult.casNumber}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="bordered"
                        onClick={() => {
                          setSelectedMolecule(moleculeSearchResult);
                          setSubmitStatus(undefined);
                        }}
                      >
                        Use this molecule
                      </Button>
                    </div>
                  </div>

                  {allMoleculeNames.length > 1 && (
                    <FormField
                      label="Preferred Molecule Name"
                      type="select"
                      name="preferredName"
                      value={selectedPreferredName}
                      onChange={(e) => setSelectedPreferredName(e.target.value)}
                      tooltip="Select which name/synonym should appear on the molecule banner"
                      options={allMoleculeNames.map((name) => ({
                        value: name,
                        label: name,
                      }))}
                    />
                  )}
                </div>
              )}

              {selectedMolecule && (
                <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-center gap-3 text-green-800 dark:text-green-300">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="font-medium">
                      Selected molecule:{" "}
                      {selectedPreferredName || selectedMolecule.commonName}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-green-700 dark:text-green-200">
                    IUPAC: {selectedMolecule.iupacName}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                2. Sample Information
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Preparation Date"
                  type="date"
                  name="preparationDate"
                  value={preparationDate}
                  onChange={(e) => setPreparationDate(e.target.value)}
                  tooltip="The date when the sample was prepared"
                />
                <FormField
                  label="Process Method"
                  type="select"
                  name="processMethod"
                  value={processMethod}
                  onChange={(e) =>
                    setProcessMethod(e.target.value as ProcessMethod | "")
                  }
                  tooltip="The method used to process the sample: DRY (dry processing) or SOLVENT (solvent-based processing)"
                  options={[
                    { value: "", label: "Select process method (optional)" },
                    ...PROCESS_METHOD_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    })),
                  ]}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  label="Substrate"
                  type="text"
                  name="substrate"
                  value={substrate}
                  onChange={(e) => setSubstrate(e.target.value)}
                  placeholder="e.g., Si wafer, glass"
                  tooltip="The substrate material on which the sample was deposited or prepared"
                />
                <FormField
                  label="Solvent"
                  type="text"
                  name="solvent"
                  value={solvent}
                  onChange={(e) => setSolvent(e.target.value)}
                  placeholder="e.g., chloroform, toluene"
                  tooltip="The solvent used during sample preparation (if applicable)"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  label="Thickness (nm)"
                  type="number"
                  name="thickness"
                  value={thickness}
                  onChange={(e) =>
                    setThickness(
                      e.target.value === ""
                        ? ""
                        : parseFloat(e.target.value) || "",
                    )
                  }
                  placeholder="e.g., 50"
                  tooltip="The thickness of the sample in nanometers"
                  min={0}
                  step={0.1}
                />
                <FormField
                  label="Molecular Weight (g/mol)"
                  type="number"
                  name="molecularWeight"
                  value={molecularWeight}
                  onChange={(e) =>
                    setMolecularWeight(
                      e.target.value === ""
                        ? ""
                        : parseFloat(e.target.value) || "",
                    )
                  }
                  placeholder="e.g., 1000.5"
                  tooltip="The molecular weight of the molecule in grams per mole"
                  min={0}
                  step={0.01}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  label="Select Existing Vendor"
                  type="select"
                  name="vendor"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  tooltip="Select a vendor from the existing list"
                  options={[
                    {
                      value: "",
                      label: isLoadingVendors
                        ? "Loading vendors..."
                        : "Select a vendor (optional)",
                    },
                    ...(vendorsData?.vendors.map(
                      (vendor: { id: string; name: string }) => ({
                        value: vendor.id,
                        label: vendor.name,
                      }),
                    ) || []),
                  ]}
                />
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                  <p className="font-medium">Or create a new vendor</p>
                  <div className="mt-3 space-y-2">
                    <input
                      value={newVendorName}
                      onChange={(event) => setNewVendorName(event.target.value)}
                      placeholder="Vendor name"
                      className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <input
                      value={newVendorUrl}
                      onChange={(event) => setNewVendorUrl(event.target.value)}
                      placeholder="Vendor website (optional)"
                      className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Experiments Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  3. Experiments
                </h2>
                <Button
                  type="button"
                  variant="bordered"
                  onClick={addExperiment}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Experiment
                </Button>
              </div>

              {experiments.map((experiment, index) => (
                <div
                  key={experiment.id}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Experiment {index + 1}
                    </h3>
                    {experiments.length > 1 && (
                      <Button
                        type="button"
                        variant="bordered"
                        onClick={() => removeExperiment(experiment.id)}
                        className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Experiment Metadata */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        label="Instrument"
                        type="select"
                        name={`instrument-${experiment.id}`}
                        value={experiment.instrumentId}
                        onChange={(e) =>
                          updateExperiment(experiment.id, {
                            instrumentId: e.target.value,
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
                          ...(instrumentsData?.instruments.map(
                            (instrument: {
                              id: string;
                              name: string;
                              facilities?: { name: string } | null;
                            }) => ({
                              value: instrument.id,
                              label: `${instrument.name}${
                                instrument.facilities
                                  ? ` — ${instrument.facilities.name}`
                                  : ""
                              }`,
                            }),
                          ) || []),
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
                            onClick={() => setShowEdgeDialog(true)}
                            className="text-wsu-crimson flex items-center gap-1 text-xs hover:underline"
                          >
                            <PlusIcon className="h-3 w-3" />
                            Add new
                          </button>
                        </div>
                        <select
                          id={`edge-${experiment.id}`}
                          value={experiment.edgeId}
                          onChange={(event) =>
                            updateExperiment(experiment.id, {
                              edgeId: event.target.value,
                            })
                          }
                          required
                          className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                          <option value="" disabled>
                            {isLoadingEdges
                              ? "Loading edges..."
                              : "Select edge"}
                          </option>
                          {edgesData?.edges.map((edge) => (
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
                        onChange={(e) =>
                          updateExperiment(experiment.id, {
                            experimentType: e.target
                              .value as ExperimentTypeOption,
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
                        onChange={(e) =>
                          updateExperiment(experiment.id, {
                            measurementDate: e.target.value,
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
                            onClick={() => setShowCalibrationDialog(true)}
                            className="text-wsu-crimson flex items-center gap-1 text-xs hover:underline"
                          >
                            <PlusIcon className="h-3 w-3" />
                            Add new
                          </button>
                        </div>
                        <select
                          id={`calibration-method-${experiment.id}`}
                          value={experiment.calibrationId}
                          onChange={(event) =>
                            updateExperiment(experiment.id, {
                              calibrationId: event.target.value,
                            })
                          }
                          className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                          <option value="">
                            {isLoadingCalibrations
                              ? "Loading calibration methods..."
                              : "Select calibration method"}
                          </option>
                          {calibrationMethodsData?.calibrationMethods.map(
                            (method) => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div>
                        <FormField
                          label="Reference Standard (optional)"
                          type="text"
                          name={`referenceStandard-${experiment.id}`}
                          value={experiment.referenceStandard}
                          onChange={(e) =>
                            updateExperiment(experiment.id, {
                              referenceStandard: e.target.value,
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
                              updateExperiment(experiment.id, {
                                isStandard: event.target.checked,
                              })
                            }
                            className="text-wsu-crimson focus:ring-wsu-crimson"
                          />
                          Mark as standard experiment
                        </label>
                      </div>
                    </div>

                    {/* Geometry Configuration */}
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        Geometry Configuration
                      </h4>
                      <div className="mb-4 flex gap-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <input
                            type="radio"
                            value="fixed"
                            checked={experiment.geometryMode === "fixed"}
                            onChange={() =>
                              updateExperiment(experiment.id, {
                                geometryMode: "fixed",
                              })
                            }
                            className="text-wsu-crimson focus:ring-wsu-crimson"
                          />
                          Fixed geometry (single theta / phi)
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <input
                            type="radio"
                            value="csv"
                            checked={experiment.geometryMode === "csv"}
                            onChange={() =>
                              updateExperiment(experiment.id, {
                                geometryMode: "csv",
                              })
                            }
                            className="text-wsu-crimson focus:ring-wsu-crimson"
                          />
                          Geometry from CSV
                        </label>
                      </div>

                      {experiment.geometryMode === "fixed" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            label="Theta (°)"
                            type="number"
                            name={`fixedTheta-${experiment.id}`}
                            value={experiment.fixedTheta}
                            onChange={(e) =>
                              updateExperiment(experiment.id, {
                                fixedTheta: e.target.value,
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
                            onChange={(e) =>
                              updateExperiment(experiment.id, {
                                fixedPhi: e.target.value,
                              })
                            }
                            tooltip="The azimuthal angle phi in degrees"
                            step={0.01}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <CSVUpload
                            label="Geometry CSV"
                            description="Upload a CSV containing theta and phi columns."
                            file={experiment.geometryFile}
                            onFileSelect={(file) =>
                              handleGeometryFile(file, experiment.id)
                            }
                            onRemove={() => {
                              updateExperiment(experiment.id, {
                                geometryFile: null,
                                geometryData: [],
                                geometryError: null,
                              });
                            }}
                            error={experiment.geometryError ?? undefined}
                          />

                          {experiment.geometryData.length > 0 && (
                            <div>
                              <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Geometry Preview (
                                {experiment.geometryData.length} entries)
                              </h3>
                              <DataPreviewTable
                                data={experiment.geometryData.map(
                                  (item, idx) => ({
                                    "#": idx + 1,
                                    theta: item.theta,
                                    phi: item.phi,
                                  }),
                                )}
                                maxRows={10}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Spectrum Data */}
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        Spectrum Data
                      </h4>
                      <CSVUpload
                        label="Spectrum CSV"
                        description="Upload a CSV file with spectral data. You will map the columns to energy, absorption, and optionally theta/phi."
                        file={experiment.spectrumFile}
                        onFileSelect={(file) =>
                          handleSpectrumFile(file, experiment.id)
                        }
                        onRemove={() => {
                          updateExperiment(experiment.id, {
                            spectrumFile: null,
                            spectrumPoints: [],
                            csvColumns: [],
                            csvRawData: [],
                            csvColumnMappings: { energy: "", absorption: "" },
                            spectrumError: null,
                          });
                        }}
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
                              onChange={(e) =>
                                updateExperiment(experiment.id, {
                                  csvColumnMappings: {
                                    ...experiment.csvColumnMappings,
                                    energy: e.target.value,
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
                              onChange={(e) =>
                                updateExperiment(experiment.id, {
                                  csvColumnMappings: {
                                    ...experiment.csvColumnMappings,
                                    absorption: e.target.value,
                                  },
                                })
                              }
                              required
                              tooltip="Select the column containing absorption or intensity values"
                              options={[
                                {
                                  value: "",
                                  label: "Select absorption column",
                                },
                                ...experiment.csvColumns.map((col) => ({
                                  value: col,
                                  label: col,
                                })),
                              ]}
                            />
                          </div>
                          {experiment.geometryMode === "csv" && (
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                label="Theta Column (optional)"
                                type="select"
                                name={`thetaColumn-${experiment.id}`}
                                value={experiment.csvColumnMappings.theta || ""}
                                onChange={(e) =>
                                  updateExperiment(experiment.id, {
                                    csvColumnMappings: {
                                      ...experiment.csvColumnMappings,
                                      theta: e.target.value || undefined,
                                    },
                                  })
                                }
                                tooltip="Select the column containing theta values (required for CSV geometry mode)"
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
                                value={experiment.csvColumnMappings.phi || ""}
                                onChange={(e) =>
                                  updateExperiment(experiment.id, {
                                    csvColumnMappings: {
                                      ...experiment.csvColumnMappings,
                                      phi: e.target.value || undefined,
                                    },
                                  })
                                }
                                tooltip="Select the column containing phi values (required for CSV geometry mode)"
                                options={[
                                  { value: "", label: "No phi column" },
                                  ...experiment.csvColumns.map((col) => ({
                                    value: col,
                                    label: col,
                                  })),
                                ]}
                              />
                            </div>
                          )}
                          {experiment.spectrumPoints.length > 0 && (
                            <div className="mt-4">
                              <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Mapped Data Preview (
                                {experiment.spectrumPoints.length} rows)
                              </h3>
                              <DataPreviewTable
                                data={experiment.spectrumPoints
                                  .slice(0, 20)
                                  .map((point, idx) => ({
                                    "#": idx + 1,
                                    energy: point.energy.toFixed(2),
                                    absorption: point.absorption.toFixed(4),
                                    theta: point.theta?.toFixed(2) ?? "—",
                                    phi: point.phi?.toFixed(2) ?? "—",
                                  }))}
                                maxRows={20}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>

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
    </>
  );
}
