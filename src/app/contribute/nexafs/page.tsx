"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Papa from "papaparse";
import { DefaultButton as Button } from "~/app/components/Button";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import { CSVUpload } from "~/app/components/CSVUpload";
import { FormField } from "~/app/components/FormField";
import {
  SpectrumPlot,
  type SpectrumSelection,
  type SpectrumPoint,
} from "~/app/components/plots/SpectrumPlot";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { trpc } from "~/trpc/client";
import { ProcessMethod } from "@prisma/client";
import {
  MoleculeDisplayCompact,
  type DisplayMolecule,
} from "~/app/components/MoleculeDisplay";
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

type GeometryPair = {
  theta: number;
  phi: number;
};

type GeometryMode = "csv" | "fixed";

type GeometryPayload =
  | { mode: "csv"; csvGeometries: GeometryPair[] }
  | { mode: "fixed"; fixedTheta: number; fixedPhi: number };

type ColumnStats = {
  min: number | null;
  max: number | null;
  nanCount: number;
  validCount: number;
};

type SpectrumStats = {
  totalRows: number;
  validPoints: number;
  energy: ColumnStats;
  absorption: ColumnStats;
  theta?: ColumnStats;
  phi?: ColumnStats;
};

const extractGeometryPairs = (points: SpectrumPoint[]): GeometryPair[] =>
  Array.from(
    new Map(
      points
        .filter(
          (
            point,
          ): point is Required<Pick<SpectrumPoint, "theta" | "phi">> &
            SpectrumPoint =>
            typeof point.theta === "number" &&
            Number.isFinite(point.theta) &&
            typeof point.phi === "number" &&
            Number.isFinite(point.phi),
        )
        .map((point) => {
          const key = `${point.theta}:${point.phi}`;
          return [
            key,
            { theta: point.theta!, phi: point.phi! } as GeometryPair,
          ];
        }),
    ).values(),
  );

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
  fixedTheta: string;
  fixedPhi: string;
  spectrumPoints: SpectrumPoint[];
  normalizedPoints: SpectrumPoint[] | null;
  normalization: {
    scale: number;
    offset: number;
    preRange: [number, number] | null;
    postRange: [number, number] | null;
  } | null;
  spectrumFile: File | null;
  spectrumError: string | null;
  csvColumns: string[];
  csvRawData: Record<string, unknown>[];
  csvColumnMappings: CSVColumnMappings;
  spectrumStats: SpectrumStats | null;
  selectionSummary: SpectrumSelection | null;
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

const normalizeMoleculeResult = (
  result: Partial<MoleculeSearchResult>,
): MoleculeSearchResult => ({
  id: result.id ?? "",
  iupacName: result.iupacName ?? "",
  commonName: result.commonName ?? result.iupacName ?? "",
  synonyms: Array.isArray(result.synonyms) ? result.synonyms : [],
  inchi: result.inchi ?? "",
  smiles: result.smiles ?? "",
  chemicalFormula: result.chemicalFormula ?? "",
  casNumber: result.casNumber ?? null,
  pubChemCid: result.pubChemCid ?? null,
  imageUrl: result.imageUrl,
});

const formatStatNumber = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 10000) return value.toFixed(0);
  if (abs >= 1000) return value.toFixed(1);
  if (abs >= 100) return value.toFixed(2);
  if (abs >= 1) return value.toFixed(3);
  return value.toExponential(2);
};

function SpectrumSummary({ stats }: { stats: SpectrumStats }) {
  const columns: Array<{
    label: string;
    unit?: string;
    stats: ColumnStats | undefined;
  }> = [
    { label: "Energy", unit: "eV", stats: stats.energy },
    { label: "Absorption", stats: stats.absorption },
    { label: "Theta", unit: "°", stats: stats.theta },
    { label: "Phi", unit: "°", stats: stats.phi },
  ];

  const visibleColumns = columns.filter((column) => column.stats !== undefined);

  if (visibleColumns.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Dataset Summary
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {stats.validPoints} of {stats.totalRows} rows produced valid spectrum
          points.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900/40 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3 text-left">Column</th>
              <th className="px-5 py-3 text-right">Min</th>
              <th className="px-5 py-3 text-right">Max</th>
              <th className="px-5 py-3 text-right">Valid</th>
              <th className="px-5 py-3 text-right">NaNs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {visibleColumns.map((column) => (
              <tr key={column.label}>
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                  {column.label}
                  {column.unit ? (
                    <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                      ({column.unit})
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
                  {formatStatNumber(column.stats?.min ?? null)}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
                  {formatStatNumber(column.stats?.max ?? null)}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
                  {column.stats?.validCount ?? 0}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
                  {column.stats?.nanCount ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SelectionSummary({ selection }: { selection: SpectrumSelection }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-200">
      <span className="font-semibold">Selection</span>
      <span>
        {selection.pointCount} point{selection.pointCount === 1 ? "" : "s"}
      </span>
      <span className="text-blue-600/70 dark:text-blue-200/80">•</span>
      <span>
        Energy {formatStatNumber(selection.energyMin)} –{" "}
        {formatStatNumber(selection.energyMax)} eV
      </span>
      <span className="text-blue-600/70 dark:text-blue-200/80">•</span>
      <span>
        Intensity {formatStatNumber(selection.absorptionMin)} –{" "}
        {formatStatNumber(selection.absorptionMax)}
      </span>
      {selection.geometryKeys.length > 0 && (
        <span>Geometries: {selection.geometryKeys.length}</span>
      )}
    </div>
  );
}

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
  const [isSearching, setIsSearching] = useState(false);
  const searchRequestIdRef = useRef(0);

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

  const performMoleculeSearch = async (term: string, requestId: number) => {
    const assignResult = (
      result: MoleculeSearchResult,
      serviceLabel: string,
    ) => {
      if (searchRequestIdRef.current !== requestId) {
        return true;
      }
      setSearchService(serviceLabel);
      setMoleculeSearchResult(result);
      setSelectedMolecule(result);
      setSelectedPreferredName(result.commonName);
      setMoleculeSearchError(null);
      setSubmitStatus(undefined);
      return true;
    };

    try {
      // Check if search term looks like CAS number
      if (isCASNumber(term)) {
        try {
          const casResult = await utils.external.searchCas.fetch({
            casNumber: term,
          });

          if (casResult.ok && casResult.data?.casRegistryNumber) {
            const moleculeName = casResult.data.moleculeName || term;
            const casRN = casResult.data.casRegistryNumber;

            try {
              const pubchemResult = await utils.external.searchPubchem.fetch({
                query: moleculeName,
                type: "name",
              });

              if (pubchemResult.ok && pubchemResult.data) {
                const result = pubchemResult.data;
                const allSynonyms = Array.isArray(result.synonyms)
                  ? result.synonyms
                  : [];

                const moleculeResult = normalizeMoleculeResult({
                  id: "",
                  iupacName: result.iupacName || moleculeName,
                  commonName: result.commonName || moleculeName,
                  synonyms: allSynonyms,
                  inchi: result.inchi || "",
                  smiles: result.smiles || "",
                  chemicalFormula: result.chemicalFormula || "",
                  casNumber: casRN,
                  pubChemCid: result.pubChemCid || null,
                });

                try {
                  const dbResult = await utils.molecules.search.fetch({
                    query: casRN,
                  });
                  if (dbResult.ok && dbResult.data) {
                    const dbMolecule = normalizeMoleculeResult(
                      dbResult.data as MoleculeSearchResult,
                    );
                    if (assignResult(dbMolecule, "Database")) {
                      return;
                    }
                  }
                } catch {
                  // Database search failed, fall back to PubChem result
                }

                if (assignResult(moleculeResult, "PubChem (via CAS)")) {
                  return;
                }
              }
            } catch {
              // PubChem lookup failed, continue to other methods
            }
          }
        } catch {
          // CAS lookup failed, continue to other methods
        }
      }

      // Try database search
      try {
        const dbResult = await utils.molecules.search.fetch({ query: term });
        if (dbResult.ok && dbResult.data) {
          const result = normalizeMoleculeResult(
            dbResult.data as MoleculeSearchResult,
          );
          if (assignResult(result, "Database")) {
            return;
          }
        }
      } catch {
        // Database search failed, continue to PubChem
      }

      // Try PubChem search
      try {
        const pubchemResult = await utils.external.searchPubchem.fetch({
          query: term,
          type: /^\d+$/.test(term) ? "cid" : "name",
        });

        if (pubchemResult.ok && pubchemResult.data) {
          const result = pubchemResult.data;
          const allSynonyms = Array.isArray(result.synonyms)
            ? result.synonyms
            : [];

          const moleculeResult = normalizeMoleculeResult({
            id: "",
            iupacName: result.iupacName || term,
            commonName: result.commonName || term,
            synonyms: allSynonyms,
            inchi: result.inchi || "",
            smiles: result.smiles || "",
            chemicalFormula: result.chemicalFormula || "",
            casNumber: result.casNumber || null,
            pubChemCid: result.pubChemCid || null,
          });

          if (assignResult(moleculeResult, "PubChem")) {
            return;
          }
        }
      } catch {
        // PubChem search failed, fall through to error
      }

      if (searchRequestIdRef.current === requestId) {
        setSearchService("");
        setMoleculeSearchResult(null);
        setSelectedMolecule(null);
        setSelectedPreferredName("");
        setMoleculeSearchError(
          "Molecule not found in database, PubChem, or CAS. Please try a different search term.",
        );
      }
    } catch (error) {
      if (searchRequestIdRef.current === requestId) {
        console.error("Molecule search failed:", error);
        setMoleculeSearchResult(null);
        setSelectedMolecule(null);
        setSelectedPreferredName("");
        setSearchService("");
        setMoleculeSearchError(
          error instanceof Error ? error.message : "Unexpected search error.",
        );
      }
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setIsSearching(false);
      }
    }
  };

  useEffect(() => {
    const term = moleculeSearchTerm.trim();

    if (!term) {
      setIsSearching(false);
      setMoleculeSearchResult(null);
      setSelectedMolecule(null);
      setSelectedPreferredName("");
      setMoleculeSearchError(null);
      setSearchService("");
      return;
    }

    if (term.length < 2) {
      setIsSearching(false);
      return;
    }

    setMoleculeSearchError(null);

    const timer = setTimeout(() => {
      const requestId = searchRequestIdRef.current + 1;
      searchRequestIdRef.current = requestId;
      setIsSearching(true);
      performMoleculeSearch(term, requestId).catch((error) => {
        if (searchRequestIdRef.current === requestId) {
          console.error("Molecule search failed:", error);
          setIsSearching(false);
          setMoleculeSearchResult(null);
          setSelectedMolecule(null);
          setSelectedPreferredName("");
          setSearchService("");
          setMoleculeSearchError(
            error instanceof Error
              ? error.message
              : "Unable to search for molecule. Please try again.",
          );
        }
      });
    }, 400);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moleculeSearchTerm]);

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

  const [normalizationEnabled, setNormalizationEnabled] = useState(true);
  const [preEdgePointCount, setPreEdgePointCount] = useState(10);
  const [postEdgePointCount, setPostEdgePointCount] = useState(10);
  const [normalizationSelectionTarget, setNormalizationSelectionTarget] =
    useState<"pre" | "post" | null>(null);
  const [showBareAtom, setShowBareAtom] = useState(true);

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

  const handleSpectrumFile = async (file: File, experimentId: string) => {
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
      if (experiment.csvRawData.length === 0) {
        if (experiment.spectrumPoints.length > 0 || experiment.spectrumError) {
          updateExperiment(experiment.id, {
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
        return;
      }

      const energyColumn = experiment.csvColumnMappings.energy;
      const absorptionColumn = experiment.csvColumnMappings.absorption;

      if (!energyColumn || !absorptionColumn) {
        if (
          experiment.spectrumPoints.length > 0 ||
          experiment.spectrumError !== null
        ) {
          updateExperiment(experiment.id, {
            spectrumPoints: [],
            spectrumError: "Select both energy and absorption columns.",
            selectionSummary: null,
            spectrumStats: null,
          });
        }
        return;
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
        updateExperiment(experiment.id, {
          spectrumPoints: [],
          spectrumError: `Invalid numeric values detected in columns: ${invalidColumns.join(", ")}`,
          selectionSummary: null,
          spectrumStats: null,
        });
        return;
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
        updateExperiment(experiment.id, {
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
    });
  }, [
    experiments,
    experiments
      .map((experiment) =>
        [
          experiment.id,
          experiment.csvRawData.length,
          experiment.csvColumnMappings.energy,
          experiment.csvColumnMappings.absorption,
          experiment.csvColumnMappings.theta,
          experiment.csvColumnMappings.phi,
          JSON.stringify(experiment.spectrumStats ?? null),
        ].join("|"),
      )
      .join("#"),
  ]);

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

    if (normalizationSelectionTarget === "pre") {
      setPreEdgePointCount(selectedCount);
    } else if (normalizationSelectionTarget === "post") {
      setPostEdgePointCount(selectedCount);
    }

    setNormalizationSelectionTarget(null);
  };

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
    setNormalizationEnabled(true);
    setPreEdgePointCount(10);
    setPostEdgePointCount(10);
    setNormalizationSelectionTarget(null);
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
            identifier: sampleIdentifier.trim(),
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
                  <div className="space-y-2">
                    <div className="relative flex-1">
                      <input
                        id="molecule-search"
                        value={moleculeSearchTerm}
                        onChange={(event) =>
                          setMoleculeSearchTerm(event.target.value)
                        }
                        placeholder="Search by name, synonym, CAS, or PubChem CID"
                        className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-20 pl-10 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      {isSearching && (
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-gray-400 dark:text-gray-500">
                          Searching…
                        </span>
                      )}
                    </div>
                    {searchService && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Source: {searchService}
                      </p>
                    )}
                    {moleculeSearchError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {moleculeSearchError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {moleculeSearchResult && (
                <div className="mt-6 space-y-4">
                  {(() => {
                    const isCurrentSelection =
                      !!selectedMolecule &&
                      (selectedMolecule.id && moleculeSearchResult.id
                        ? selectedMolecule.id === moleculeSearchResult.id
                        : selectedMolecule.iupacName ===
                            moleculeSearchResult.iupacName &&
                          selectedMolecule.casNumber ===
                            moleculeSearchResult.casNumber);
                    return (
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
                            variant={isCurrentSelection ? "solid" : "bordered"}
                            className="w-full md:w-auto md:min-w-[180px]"
                            disabled={isCurrentSelection}
                            onClick={() => {
                              setSelectedMolecule(moleculeSearchResult);
                              setSelectedPreferredName(
                                moleculeSearchResult.commonName,
                              );
                              setSubmitStatus(undefined);
                            }}
                          >
                            {isCurrentSelection
                              ? "Selected"
                              : "Use this molecule"}
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  <MoleculeDisplayCompact
                    molecule={{
                      name: moleculeSearchResult.iupacName,
                      commonName: [
                        moleculeSearchResult.commonName,
                        ...moleculeSearchResult.synonyms,
                      ].filter(Boolean),
                      chemical_formula: moleculeSearchResult.chemicalFormula,
                      SMILES: moleculeSearchResult.smiles,
                      InChI: moleculeSearchResult.inchi,
                      pubChemCid: moleculeSearchResult.pubChemCid,
                      casNumber: moleculeSearchResult.casNumber,
                    }}
                  />

                  {allMoleculeNames.length > 1 && (
                    <FormField
                      label="Preferred Molecule Name"
                      type="select"
                      name="preferredName"
                      value={selectedPreferredName}
                      onChange={(value) =>
                        setSelectedPreferredName(value as string)
                      }
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
                  onChange={(value) => setPreparationDate(value as string)}
                  tooltip="The date when the sample was prepared"
                />
                <FormField
                  label="Process Method"
                  type="select"
                  name="processMethod"
                  value={processMethod}
                  onChange={(value) =>
                    setProcessMethod(value as ProcessMethod | "")
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
                  onChange={(value) => setSubstrate(value as string)}
                  placeholder="e.g., Si wafer, glass"
                  tooltip="The substrate material on which the sample was deposited or prepared"
                />
                <FormField
                  label="Solvent"
                  type="text"
                  name="solvent"
                  value={solvent}
                  onChange={(value) => setSolvent(value as string)}
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
                  onChange={(value) => setThickness(value as number | "")}
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
                  onChange={(value) => setMolecularWeight(value as number | "")}
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
                  onChange={(value) => setSelectedVendorId(value as string)}
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

              {experiments.map((experiment, index) => {
                const displayPoints =
                  normalizationEnabled && experiment.normalizedPoints
                    ? experiment.normalizedPoints
                    : experiment.spectrumPoints;

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

                const normalizationRegions =
                  normalizationEnabled && experiment.normalization
                    ? {
                        pre: experiment.normalization.preRange,
                        post: experiment.normalization.postRange,
                      }
                    : undefined;

                return (
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
                          onChange={(value) =>
                            updateExperiment(experiment.id, {
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
                          onChange={(value) =>
                            updateExperiment(experiment.id, {
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
                            updateExperiment(experiment.id, {
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
                            onChange={(value) =>
                              updateExperiment(experiment.id, {
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
                        {(() => {
                          const thetaColumn =
                            experiment.csvColumnMappings.theta;
                          const phiColumn = experiment.csvColumnMappings.phi;
                          const hasMappedColumns = Boolean(
                            thetaColumn && phiColumn,
                          );
                          const geometryPairs = hasMappedColumns
                            ? extractGeometryPairs(experiment.spectrumPoints)
                            : [];
                          const usingCsvGeometry = geometryPairs.length > 0;
                          const attemptedCsvGeometry =
                            hasMappedColumns &&
                            experiment.spectrumPoints.length > 0;

                          return (
                            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                              {usingCsvGeometry ? (
                                <>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Using theta/phi data from spectrum columns
                                    {thetaColumn && phiColumn
                                      ? ` " ${thetaColumn} " and " ${phiColumn} ".`
                                      : "."}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {geometryPairs.length} unique orientation
                                    {geometryPairs.length === 1 ? "" : "s"}{" "}
                                    detected from the spectrum CSV.
                                  </p>
                                </>
                              ) : (
                                <>
                                  {attemptedCsvGeometry && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                      Theta/phi columns were selected but no
                                      usable numeric values were detected. Fixed
                                      geometry inputs will be used instead.
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Provide fixed theta and phi angles
                                    (degrees). These are required when the
                                    spectrum CSV does not include theta/phi
                                    columns.
                                  </p>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                      label="Theta (°)"
                                      type="number"
                                      name={`fixedTheta-${experiment.id}`}
                                      value={experiment.fixedTheta}
                                      onChange={(value) =>
                                        updateExperiment(experiment.id, {
                                          fixedTheta:
                                            value === "" ? "" : String(value),
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
                                        updateExperiment(experiment.id, {
                                          fixedPhi:
                                            value === "" ? "" : String(value),
                                        })
                                      }
                                      tooltip="The azimuthal angle phi in degrees"
                                      step={0.01}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Spectrum Data */}
                      <div>
                        <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Spectrum Data
                        </h4>
                        <CSVUpload
                          label="Spectrum CSV"
                          description="Upload a CSV file with spectral data. You will map the columns to energy, absorption, and optionally theta/phi."
                          acceptedFileTypes=".csv"
                          file={experiment.spectrumFile}
                          onFileSelect={(file) =>
                            handleSpectrumFile(file, experiment.id)
                          }
                          onRemove={() =>
                            clearExperimentSpectrum(experiment.id)
                          }
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
                                  updateExperiment(experiment.id, {
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
                                  updateExperiment(experiment.id, {
                                    csvColumnMappings: {
                                      ...experiment.csvColumnMappings,
                                      absorption: value as string,
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
                            {experiment.csvColumns.length > 0 && (
                              <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                  label="Theta Column (optional)"
                                  type="select"
                                  name={`thetaColumn-${experiment.id}`}
                                  value={
                                    experiment.csvColumnMappings.theta || ""
                                  }
                                  onChange={(value) =>
                                    updateExperiment(experiment.id, {
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
                                  value={experiment.csvColumnMappings.phi || ""}
                                  onChange={(value) =>
                                    updateExperiment(experiment.id, {
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
                            )}
                          </div>
                        )}
                      </div>

                      {experiment.spectrumStats && (
                        <SpectrumSummary stats={experiment.spectrumStats} />
                      )}

                      {experiment.spectrumPoints.length > 0 && (
                        <div className="space-y-3">
                          <SpectrumPlot
                            points={displayPoints}
                            energyStats={experiment.spectrumStats?.energy}
                            absorptionStats={displayAbsorptionStats}
                            referenceCurves={
                              showBareAtom &&
                              bareAtomAbsorptionQuery.data?.points
                                ? [
                                    {
                                      label:
                                        "Bare Atom Absorption (ρ = 1 g/cm³)",
                                      color: "#111827",
                                      points:
                                        bareAtomAbsorptionQuery.data.points.map(
                                          (point) => ({
                                            energy: point.energyEv,
                                            absorption: point.mu,
                                          }),
                                        ),
                                    },
                                  ]
                                : []
                            }
                            normalizationRegions={normalizationRegions}
                            onSelectionChange={(selection) => {
                              updateExperiment(experiment.id, {
                                selectionSummary: selection,
                              });
                              if (selection && normalizationSelectionTarget) {
                                applyNormalizationSelection(
                                  experiment.id,
                                  selection,
                                );
                              }
                            }}
                          />
                          {experiment.selectionSummary && (
                            <SelectionSummary
                              selection={experiment.selectionSummary}
                            />
                          )}
                          {bareAtomAbsorptionQuery.isLoading && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Loading bare atom absorption curve…
                            </p>
                          )}
                          {bareAtomAbsorptionQuery.error && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Unable to load bare atom absorption data:{" "}
                              {bareAtomAbsorptionQuery.error.message}
                            </p>
                          )}
                          {normalizationEnabled && experiment.normalization && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-200">
                              <p className="font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
                                Normalization Applied
                              </p>
                              <p>
                                Scale:{" "}
                                {experiment.normalization.scale.toPrecision(4)}{" "}
                                · Offset:
                                {experiment.normalization.offset.toPrecision(4)}
                              </p>
                              {experiment.normalization.preRange && (
                                <p>
                                  Pre-edge:{" "}
                                  {experiment.normalization.preRange[0].toFixed(
                                    3,
                                  )}{" "}
                                  –
                                  {experiment.normalization.preRange[1].toFixed(
                                    3,
                                  )}
                                </p>
                              )}
                              {experiment.normalization.postRange && (
                                <p>
                                  Post-edge:{" "}
                                  {experiment.normalization.postRange[0].toFixed(
                                    3,
                                  )}{" "}
                                  –
                                  {experiment.normalization.postRange[1].toFixed(
                                    3,
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                          {normalizationEnabled &&
                            !experiment.normalization && (
                              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                                Normalization requires at least two distinct
                                data points across the chosen pre- and post-edge
                                ranges.
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
    );
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

type NumericColumnReport = {
  sanitizedInvalidRows: number[];
};

const analyzeNumericColumns = (
  rows: Record<string, unknown>[],
  columns: Set<string>,
): Record<string, NumericColumnReport> => {
  const reports: Record<string, NumericColumnReport> = {};

  columns.forEach((column) => {
    const invalidRows: number[] = [];

    rows.forEach((row, rowIndex) => {
      const rawValue = row[column];
      if (rawValue === undefined || rawValue === null || rawValue === "") {
        invalidRows.push(rowIndex);
        return;
      }

      const numericValue = toNumber(rawValue);
      if (!Number.isFinite(numericValue)) {
        invalidRows.push(rowIndex);
      }
    });

    reports[column] = { sanitizedInvalidRows: invalidRows };
  });

  return reports;
};

type BareAtomPoint = {
  energyEv: number;
  mu: number;
};

type NormalizationComputation = {
  normalizedPoints: SpectrumPoint[];
  scale: number;
  offset: number;
  preRange: [number, number] | null;
  postRange: [number, number] | null;
};

const interpolateBareMu = (
  barePoints: BareAtomPoint[],
  energy: number,
): number => {
  if (barePoints.length === 0) {
    return 0;
  }

  if (energy <= barePoints[0]!.energyEv) {
    return barePoints[0]!.mu;
  }

  const last = barePoints[barePoints.length - 1]!;
  if (energy >= last.energyEv) {
    return last.mu;
  }

  let left = 0;
  let right = barePoints.length - 1;

  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (barePoints[mid]!.energyEv > energy) {
      right = mid;
    } else {
      left = mid;
    }
  }

  const leftPoint = barePoints[left]!;
  const rightPoint = barePoints[right]!;
  const span = rightPoint.energyEv - leftPoint.energyEv;
  if (span === 0) {
    return leftPoint.mu;
  }
  const t = (energy - leftPoint.energyEv) / span;
  return leftPoint.mu + t * (rightPoint.mu - leftPoint.mu);
};

const computeNormalizationForExperiment = (
  points: SpectrumPoint[],
  barePoints: BareAtomPoint[],
  preEdgeCount: number,
  postEdgeCount: number,
): NormalizationComputation | null => {
  if (points.length === 0) {
    return null;
  }

  const clampedPre = Math.max(0, Math.min(preEdgeCount, points.length));
  const clampedPost = Math.max(0, Math.min(postEdgeCount, points.length));

  const selectedIndices = new Set<number>();
  for (let idx = 0; idx < clampedPre; idx += 1) {
    selectedIndices.add(idx);
  }
  for (
    let idx = Math.max(points.length - clampedPost, 0);
    idx < points.length;
    idx += 1
  ) {
    selectedIndices.add(idx);
  }

  if (selectedIndices.size < 2) {
    for (let idx = 0; idx < Math.min(points.length, 2); idx += 1) {
      selectedIndices.add(idx);
    }
    if (selectedIndices.size < 2) {
      return null;
    }
  }

  const muValues = points.map((point) =>
    interpolateBareMu(barePoints, point.energy),
  );

  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  selectedIndices.forEach((index) => {
    const intensity = points[index]?.absorption ?? 0;
    const mu = muValues[index] ?? 0;
    n += 1;
    sumX += intensity;
    sumY += mu;
    sumXX += intensity * intensity;
    sumXY += intensity * mu;
  });

  if (n < 2) {
    return null;
  }

  const denominator = n * sumXX - sumX * sumX;
  const scale =
    Math.abs(denominator) > 1e-12 ? (n * sumXY - sumX * sumY) / denominator : 1;
  const offset = (sumY - scale * sumX) / n;

  if (!Number.isFinite(scale) || !Number.isFinite(offset)) {
    return null;
  }

  const normalizedPoints: SpectrumPoint[] = points.map((point) => ({
    ...point,
    absorption: scale * point.absorption + offset,
  }));

  const preRange: [number, number] | null =
    clampedPre > 0
      ? [
          points[0]!.energy,
          points[Math.min(clampedPre - 1, points.length - 1)]!.energy,
        ]
      : null;
  const postRange: [number, number] | null =
    clampedPost > 0
      ? [
          points[Math.max(points.length - clampedPost, 0)]!.energy,
          points[points.length - 1]!.energy,
        ]
      : null;

  return {
    normalizedPoints,
    scale,
    offset,
    preRange,
    postRange,
  };
};

const rangesApproximatelyEqual = (
  a: [number, number] | null,
  b: [number, number] | null,
  tolerance = 1e-6,
) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance
  );
};

const countPointsWithinRange = (
  points: SpectrumPoint[],
  range: { min: number; max: number },
) =>
  points.filter(
    (point) => point.energy >= range.min && point.energy <= range.max,
  ).length;
