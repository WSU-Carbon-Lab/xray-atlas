"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  InformationCircleIcon,
  PencilIcon,
  Square3Stack3DIcon,
  SparklesIcon,
  XMarkIcon,
  StarIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { Mountain, ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import { Input, Tooltip, Slider, ScrollShadow } from "@heroui/react";
import { DefaultButton as Button } from "~/app/components/Button";
import { SubToolButton } from "./SubToolButton";
import { ToggleIconButton } from "~/app/components/ToggleIconButton";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { MoleculeSelector } from "./MoleculeSelector";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type {
  PeakData,
  NormalizationType,
} from "~/app/contribute/nexafs/types";
import {
  detectPeaks,
  convertToPeakData,
} from "~/app/contribute/nexafs/utils/peakDetection";
import type { SpectrumPoint } from "~/app/components/plots/core/types";
import { noop, noopString, noopMolecule } from "~/lib/noop";
import {
  calculateDifferenceSpectra,
  type DifferenceSpectrum,
} from "~/app/contribute/nexafs/utils/differenceSpectra";

const BOND_OPTIONS = [
  { value: "", label: "Select bond..." },
  { value: "C=C", label: "C=C" },
  { value: "C-O", label: "C-O" },
  { value: "C-N", label: "C-N" },
  { value: "C=N", label: "C=N" },
  { value: "Other", label: "Other" },
];

const TRANSITION_OPTIONS = [
  { value: "", label: "Select transition..." },
  { value: "π*", label: "π*" },
  { value: "σ*", label: "σ*" },
  { value: "Rydberg", label: "Rydberg" },
  { value: "Other", label: "Other" },
];

interface AnalysisToolbarProps {
  hasMolecule: boolean;
  hasData: boolean;
  hasNormalization: boolean;
  normalizationLocked: boolean;
  normalizationType: NormalizationType;
  onNormalizationTypeChange: (type: NormalizationType) => void;
  onPreEdgeSelect: () => void;
  onPostEdgeSelect: () => void;
  onToggleLock: () => void;
  isSelectingPreEdge: boolean;
  isSelectingPostEdge: boolean;
  normalizationRegions: {
    pre: [number, number] | null;
    post: [number, number] | null;
  };
  onNormalizationRegionChange?: (
    type: "pre" | "post",
    range: [number, number],
  ) => void;
  peaks: PeakData[];
  spectrumPoints: SpectrumPoint[];
  normalizedPoints: SpectrumPoint[] | null;
  selectedPeakId: string | null;
  onPeaksChange: (peaks: PeakData[]) => void;
  onPeakSelect: (peakId: string | null) => void;
  onPeakUpdate: (peakId: string, energy: number) => void;
  onPeakAdd?: (energy: number) => void;
  isManualPeakMode?: boolean;
  onManualPeakModeChange?: (enabled: boolean) => void;
  differenceSpectra?: DifferenceSpectrum[];
  onDifferenceSpectraChange?: (spectra: DifferenceSpectrum[]) => void;
  showThetaData?: boolean;
  showPhiData?: boolean;
  onShowThetaDataChange?: (show: boolean) => void;
  onShowPhiDataChange?: (show: boolean) => void;
  selectedGeometry?: { theta?: number; phi?: number } | null;
  onSelectedGeometryChange?: (
    geometry: { theta?: number; phi?: number } | null,
  ) => void;
  onReloadData?: () => void;
  // Config tool props
  moleculeId?: string | null;
  instrumentId?: string | null;
  edgeId?: string | null;
  onMoleculeChange?: (moleculeId: string) => void;
  onInstrumentChange?: (instrumentId: string) => void;
  onEdgeChange?: (edgeId: string) => void;
  instrumentOptions?: Array<{
    id: string;
    name: string;
    facilityName?: string;
  }>;
  edgeOptions?: Array<{ id: string; targetatom: string; corestate: string }>;
  availableEdgeOptions?: Array<{
    id: string;
    targetatom: string;
    corestate: string;
  }>;
  onAddFacility?: () => void;
  // Molecule selector props
  moleculeSearchTerm?: string;
  onMoleculeSearchTermChange?: (term: string) => void;
  moleculeSuggestions?: Array<{
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
  }>;
  moleculeManualResults?: Array<{
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
  }>;
  moleculeSuggestionError?: string | null;
  moleculeManualError?: string | null;
  isMoleculeSuggesting?: boolean;
  isMoleculeManualSearching?: boolean;
  selectedMolecule?: {
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
  } | null;
  selectedMoleculePreferredName?: string;
  onSelectedMoleculePreferredNameChange?: (name: string) => void;
  allMoleculeNames?: string[];
  onUseMolecule?: (molecule: {
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
  }) => void;
  onMoleculeManualSearch?: () => void;
  moleculeLocked?: boolean;
  onToggleMoleculeLock?: () => void;
  edgeAtomMatches?: boolean;
  selectedEdge?: { targetatom: string; corestate: string } | null;
}

export function AnalysisToolbar({
  hasMolecule,
  hasData,
  hasNormalization,
  normalizationLocked,
  normalizationType,
  onNormalizationTypeChange,
  onPreEdgeSelect,
  onPostEdgeSelect,
  onToggleLock,
  isSelectingPreEdge,
  isSelectingPostEdge,
  normalizationRegions,
  onNormalizationRegionChange,
  peaks,
  spectrumPoints,
  normalizedPoints,
  selectedPeakId,
  onPeaksChange,
  onPeakSelect,
  onPeakUpdate,
  onPeakAdd: _onPeakAdd,
  isManualPeakMode: externalManualPeakMode,
  onManualPeakModeChange,
  differenceSpectra: externalDifferenceSpectra,
  onDifferenceSpectraChange,
  showThetaData: _externalShowThetaData,
  showPhiData: _externalShowPhiData,
  onShowThetaDataChange,
  onShowPhiDataChange,
  selectedGeometry,
  onSelectedGeometryChange,
  onReloadData: _onReloadData,
  moleculeId: _moleculeId,
  instrumentId,
  edgeId,
  onMoleculeChange: _onMoleculeChange,
  onInstrumentChange,
  onEdgeChange,
  instrumentOptions = [],
  edgeOptions = [],
  availableEdgeOptions,
  onAddFacility,
  moleculeSearchTerm,
  onMoleculeSearchTermChange,
  moleculeSuggestions = [],
  moleculeManualResults = [],
  moleculeSuggestionError,
  moleculeManualError,
  isMoleculeSuggesting = false,
  isMoleculeManualSearching = false,
  selectedMolecule,
  selectedMoleculePreferredName,
  onSelectedMoleculePreferredNameChange,
  allMoleculeNames = [],
  onUseMolecule,
  onMoleculeManualSearch,
  moleculeLocked = false,
  onToggleMoleculeLock,
  edgeAtomMatches = true,
  selectedEdge,
}: AnalysisToolbarProps) {
  const [internalManualPeakMode, setInternalManualPeakMode] = useState(false);
  const isManualPeakMode = externalManualPeakMode ?? internalManualPeakMode;
  const [selectedTool, setSelectedTool] = useState<
    "config" | "normalize" | "peaks" | "difference"
  >("config");
  const [peakDetectionMode, setPeakDetectionMode] = useState<
    "auto" | "manual" | null
  >(null);
  const peakDetectionModeRef = useRef(peakDetectionMode);
  const [showAutoDetectConfirm, setShowAutoDetectConfirm] = useState(false);
  const [differenceMode, setDifferenceMode] = useState<
    "theta" | "phi" | "delta-theta" | "delta-phi" | null
  >(null);
  const [internalDifferenceSpectra, setInternalDifferenceSpectra] = useState<
    DifferenceSpectrum[]
  >([]);
  const differenceSpectra =
    externalDifferenceSpectra ?? internalDifferenceSpectra;
  const [_internalShowThetaData, setInternalShowThetaData] = useState(false);
  const [_internalShowPhiData, setInternalShowPhiData] = useState(false);
  void _internalShowThetaData; // State managed via callbacks, not read directly
  void _internalShowPhiData; // State managed via callbacks, not read directly

  // Keep ref in sync with state
  useEffect(() => {
    peakDetectionModeRef.current = peakDetectionMode;
  }, [peakDetectionMode]);

  // Sync peakDetectionMode with external isManualPeakMode
  useEffect(() => {
    if (externalManualPeakMode !== undefined) {
      if (externalManualPeakMode) {
        setPeakDetectionMode("manual");
      } else if (peakDetectionModeRef.current === "manual") {
        // Only clear if it was manual, don't override auto
        setPeakDetectionMode(null);
      }
    }
  }, [externalManualPeakMode]);
  const [isAddingPeak, setIsAddingPeak] = useState(false);
  const [newPeakEnergy, setNewPeakEnergy] = useState("");
  const [newPeakBond, setNewPeakBond] = useState("");
  const [newPeakTransition, setNewPeakTransition] = useState("");
  const [newPeakAmplitude, setNewPeakAmplitude] = useState<number | undefined>(
    undefined,
  );
  const [newPeakWidth, setNewPeakWidth] = useState<number | undefined>(
    undefined,
  );
  const [expandedPeakIds, setExpandedPeakIds] = useState<Set<string>>(
    new Set(),
  );
  const [customBonds, setCustomBonds] = useState<string[]>([]);
  const [customTransitions, setCustomTransitions] = useState<string[]>([]);
  const [addingCustomBondForPeak, setAddingCustomBondForPeak] = useState<
    number | null
  >(null);
  const [addingCustomTransitionForPeak, setAddingCustomTransitionForPeak] =
    useState<number | null>(null);
  const [newCustomBondValue, setNewCustomBondValue] = useState("");
  const [newCustomTransitionValue, setNewCustomTransitionValue] = useState("");
  const [addingCustomBondInForm, setAddingCustomBondInForm] = useState(false);
  const [addingCustomTransitionInForm, setAddingCustomTransitionInForm] =
    useState(false);
  const [newFormBondValue, setNewFormBondValue] = useState("");
  const [newFormTransitionValue, setNewFormTransitionValue] = useState("");
  const [peakParams, setPeakParams] = useState<{
    minProminence?: number;
    minDistance?: number;
    width?: number;
    height?: number;
    threshold?: number;
  }>({
    minProminence: 0.05, // Reasonable default, not scipy default but commonly used
    // minDistance, width, height, threshold default to undefined (scipy None)
  });

  // Track which peaks are auto-detected vs manually added
  const [autoDetectedPeakIds, setAutoDetectedPeakIds] = useState<Set<string>>(
    new Set(),
  );
  void autoDetectedPeakIds; // Reserved for future use

  // Track manual peaks separately to avoid dependency on peaks prop
  const manualPeaksRef = useRef<PeakData[]>([]);

  // Update manual peaks ref when peaks change externally (but not from auto-detection)
  useEffect(() => {
    // Only update manual peaks if we're not in auto mode or if a peak was manually added/removed
    if (peakDetectionMode !== "auto") {
      manualPeaksRef.current = [...peaks];
    } else {
      // In auto mode, only update manual peaks if the change wasn't from auto-detection
      // Check if any peak IDs changed that aren't auto-detected
      const currentManualPeaks = peaks.filter(
        (peak) =>
          "id" in peak &&
          typeof (peak as { id?: string }).id === "string" &&
          !autoDetectedPeakIds.has((peak as { id: string }).id),
      );
      // Only update if manual peaks actually changed (user added/removed/edited manually)
      const manualPeaksChanged =
        currentManualPeaks.length !== manualPeaksRef.current.length ||
        currentManualPeaks.some((peak, idx) => {
          const refPeak = manualPeaksRef.current[idx];
          return (
            peak.energy !== refPeak?.energy ||
            (peak.id ?? "") !== (refPeak?.id ?? "")
          );
        });
      if (manualPeaksChanged) {
        manualPeaksRef.current = currentManualPeaks;
      }
    }
  }, [peaks, peakDetectionMode, autoDetectedPeakIds]);

  // Build peak detection options from params
  const buildPeakOptions = useMemo(() => {
    const options: {
      minProminence?: number;
      minDistance?: number;
      width?: number;
      height?: number;
      threshold?: number;
    } = {};

    if (
      peakParams.minProminence !== undefined &&
      peakParams.minProminence > 0
    ) {
      options.minProminence = peakParams.minProminence;
    }
    if (peakParams.minDistance !== undefined && peakParams.minDistance > 0) {
      options.minDistance = peakParams.minDistance;
    }
    if (peakParams.width !== undefined && peakParams.width > 0) {
      options.width = peakParams.width;
    }
    if (peakParams.height !== undefined && peakParams.height > 0) {
      options.height = peakParams.height;
    }
    if (peakParams.threshold !== undefined && peakParams.threshold > 0) {
      options.threshold = peakParams.threshold;
    }

    return options;
  }, [peakParams]);

  // Helper function to get all bond options including custom ones
  const getAllBondOptions = () => {
    const customBondOptions = customBonds
      .filter((bond) => !BOND_OPTIONS.some((opt) => opt.value === bond))
      .map((bond) => ({ value: bond, label: bond }));
    return [
      { value: "__add_new__", label: "+ Add new bond..." },
      ...BOND_OPTIONS.filter((opt) => opt.value !== ""),
      ...customBondOptions,
    ];
  };

  // Helper function to get all transition options including custom ones
  const getAllTransitionOptions = () => {
    const customTransitionOptions = customTransitions
      .filter(
        (transition) =>
          !TRANSITION_OPTIONS.some((opt) => opt.value === transition),
      )
      .map((transition) => ({ value: transition, label: transition }));
    return [
      { value: "__add_new__", label: "+ Add new transition..." },
      ...TRANSITION_OPTIONS.filter((opt) => opt.value !== ""),
      ...customTransitionOptions,
    ];
  };

  // Helper function to sort peaks - step peaks always first, then by energy
  const sortPeaksByEnergy = (peaksToSort: PeakData[]): PeakData[] => {
    return [...peaksToSort].sort((a, b) => {
      // Step peaks always come first
      if (a.isStep && !b.isStep) return -1;
      if (!a.isStep && b.isStep) return 1;
      // Otherwise sort by energy
      return a.energy - b.energy;
    });
  };

  // Helper function to estimate amplitude from spectrum at a given energy
  const estimateAmplitudeAtEnergy = useCallback(
    (energy: number, points: SpectrumPoint[]): number | undefined => {
      if (points.length === 0) return undefined;

      // Find the closest point to the given energy
      let closestPoint = points[0];
      let minDistance = Math.abs(points[0]!.energy - energy);

      for (const point of points) {
        const distance = Math.abs(point.energy - energy);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }

      // Use the absorption value as amplitude
      return closestPoint?.absorption;
    },
    [],
  );

  // Helper function to update peaks with sorting
  const updatePeaksSorted = useCallback(
    (newPeaks: PeakData[]) => {
      onPeaksChange(sortPeaksByEnergy(newPeaks));
    },
    [onPeaksChange],
  );

  // Function to run peak detection manually
  const runPeakDetection = useCallback(
    (force = false) => {
      // Allow forced execution even if mode check fails (for initial detection after enabling)
      if (!force && peakDetectionMode !== "auto") {
        return;
      }

      const pointsToAnalyze = normalizedPoints ?? spectrumPoints;
      if (pointsToAnalyze.length === 0) {
        return;
      }

      // If geometry is selected, filter points to that geometry
      let filteredPoints = pointsToAnalyze;
      if (selectedGeometry) {
        filteredPoints = pointsToAnalyze.filter((point) => {
          const hasGeometry =
            typeof point.theta === "number" &&
            Number.isFinite(point.theta) &&
            typeof point.phi === "number" &&
            Number.isFinite(point.phi);

          if (!hasGeometry) {
            return (
              selectedGeometry.theta === undefined &&
              selectedGeometry.phi === undefined
            );
          }

          const thetaMatch =
            selectedGeometry.theta === undefined ||
            (typeof point.theta === "number" &&
              Number.isFinite(point.theta) &&
              Math.abs(point.theta - selectedGeometry.theta) < 0.01);
          const phiMatch =
            selectedGeometry.phi === undefined ||
            (typeof point.phi === "number" &&
              Number.isFinite(point.phi) &&
              Math.abs(point.phi - selectedGeometry.phi) < 0.01);

          return thetaMatch && phiMatch;
        });
      }

      if (filteredPoints.length === 0) {
        return;
      }

      const detected = detectPeaks(filteredPoints, buildPeakOptions);
      const newPeaks = convertToPeakData(detected).map((peak, index) => {
        // Estimate amplitude from the filtered spectrum
        const amplitude = estimateAmplitudeAtEnergy(
          peak.energy,
          filteredPoints,
        );
        return {
          ...peak,
          amplitude,
          id: `peak-auto-${Date.now()}-${index}`,
        };
      });

      const newAutoDetectedIds = new Set(
        newPeaks
          .map((p) => ("id" in p && typeof p.id === "string" ? p.id : ""))
          .filter(Boolean),
      );
      setAutoDetectedPeakIds(newAutoDetectedIds);

      // Get current manual peaks from ref (not from props to avoid infinite loop)
      const currentManualPeaks = manualPeaksRef.current;

      // Replace only auto-detected peaks, keep manual ones, and sort by energy
      updatePeaksSorted([...currentManualPeaks, ...newPeaks]);
    },
    [
      peakDetectionMode,
      normalizedPoints,
      spectrumPoints,
      buildPeakOptions,
      updatePeaksSorted,
      selectedGeometry,
      estimateAmplitudeAtEnergy,
    ],
  );

  const handleAutoDetectPeaks = () => {
    // If already in auto mode, turn it off without confirmation
    if (peakDetectionMode === "auto") {
      setPeakDetectionMode(null);
      return;
    }
    // Show confirmation dialog only when turning ON auto-detection
    setShowAutoDetectConfirm(true);
  };

  const handleConfirmAutoDetect = () => {
    setShowAutoDetectConfirm(false);
    // Set auto-detect as the active mode
    setPeakDetectionMode("auto");
    // Run initial peak detection when auto mode is enabled
    // Use setTimeout to ensure state is updated, and force execution
    setTimeout(() => {
      runPeakDetection(true);
    }, 0);
  };

  const handleManualPeakMode = () => {
    const newMode = !isManualPeakMode;
    // Set manual as the active mode when enabling, clear when disabling
    if (newMode) {
      setPeakDetectionMode("manual");
    } else {
      setPeakDetectionMode(null);
    }
    if (onManualPeakModeChange) {
      onManualPeakModeChange(newMode);
    } else {
      setInternalManualPeakMode(newMode);
    }
  };

  const handleAddPeak = () => {
    const energy = parseFloat(newPeakEnergy);
    if (!Number.isFinite(energy)) {
      return;
    }

    // Estimate amplitude from spectrum if not provided
    const pointsToAnalyze = normalizedPoints ?? spectrumPoints;
    let amplitude = newPeakAmplitude;
    if (amplitude === undefined) {
      // If geometry is selected, filter points to that geometry for amplitude estimation
      let filteredPoints = pointsToAnalyze;
      if (selectedGeometry) {
        filteredPoints = pointsToAnalyze.filter((point) => {
          const hasGeometry =
            typeof point.theta === "number" &&
            Number.isFinite(point.theta) &&
            typeof point.phi === "number" &&
            Number.isFinite(point.phi);

          if (!hasGeometry) {
            return (
              selectedGeometry.theta === undefined &&
              selectedGeometry.phi === undefined
            );
          }

          const thetaMatch =
            selectedGeometry.theta === undefined ||
            (typeof point.theta === "number" &&
              Number.isFinite(point.theta) &&
              Math.abs(point.theta - selectedGeometry.theta) < 0.01);
          const phiMatch =
            selectedGeometry.phi === undefined ||
            (typeof point.phi === "number" &&
              Number.isFinite(point.phi) &&
              Math.abs(point.phi - selectedGeometry.phi) < 0.01);

          return thetaMatch && phiMatch;
        });
      }
      amplitude = estimateAmplitudeAtEnergy(energy, filteredPoints);
    }

    const newPeak = {
      energy,
      bond: newPeakBond || undefined,
      transition: newPeakTransition || undefined,
      amplitude,
      width: newPeakWidth,
      id: `peak-manual-${Date.now()}`,
    } as PeakData & { id: string };

    // Update manual peaks ref
    manualPeaksRef.current = [...manualPeaksRef.current, newPeak];

    // Manual peaks are not in autoDetectedPeakIds, so they'll be preserved
    // Sort peaks by energy after adding
    updatePeaksSorted([...peaks, newPeak]);
    setIsAddingPeak(false);
    setNewPeakEnergy("");
    setNewPeakBond("");
    setNewPeakTransition("");
    setNewPeakAmplitude(undefined);
    setNewPeakWidth(undefined);
  };

  const handleUpdatePeak = (index: number, updates: Partial<PeakData>) => {
    const updated = [...peaks];
    const peak = updated[index];
    if (!peak) return;

    updated[index] = { ...peak, ...updates };

    // Update manual peaks ref if this is a manual peak
    if (
      "id" in peak &&
      typeof (peak as { id?: string }).id === "string" &&
      !autoDetectedPeakIds.has((peak as { id: string }).id)
    ) {
      const manualIndex = manualPeaksRef.current.findIndex(
        (p) =>
          ("id" in p && typeof p.id === "string" ? p.id : "") ===
          (peak as { id: string }).id,
      );
      if (manualIndex >= 0) {
        manualPeaksRef.current[manualIndex] = {
          ...manualPeaksRef.current[manualIndex]!,
          ...updates,
        };
      }
    }

    // Sort peaks by energy after update (especially important if energy changed)
    updatePeaksSorted(updated);

    if (
      updates.energy !== undefined &&
      "id" in peak &&
      typeof (peak as { id?: string }).id === "string"
    ) {
      onPeakUpdate((peak as { id: string }).id, updates.energy);
    }
  };

  const handleClearAllPeaks = () => {
    manualPeaksRef.current = [];
    setAutoDetectedPeakIds(new Set());
    setExpandedPeakIds(new Set());
    onPeakSelect(null);
    onPeaksChange([]);
  };

  const togglePeakExpansion = (peakId: string) => {
    setExpandedPeakIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(peakId)) {
        newSet.delete(peakId);
      } else {
        newSet.add(peakId);
      }
      return newSet;
    });
  };

  const handleDeletePeak = (index: number) => {
    const peak = peaks[index];
    const peakId =
      peak && "id" in peak && typeof (peak as { id?: string }).id === "string"
        ? (peak as { id: string }).id
        : `peak-${index}`;

    if (peak && peakId === selectedPeakId) {
      onPeakSelect(null);
    }

    // Remove from expanded set
    setExpandedPeakIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(peakId);
      return newSet;
    });

    // Update manual peaks ref if this is a manual peak
    if (
      peak &&
      "id" in peak &&
      typeof (peak as { id?: string }).id === "string" &&
      !autoDetectedPeakIds.has((peak as { id: string }).id)
    ) {
      manualPeaksRef.current = manualPeaksRef.current.filter(
        (p) =>
          ("id" in p && typeof p.id === "string" ? p.id : "") !==
          (peak as { id: string }).id,
      );
    }

    updatePeaksSorted(peaks.filter((_, i) => i !== index));
  };

  const handlePreEdgeRangeChange = (index: 0 | 1, value: number) => {
    const current = normalizationRegions.pre;
    if (!current || !onNormalizationRegionChange) return;
    const rounded = Math.round(value * 100) / 100;
    const updated: [number, number] =
      index === 0 ? [rounded, current[1]] : [current[0], rounded];
    onNormalizationRegionChange("pre", updated);
  };

  const handlePostEdgeRangeChange = (index: 0 | 1, value: number) => {
    const current = normalizationRegions.post;
    if (!current || !onNormalizationRegionChange) return;
    const rounded = Math.round(value * 100) / 100;
    const updated: [number, number] =
      index === 0 ? [rounded, current[1]] : [current[0], rounded];
    onNormalizationRegionChange("post", updated);
  };

  // Check if theta/phi buttons should be enabled
  const hasMultipleThetas = useMemo(() => {
    const pointsToCheck = normalizedPoints ?? spectrumPoints;
    const thetaSet = new Set<number>();
    pointsToCheck.forEach((point) => {
      if (
        typeof point.theta === "number" &&
        Number.isFinite(point.theta) &&
        point.theta !== 0
      ) {
        thetaSet.add(point.theta);
      }
    });
    return thetaSet.size > 1;
  }, [spectrumPoints, normalizedPoints]);

  const hasMultiplePhis = useMemo(() => {
    const pointsToCheck = normalizedPoints ?? spectrumPoints;
    const phiSet = new Set<number>();
    pointsToCheck.forEach((point) => {
      if (
        typeof point.phi === "number" &&
        Number.isFinite(point.phi) &&
        point.phi !== 0
      ) {
        phiSet.add(point.phi);
      }
    });
    return phiSet.size > 1;
  }, [spectrumPoints, normalizedPoints]);

  const hasThetaData = useMemo(() => {
    const pointsToCheck = normalizedPoints ?? spectrumPoints;
    return pointsToCheck.some(
      (point) =>
        typeof point.theta === "number" &&
        Number.isFinite(point.theta) &&
        point.theta !== 0,
    );
  }, [spectrumPoints, normalizedPoints]);

  const hasPhiData = useMemo(() => {
    const pointsToCheck = normalizedPoints ?? spectrumPoints;
    return pointsToCheck.some(
      (point) =>
        typeof point.phi === "number" &&
        Number.isFinite(point.phi) &&
        point.phi !== 0,
    );
  }, [spectrumPoints, normalizedPoints]);

  const handleDifferenceMode = (
    mode: "theta" | "phi" | "delta-theta" | "delta-phi",
  ) => {
    setDifferenceMode(mode);

    if (mode === "theta") {
      const newShowTheta = true;
      const newShowPhi = false;
      if (onShowThetaDataChange) {
        onShowThetaDataChange(newShowTheta);
      } else {
        setInternalShowThetaData(newShowTheta);
      }
      if (onShowPhiDataChange) {
        onShowPhiDataChange(newShowPhi);
      } else {
        setInternalShowPhiData(newShowPhi);
      }
      // Clear difference spectra when showing original data
      if (onDifferenceSpectraChange) {
        onDifferenceSpectraChange([]);
      } else {
        setInternalDifferenceSpectra([]);
      }
    } else if (mode === "phi") {
      const newShowTheta = false;
      const newShowPhi = true;
      if (onShowThetaDataChange) {
        onShowThetaDataChange(newShowTheta);
      } else {
        setInternalShowThetaData(newShowTheta);
      }
      if (onShowPhiDataChange) {
        onShowPhiDataChange(newShowPhi);
      } else {
        setInternalShowPhiData(newShowPhi);
      }
      // Clear difference spectra when showing original data
      if (onDifferenceSpectraChange) {
        onDifferenceSpectraChange([]);
      } else {
        setInternalDifferenceSpectra([]);
      }
    } else if (mode === "delta-theta") {
      if (onShowThetaDataChange) {
        onShowThetaDataChange(false);
      } else {
        setInternalShowThetaData(false);
      }
      if (onShowPhiDataChange) {
        onShowPhiDataChange(false);
      } else {
        setInternalShowPhiData(false);
      }
      const pointsToAnalyze = normalizedPoints ?? spectrumPoints;
      if (pointsToAnalyze.length === 0) {
        return;
      }
      const calculated = calculateDifferenceSpectra(pointsToAnalyze, "theta");
      if (onDifferenceSpectraChange) {
        onDifferenceSpectraChange(calculated);
      } else {
        setInternalDifferenceSpectra(calculated);
      }
    } else if (mode === "delta-phi") {
      if (onShowThetaDataChange) {
        onShowThetaDataChange(false);
      } else {
        setInternalShowThetaData(false);
      }
      if (onShowPhiDataChange) {
        onShowPhiDataChange(false);
      } else {
        setInternalShowPhiData(false);
      }
      const pointsToAnalyze = normalizedPoints ?? spectrumPoints;
      if (pointsToAnalyze.length === 0) {
        return;
      }
      const calculated = calculateDifferenceSpectra(pointsToAnalyze, "phi");
      if (onDifferenceSpectraChange) {
        onDifferenceSpectraChange(calculated);
      } else {
        setInternalDifferenceSpectra(calculated);
      }
    }
  };

  const handleTogglePreferred = (index: number) => {
    const updated = differenceSpectra.map(
      (spec: DifferenceSpectrum, i: number) => ({
        ...spec,
        preferred: i === index ? !spec.preferred : false, // Only one can be preferred
      }),
    );
    if (onDifferenceSpectraChange) {
      onDifferenceSpectraChange(updated);
    } else {
      setInternalDifferenceSpectra(updated);
    }
  };

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`shrink-0 self-stretch rounded-lg border border-gray-200 bg-white transition-all dark:border-gray-700 dark:bg-gray-800 ${
        isCollapsed ? "w-12" : "w-64"
      }`}
    >
      <div className="relative flex h-full flex-col p-4">
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="absolute top-3 right-3 z-10 rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Collapse toolbar"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        )}
        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="absolute top-3 right-3 z-10 rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Expand toolbar"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        )}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 pt-8">
            <ToggleIconButton
              icon={
                <Cog6ToothIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              }
              isActive={selectedTool === "config"}
              onClick={() => setSelectedTool("config")}
              ariaLabel="Configuration"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                selectedTool === "config"
                  ? "border-accent bg-gray-100 dark:bg-gray-700"
                  : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
              tooltip={{
                content: "Configure molecule, instrument, and edge",
                placement: "right",
                offset: 8,
              }}
            />
            <ToggleIconButton
              icon={
                <Square3Stack3DIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              }
              isActive={selectedTool === "normalize"}
              onClick={() => setSelectedTool("normalize")}
              ariaLabel="Normalize spectrum"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                selectedTool === "normalize"
                  ? "border-accent bg-gray-100 dark:bg-gray-700"
                  : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
              tooltip={{
                content:
                  "Normalize spectrum using bare atom absorption or 0-1 mapping",
                placement: "right",
                offset: 8,
              }}
            />
            <ToggleIconButton
              icon={
                <Mountain className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              }
              isActive={selectedTool === "peaks"}
              onClick={() => setSelectedTool("peaks")}
              ariaLabel="Identify peaks"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                selectedTool === "peaks"
                  ? "border-accent bg-gray-100 dark:bg-gray-700"
                  : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
              tooltip={{
                content:
                  "Identify peaks in spectrum using automatic detection or manual entry",
                placement: "right",
                offset: 8,
              }}
              badge={{
                content: peaks.length,
                color: "primary",
                size: "sm",
                isInvisible: peaks.length === 0,
                shape: "rectangle",
                showOutline: true,
                className:
                  "relative [&_.badge]:bg-white [&_.badge]:text-gray-900 [&_.badge]:text-[10px] [&_.badge]:font-semibold [&_.badge]:h-4 [&_.badge]:min-w-4 [&_.badge]:px-1 [&_.badge]:rounded-full [&_.badge]:border [&_.badge]:border-gray-900 dark:[&_.badge]:border-gray-100",
              }}
            />
            <ToggleIconButton
              text="Δϴ"
              isActive={selectedTool === "difference"}
              onClick={() => setSelectedTool("difference")}
              ariaLabel="Difference spectra"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                selectedTool === "difference"
                  ? "border-accent bg-gray-100 dark:bg-gray-700"
                  : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
              tooltip={{
                content:
                  "Calculate difference spectra for pairs of incident angles",
                placement: "right",
                offset: 8,
              }}
            />
          </div>
        ) : (
          <>
            {/* Horizontal Icon Toolbar */}
            <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
              <ToggleIconButton
                icon={
                  <Cog6ToothIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                }
                isActive={selectedTool === "config"}
                onClick={() => setSelectedTool("config")}
                ariaLabel="Configuration"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  selectedTool === "config"
                    ? "border-accent bg-gray-100 dark:bg-gray-700"
                    : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
                tooltip={{
                  content: "Configure molecule, instrument, and edge",
                  placement: "top",
                  offset: 8,
                }}
              />
              <ToggleIconButton
                icon={
                  <Square3Stack3DIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                }
                isActive={selectedTool === "normalize"}
                onClick={() => setSelectedTool("normalize")}
                ariaLabel="Normalize spectrum"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  selectedTool === "normalize"
                    ? "border-accent bg-gray-100 dark:bg-gray-700"
                    : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
                tooltip={{
                  content:
                    "Normalize spectrum using bare atom absorption or 0-1 mapping",
                  placement: "top",
                  offset: 8,
                }}
              />
              <ToggleIconButton
                icon={
                  <Mountain className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                }
                isActive={selectedTool === "peaks"}
                onClick={() => setSelectedTool("peaks")}
                ariaLabel="Identify peaks"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  selectedTool === "peaks"
                    ? "border-accent bg-gray-100 dark:bg-gray-700"
                    : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
                tooltip={{
                  content:
                    "Identify peaks in spectrum using automatic detection or manual entry",
                  placement: "top",
                  offset: 8,
                }}
                badge={{
                  content: peaks.length,
                  color: "primary",
                  size: "sm",
                  isInvisible: peaks.length === 0,
                  shape: "rectangle",
                  showOutline: true,
                  className:
                    "relative [&_.badge]:bg-white [&_.badge]:text-gray-900 [&_.badge]:text-[10px] [&_.badge]:font-semibold [&_.badge]:h-4 [&_.badge]:min-w-4 [&_.badge]:px-1 [&_.badge]:rounded-full [&_.badge]:border [&_.badge]:border-gray-900 dark:[&_.badge]:border-gray-100",
                }}
              />
              <ToggleIconButton
                text="Δϴ"
                isActive={selectedTool === "difference"}
                onClick={() => setSelectedTool("difference")}
                ariaLabel="Difference spectra"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  selectedTool === "difference"
                    ? "border-accent bg-gray-100 dark:bg-gray-700"
                    : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
                tooltip={{
                  content:
                    "Calculate difference spectra for pairs of incident angles",
                  placement: "top",
                  offset: 8,
                }}
              />
            </div>
          </>
        )}

        {!hasMolecule && selectedTool === "normalize" && !isCollapsed && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Select a molecule</strong> to enable normalization
                tools.
              </span>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selectedTool === "config" && (
              <ScrollShadow hideScrollBar className="flex-1 overflow-y-auto">
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Configuration
                  </h3>
                  <div className="space-y-3">
                    {onMoleculeSearchTermChange && (
                      <div>
                        <MoleculeSelector
                          searchTerm={moleculeSearchTerm ?? ""}
                          setSearchTerm={onMoleculeSearchTermChange}
                          suggestions={moleculeSuggestions ?? []}
                          manualResults={moleculeManualResults ?? []}
                          suggestionError={moleculeSuggestionError ?? null}
                          manualError={moleculeManualError ?? null}
                          isSuggesting={isMoleculeSuggesting ?? false}
                          isManualSearching={isMoleculeManualSearching ?? false}
                          selectedMolecule={selectedMolecule ?? null}
                          selectedPreferredName={
                            selectedMoleculePreferredName ?? ""
                          }
                          setSelectedPreferredName={
                            onSelectedMoleculePreferredNameChange ?? noopString
                          }
                          allMoleculeNames={allMoleculeNames ?? []}
                          onUseMolecule={onUseMolecule ?? noopMolecule}
                          onManualSearch={onMoleculeManualSearch ?? noop}
                          moleculeLocked={moleculeLocked ?? false}
                          onToggleLock={onToggleMoleculeLock ?? noop}
                        />
                        {selectedMolecule && !edgeAtomMatches && edgeId && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                            <div className="flex items-start gap-2">
                              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p className="font-medium">
                                  Edge atom does not match molecule composition
                                </p>
                                <p className="mt-1">
                                  Selected edge target atom (
                                  {selectedEdge?.targetatom}) is not present in{" "}
                                  {selectedMolecule.commonName} (
                                  {selectedMolecule.chemicalFormula}). Please
                                  select an edge for an atom present in the
                                  molecule.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Instrument <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={instrumentId ?? ""}
                        onChange={(e) => onInstrumentChange?.(e.target.value)}
                        className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      >
                        <option value="">Select instrument...</option>
                        {instrumentOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                            {opt.facilityName ? ` (${opt.facilityName})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Edge <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={edgeId ?? ""}
                        onChange={(e) => onEdgeChange?.(e.target.value)}
                        className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      >
                        <option value="">Select edge...</option>
                        {(availableEdgeOptions ?? edgeOptions).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.targetatom} {opt.corestate}-edge
                          </option>
                        ))}
                      </select>
                    </div>
                    {onAddFacility && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAddFacility}
                        className="w-full text-xs"
                      >
                        Add Facility/Instrument
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollShadow>
            )}
            {selectedTool === "normalize" && (
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Normalization
                </h3>
                {/* Normalization Type Selector */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Normalization Method
                  </label>
                  <select
                    value={normalizationType}
                    onChange={(e) =>
                      onNormalizationTypeChange(
                        e.target.value as NormalizationType,
                      )
                    }
                    disabled={normalizationLocked}
                    className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="bare-atom">Bare Atom</option>
                    <option value="zero-one">Absolute</option>
                  </select>
                  {normalizationType === "bare-atom" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Normalizes using bare atom absorption reference
                    </p>
                  )}
                  {normalizationType === "zero-one" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Maps pre-edge to 0 and post-edge to 1 (absolute
                      normalization)
                    </p>
                  )}
                </div>

                {/* Three Toggle Buttons: Pre Edge, Post Edge, Lock */}
                <div className="flex items-center gap-2">
                  {/* Pre Edge Button */}
                  <SubToolButton
                    icon={<ArrowLeftToLine className="h-4 w-4" />}
                    label="Pre"
                    tooltip="Select pre-edge region"
                    isActive={isSelectingPreEdge}
                    onClick={onPreEdgeSelect}
                    disabled={!hasMolecule || !hasData}
                  />

                  {/* Post Edge Button */}
                  <SubToolButton
                    icon={<ArrowRightToLine className="h-4 w-4" />}
                    label="Post"
                    tooltip="Select post-edge region"
                    isActive={isSelectingPostEdge}
                    onClick={onPostEdgeSelect}
                    disabled={!hasMolecule || !hasData}
                  />

                  {/* Lock Button */}
                  {hasNormalization && (
                    <SubToolButton
                      icon={
                        normalizationLocked ? (
                          <LockClosedIcon className="h-4 w-4" />
                        ) : (
                          <LockOpenIcon className="h-4 w-4" />
                        )
                      }
                      tooltip={
                        normalizationLocked
                          ? "Unlock normalization"
                          : "Lock normalization"
                      }
                      isActive={normalizationLocked}
                      onClick={onToggleLock}
                      disabled={!hasNormalization}
                      iconOnly
                    />
                  )}
                </div>

                {/* Pre Edge Min/Max Inputs */}
                {isSelectingPreEdge && normalizationRegions.pre && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Min (eV)
                      </label>
                      <Input
                        type="number"
                        variant="secondary"
                        value={
                          Math.round(normalizationRegions.pre[0] * 100) / 100
                        }
                        onChange={(e) =>
                          handlePreEdgeRangeChange(
                            0,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        step={0.01}
                        min={0}
                        className="w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Max (eV)
                      </label>
                      <Input
                        type="number"
                        variant="secondary"
                        value={
                          Math.round(normalizationRegions.pre[1] * 100) / 100
                        }
                        onChange={(e) =>
                          handlePreEdgeRangeChange(
                            1,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        step={0.01}
                        min={0}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Post Edge Min/Max Inputs */}
                {isSelectingPostEdge && normalizationRegions.post && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Min (eV)
                      </label>
                      <Input
                        type="number"
                        variant="secondary"
                        value={
                          Math.round(normalizationRegions.post[0] * 100) / 100
                        }
                        onChange={(e) =>
                          handlePostEdgeRangeChange(
                            0,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        step={0.01}
                        min={0}
                        className="w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Max (eV)
                      </label>
                      <Input
                        type="number"
                        variant="secondary"
                        value={
                          Math.round(normalizationRegions.post[1] * 100) / 100
                        }
                        onChange={(e) =>
                          handlePostEdgeRangeChange(
                            1,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        step={0.01}
                        min={0}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTool === "peaks" && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 pt-2">
                <h3 className="shrink-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Peak Detection
                </h3>
                <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Peak assignments are subjective.</span>
                  </div>
                </div>
                {/* Geometry Selector for Peak Visualization */}
                {(() => {
                  const pointsToCheck = normalizedPoints ?? spectrumPoints;
                  const geometries = new Map<
                    string,
                    { theta?: number; phi?: number; label: string }
                  >();
                  pointsToCheck.forEach((point) => {
                    const hasGeometry =
                      typeof point.theta === "number" &&
                      Number.isFinite(point.theta) &&
                      typeof point.phi === "number" &&
                      Number.isFinite(point.phi);
                    const key = hasGeometry
                      ? `${point.theta}:${point.phi}`
                      : "fixed";
                    if (!geometries.has(key)) {
                      const thetaLabel =
                        typeof point.theta === "number" &&
                        Number.isFinite(point.theta)
                          ? `θ=${point.theta.toFixed(1)}°`
                          : null;
                      const phiLabel =
                        typeof point.phi === "number" &&
                        Number.isFinite(point.phi)
                          ? `φ=${point.phi.toFixed(1)}°`
                          : null;
                      const label =
                        thetaLabel || phiLabel
                          ? [thetaLabel, phiLabel].filter(Boolean).join(", ")
                          : "Fixed Geometry";
                      geometries.set(key, {
                        theta: point.theta,
                        phi: point.phi,
                        label,
                      });
                    }
                  });
                  const geometryArray = Array.from(geometries.values());
                  if (geometryArray.length > 1) {
                    return (
                      <div className="shrink-0">
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Geometry for Peak Fitting
                        </label>
                        <select
                          value={
                            selectedGeometry
                              ? `${selectedGeometry.theta ?? ""}:${selectedGeometry.phi ?? ""}`
                              : "none"
                          }
                          onChange={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.target.value === "none") {
                              onSelectedGeometryChange?.(null);
                            } else {
                              const [thetaStr, phiStr] =
                                e.target.value.split(":");
                              const theta =
                                thetaStr && thetaStr !== ""
                                  ? parseFloat(thetaStr)
                                  : undefined;
                              const phi =
                                phiStr && phiStr !== ""
                                  ? parseFloat(phiStr)
                                  : undefined;
                              onSelectedGeometryChange?.({ theta, phi });
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                          <option value="none">Select geometry...</option>
                          {geometryArray.map((geo, idx) => {
                            const value = `${geo.theta ?? ""}:${geo.phi ?? ""}`;
                            return (
                              <option key={idx} value={value}>
                                {geo.label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="flex shrink-0 flex-col gap-3">
                  <div className="flex gap-2">
                    <SubToolButton
                      icon={<PencilIcon className="h-4 w-4" />}
                      tooltip="Click on plot to add peaks manually"
                      isActive={peakDetectionMode === "manual"}
                      onClick={handleManualPeakMode}
                      disabled={spectrumPoints.length === 0}
                      iconOnly
                    />
                    <SubToolButton
                      icon={<SparklesIcon className="h-4 w-4" />}
                      tooltip="Auto-detect peaks"
                      isActive={peakDetectionMode === "auto"}
                      onClick={handleAutoDetectPeaks}
                      disabled={spectrumPoints.length === 0}
                      iconOnly
                    />
                    <SubToolButton
                      icon={<TrashIcon className="h-4 w-4" />}
                      tooltip="Clear all peaks"
                      isActive={false}
                      onClick={handleClearAllPeaks}
                      disabled={peaks.length === 0}
                      iconOnly
                    />
                  </div>

                  {/* Peak Detection Settings - shown only when auto-detect mode is active */}
                  {peakDetectionMode === "auto" && (
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                      <Tooltip delay={0}>
                        <label className="mb-2 block cursor-help text-xs font-medium text-gray-700 dark:text-gray-300">
                          Prominence:{" "}
                          {(peakParams.minProminence ?? 0.05).toFixed(2)}
                        </label>
                        <Tooltip.Content
                          placement="top"
                          className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg dark:bg-gray-700 dark:text-gray-100"
                        >
                          Minimum prominence as fraction of max intensity
                        </Tooltip.Content>
                      </Tooltip>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 py-2">
                          <Slider
                            step={0.01}
                            minValue={0}
                            maxValue={1}
                            value={peakParams.minProminence ?? 0.05}
                            onChange={(value) => {
                              const numValue =
                                typeof value === "number"
                                  ? value
                                  : Array.isArray(value) && value.length > 0
                                    ? value[0]
                                    : 0.05;
                              if (
                                typeof numValue === "number" &&
                                Number.isFinite(numValue)
                              ) {
                                setPeakParams({
                                  ...peakParams,
                                  minProminence: numValue,
                                });
                              }
                            }}
                            className="w-full"
                          >
                            <Slider.Track className="h-2 bg-gray-200 dark:bg-gray-700">
                              <Slider.Fill className="bg-accent" />
                              <Slider.Thumb className="bg-accent border-accent h-4 w-4 cursor-pointer border-2" />
                            </Slider.Track>
                          </Slider>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => runPeakDetection()}
                          isDisabled={spectrumPoints.length === 0}
                          className="shrink-0"
                        >
                          Go
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <ScrollShadow
                    hideScrollBar
                    className="flex-1 overflow-y-auto"
                  >
                    <div className="space-y-2">
                      {/* Step peak - always at the top */}
                      {(() => {
                        const stepPeak = peaks.find((p) => p.isStep);
                        if (!stepPeak) {
                          // Create a template step peak display if none exists
                          return (
                            <div
                              className={`relative flex flex-col rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50`}
                            >
                              <div className="relative flex h-7 items-center gap-1.5 rounded-lg bg-gray-300 px-1.5 dark:bg-gray-600">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const templateId = "step-peak-template";
                                    togglePeakExpansion(templateId);
                                  }}
                                  className="shrink-0 rounded p-0.5 text-gray-600 hover:bg-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-500 dark:hover:text-gray-100"
                                  title="Expand"
                                  aria-label="Expand"
                                >
                                  {expandedPeakIds.has("step-peak-template") ? (
                                    <ChevronUpIcon className="h-3 w-3" />
                                  ) : (
                                    <ChevronDownIcon className="h-3 w-3" />
                                  )}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="px-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Step
                                  </div>
                                </div>
                              </div>
                              {expandedPeakIds.has("step-peak-template") && (
                                <div className="border-t border-gray-200 p-1.5 dark:border-gray-700">
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Step function parameters (template)
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div key={stepPeak.id ?? "step-peak"}>
                            {(() => {
                              const peakId =
                                "id" in stepPeak &&
                                typeof (stepPeak as { id?: string }).id ===
                                  "string"
                                  ? (stepPeak as { id: string }).id
                                  : "step-peak";
                              const isSelected = selectedPeakId === peakId;
                              const isExpanded = expandedPeakIds.has(peakId);
                              return (
                                <div
                                  className={`relative flex flex-col rounded-lg border ${
                                    isSelected
                                      ? "border-accent bg-accent/5 dark:border-accent dark:bg-accent/10"
                                      : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
                                  }`}
                                >
                                  {/* Compact top bar with Energy input, expand button, and X button */}
                                  <div className="relative flex h-7 items-center gap-1.5 rounded-lg bg-gray-300 px-1.5 dark:bg-gray-600">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePeakExpansion(peakId);
                                      }}
                                      className="shrink-0 rounded p-0.5 text-gray-600 hover:bg-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-500 dark:hover:text-gray-100"
                                      title={isExpanded ? "Collapse" : "Expand"}
                                      aria-label={
                                        isExpanded ? "Collapse" : "Expand"
                                      }
                                    >
                                      {isExpanded ? (
                                        <ChevronUpIcon className="h-3 w-3" />
                                      ) : (
                                        <ChevronDownIcon className="h-3 w-3" />
                                      )}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <div className="px-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Step
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expandable section with Step parameters */}
                                  {isExpanded && (
                                    <div className="border-t border-gray-200 p-1.5 dark:border-gray-700">
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Step function parameters (template)
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}

                      {peaks.filter((p) => !p.isStep).length === 0 &&
                        !isAddingPeak && (
                          <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                            No peaks identified. Click &quot;Auto-detect&quot;
                            or add manually.
                          </div>
                        )}

                      {peaks.filter((p) => !p.isStep).length > 0 && (
                        <div className="space-y-2">
                          {peaks
                            .filter((p) => !p.isStep)
                            .map((peak) => {
                              // Find the actual index in the full peaks array
                              const actualIndex = peaks.indexOf(peak);
                              const peakId =
                                "id" in peak &&
                                typeof (peak as { id?: string }).id === "string"
                                  ? (peak as { id: string }).id
                                  : `peak-${actualIndex}`;
                              const isSelected = selectedPeakId === peakId;
                              const isExpanded = expandedPeakIds.has(peakId);
                              return (
                                <div
                                  key={peakId}
                                  className={`relative flex flex-col rounded-lg border ${
                                    isSelected
                                      ? "border-accent bg-accent/5 dark:border-accent dark:bg-accent/10"
                                      : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
                                  }`}
                                >
                                  {/* Compact top bar with Energy input, expand button, and X button */}
                                  <div className="relative flex h-7 items-center gap-1.5 rounded-lg bg-gray-300 px-1.5 dark:bg-gray-600">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePeakExpansion(peakId);
                                      }}
                                      className="shrink-0 rounded p-0.5 text-gray-600 hover:bg-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-500 dark:hover:text-gray-100"
                                      title={isExpanded ? "Collapse" : "Expand"}
                                      aria-label={
                                        isExpanded ? "Collapse" : "Expand"
                                      }
                                    >
                                      {isExpanded ? (
                                        <ChevronUpIcon className="h-3 w-3" />
                                      ) : (
                                        <ChevronDownIcon className="h-3 w-3" />
                                      )}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <div className="relative w-full">
                                        <Input
                                          type="number"
                                          variant="secondary"
                                          value={
                                            Math.round(peak.energy * 100) / 100
                                          }
                                          onChange={(e) => {
                                            const rounded =
                                              Math.round(
                                                parseFloat(e.target.value) *
                                                  100,
                                              ) / 100;
                                            if (Number.isFinite(rounded)) {
                                              const actualIndex =
                                                peaks.indexOf(peak);
                                              if (actualIndex !== -1) {
                                                handleUpdatePeak(actualIndex, {
                                                  energy: rounded,
                                                });
                                              }
                                            }
                                          }}
                                          step={0.01}
                                          min={0}
                                          className="h-6 w-full bg-transparent py-0 pr-8 text-xs text-gray-900 dark:text-gray-100"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 pr-0.5 text-xs text-gray-600 dark:text-gray-300">
                                          eV
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePeak(actualIndex);
                                      }}
                                      className="shrink-0 rounded p-0.5 text-gray-600 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                      title="Delete peak"
                                      aria-label="Delete peak"
                                    >
                                      <XMarkIcon className="h-3 w-3" />
                                    </button>
                                  </div>

                                  {/* Expandable section with Bond, Transition, Amplitude, and Width */}
                                  {isExpanded && (
                                    <div className="border-t border-gray-200 p-1.5 dark:border-gray-700">
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {addingCustomBondForPeak ===
                                        actualIndex ? (
                                          <div className="flex gap-1">
                                            <input
                                              type="text"
                                              value={newCustomBondValue}
                                              onChange={(e) =>
                                                setNewCustomBondValue(
                                                  e.target.value,
                                                )
                                              }
                                              onBlur={() => {
                                                if (
                                                  newCustomBondValue.trim() &&
                                                  !customBonds.includes(
                                                    newCustomBondValue.trim(),
                                                  )
                                                ) {
                                                  setCustomBonds([
                                                    ...customBonds,
                                                    newCustomBondValue.trim(),
                                                  ]);
                                                }
                                                if (newCustomBondValue.trim()) {
                                                  handleUpdatePeak(
                                                    actualIndex,
                                                    {
                                                      bond: newCustomBondValue.trim(),
                                                    },
                                                  );
                                                }
                                                setAddingCustomBondForPeak(
                                                  null,
                                                );
                                                setNewCustomBondValue("");
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.currentTarget.blur();
                                                } else if (e.key === "Escape") {
                                                  setAddingCustomBondForPeak(
                                                    null,
                                                  );
                                                  setNewCustomBondValue("");
                                                }
                                              }}
                                              autoFocus
                                              placeholder="Enter bond type"
                                              className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            />
                                          </div>
                                        ) : (
                                          <select
                                            value={peak.bond ?? ""}
                                            onChange={(e) => {
                                              if (
                                                e.target.value === "__add_new__"
                                              ) {
                                                setAddingCustomBondForPeak(
                                                  actualIndex,
                                                );
                                                setNewCustomBondValue("");
                                              } else {
                                                handleUpdatePeak(actualIndex, {
                                                  bond:
                                                    e.target.value || undefined,
                                                });
                                              }
                                            }}
                                            className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <option value="" disabled>
                                              Bond
                                            </option>
                                            {getAllBondOptions().map((opt) => (
                                              <option
                                                key={opt.value}
                                                value={opt.value}
                                              >
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                        {addingCustomTransitionForPeak ===
                                        actualIndex ? (
                                          <div className="flex gap-1">
                                            <input
                                              type="text"
                                              value={newCustomTransitionValue}
                                              onChange={(e) =>
                                                setNewCustomTransitionValue(
                                                  e.target.value,
                                                )
                                              }
                                              onBlur={() => {
                                                if (
                                                  newCustomTransitionValue.trim() &&
                                                  !customTransitions.includes(
                                                    newCustomTransitionValue.trim(),
                                                  )
                                                ) {
                                                  setCustomTransitions([
                                                    ...customTransitions,
                                                    newCustomTransitionValue.trim(),
                                                  ]);
                                                }
                                                if (
                                                  newCustomTransitionValue.trim()
                                                ) {
                                                  handleUpdatePeak(
                                                    actualIndex,
                                                    {
                                                      transition:
                                                        newCustomTransitionValue.trim(),
                                                    },
                                                  );
                                                }
                                                setAddingCustomTransitionForPeak(
                                                  null,
                                                );
                                                setNewCustomTransitionValue("");
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.currentTarget.blur();
                                                } else if (e.key === "Escape") {
                                                  setAddingCustomTransitionForPeak(
                                                    null,
                                                  );
                                                  setNewCustomTransitionValue(
                                                    "",
                                                  );
                                                }
                                              }}
                                              autoFocus
                                              placeholder="Enter transition type"
                                              className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            />
                                          </div>
                                        ) : (
                                          <select
                                            value={peak.transition ?? ""}
                                            onChange={(e) => {
                                              if (
                                                e.target.value === "__add_new__"
                                              ) {
                                                setAddingCustomTransitionForPeak(
                                                  actualIndex,
                                                );
                                                setNewCustomTransitionValue("");
                                              } else {
                                                handleUpdatePeak(actualIndex, {
                                                  transition:
                                                    e.target.value || undefined,
                                                });
                                              }
                                            }}
                                            className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <option value="" disabled>
                                              Transition
                                            </option>
                                            {getAllTransitionOptions().map(
                                              (opt) => (
                                                <option
                                                  key={opt.value}
                                                  value={opt.value}
                                                >
                                                  {opt.label}
                                                </option>
                                              ),
                                            )}
                                          </select>
                                        )}
                                        <Input
                                          type="number"
                                          variant="secondary"
                                          value={
                                            peak.amplitude?.toString() ?? ""
                                          }
                                          onChange={(e) => {
                                            const numValue = parseFloat(
                                              e.target.value,
                                            );
                                            if (
                                              typeof numValue === "number" &&
                                              Number.isFinite(numValue)
                                            ) {
                                              handleUpdatePeak(actualIndex, {
                                                amplitude: numValue,
                                              });
                                            }
                                          }}
                                          step={0.01}
                                          min={0}
                                          placeholder="Amp"
                                          className="focus:border-accent focus:ring-accent/20 h-7 max-h-7 min-h-7 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500! focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400!"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <Input
                                          type="number"
                                          variant="secondary"
                                          value={peak.width?.toString() ?? ""}
                                          onChange={(e) => {
                                            const numValue = parseFloat(
                                              e.target.value,
                                            );
                                            if (
                                              typeof numValue === "number" &&
                                              Number.isFinite(numValue)
                                            ) {
                                              handleUpdatePeak(actualIndex, {
                                                width: numValue,
                                              });
                                            }
                                          }}
                                          step={0.1}
                                          min={0}
                                          placeholder="Width"
                                          className="focus:border-accent focus:ring-accent/20 h-7 max-h-7 min-h-7 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500! focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400!"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {isAddingPeak && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                Energy (eV){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Energy (eV)
                                </label>
                                <Input
                                  type="number"
                                  variant="secondary"
                                  value={newPeakEnergy ?? ""}
                                  onChange={(e) =>
                                    setNewPeakEnergy(e.target.value)
                                  }
                                  step={0.01}
                                  min={0}
                                  placeholder="e.g., 285.0"
                                  className="w-full text-xs"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Bond
                                </label>
                                {addingCustomBondInForm ? (
                                  <input
                                    type="text"
                                    value={newFormBondValue}
                                    onChange={(e) =>
                                      setNewFormBondValue(e.target.value)
                                    }
                                    onBlur={() => {
                                      if (
                                        newFormBondValue.trim() &&
                                        !customBonds.includes(
                                          newFormBondValue.trim(),
                                        )
                                      ) {
                                        setCustomBonds([
                                          ...customBonds,
                                          newFormBondValue.trim(),
                                        ]);
                                      }
                                      if (newFormBondValue.trim()) {
                                        setNewPeakBond(newFormBondValue.trim());
                                      }
                                      setAddingCustomBondInForm(false);
                                      setNewFormBondValue("");
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                      } else if (e.key === "Escape") {
                                        setAddingCustomBondInForm(false);
                                        setNewFormBondValue("");
                                      }
                                    }}
                                    autoFocus
                                    placeholder="Enter bond type"
                                    className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                  />
                                ) : (
                                  <select
                                    value={newPeakBond}
                                    onChange={(e) => {
                                      if (e.target.value === "__add_new__") {
                                        setAddingCustomBondInForm(true);
                                        setNewFormBondValue("");
                                      } else {
                                        setNewPeakBond(e.target.value);
                                      }
                                    }}
                                    className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                  >
                                    <option value="">Select bond...</option>
                                    {getAllBondOptions().map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Transition
                                </label>
                                {addingCustomTransitionInForm ? (
                                  <input
                                    type="text"
                                    value={newFormTransitionValue}
                                    onChange={(e) =>
                                      setNewFormTransitionValue(e.target.value)
                                    }
                                    onBlur={() => {
                                      if (
                                        newFormTransitionValue.trim() &&
                                        !customTransitions.includes(
                                          newFormTransitionValue.trim(),
                                        )
                                      ) {
                                        setCustomTransitions([
                                          ...customTransitions,
                                          newFormTransitionValue.trim(),
                                        ]);
                                      }
                                      if (newFormTransitionValue.trim()) {
                                        setNewPeakTransition(
                                          newFormTransitionValue.trim(),
                                        );
                                      }
                                      setAddingCustomTransitionInForm(false);
                                      setNewFormTransitionValue("");
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                      } else if (e.key === "Escape") {
                                        setAddingCustomTransitionInForm(false);
                                        setNewFormTransitionValue("");
                                      }
                                    }}
                                    autoFocus
                                    placeholder="Enter transition type"
                                    className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                  />
                                ) : (
                                  <select
                                    value={newPeakTransition}
                                    onChange={(e) => {
                                      if (e.target.value === "__add_new__") {
                                        setAddingCustomTransitionInForm(true);
                                        setNewFormTransitionValue("");
                                      } else {
                                        setNewPeakTransition(e.target.value);
                                      }
                                    }}
                                    className="focus:border-accent focus:ring-accent/20 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                  >
                                    <option value="">
                                      Select transition...
                                    </option>
                                    {getAllTransitionOptions().map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Amp
                                </label>
                                <Input
                                  type="number"
                                  variant="secondary"
                                  value={newPeakAmplitude?.toString() ?? ""}
                                  onChange={(e) => {
                                    const numValue = parseFloat(e.target.value);
                                    setNewPeakAmplitude(
                                      typeof numValue === "number" &&
                                        Number.isFinite(numValue)
                                        ? numValue
                                        : undefined,
                                    );
                                  }}
                                  step={0.01}
                                  min={0}
                                  placeholder="Amp"
                                  className="focus:border-accent focus:ring-accent/20 h-7 max-h-7 min-h-7 w-full text-xs text-gray-500! dark:text-gray-400!"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Width
                                </label>
                                <Input
                                  type="number"
                                  variant="secondary"
                                  value={newPeakWidth?.toString() ?? ""}
                                  onChange={(e) => {
                                    const numValue = parseFloat(e.target.value);
                                    setNewPeakWidth(
                                      typeof numValue === "number" &&
                                        Number.isFinite(numValue)
                                        ? numValue
                                        : undefined,
                                    );
                                  }}
                                  step={0.1}
                                  min={0}
                                  placeholder="Width"
                                  className="focus:border-accent focus:ring-accent/20 h-7 max-h-7 min-h-7 w-full text-xs text-gray-500! dark:text-gray-400!"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={handleAddPeak}
                                isDisabled={
                                  !newPeakEnergy ||
                                  !Number.isFinite(parseFloat(newPeakEnergy))
                                }
                                className="flex-1"
                              >
                                Add
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsAddingPeak(false);
                                  setNewPeakEnergy("");
                                  setNewPeakBond("");
                                  setNewPeakTransition("");
                                  setNewPeakAmplitude(undefined);
                                  setNewPeakWidth(undefined);
                                  setAddingCustomBondInForm(false);
                                  setAddingCustomTransitionInForm(false);
                                  setNewFormBondValue("");
                                  setNewFormTransitionValue("");
                                }}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollShadow>
                </div>
              </div>
            )}

            {selectedTool === "difference" && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Difference Spectra
                </h3>
                <div className="shrink-0 space-y-3">
                  <div className="flex gap-2">
                    <SubToolButton
                      text="ϴ"
                      tooltip="Show theta-dependent data"
                      isActive={differenceMode === "theta"}
                      onClick={() => handleDifferenceMode("theta")}
                      disabled={
                        spectrumPoints.length === 0 ||
                        !hasThetaData ||
                        !hasMultipleThetas
                      }
                      iconOnly
                    />
                    <SubToolButton
                      text="Φ"
                      tooltip="Show phi-dependent data"
                      isActive={differenceMode === "phi"}
                      onClick={() => handleDifferenceMode("phi")}
                      disabled={
                        spectrumPoints.length === 0 ||
                        !hasPhiData ||
                        !hasMultiplePhis
                      }
                      iconOnly
                    />
                    <SubToolButton
                      text="Δϴ"
                      tooltip="Calculate polar (theta) difference spectra"
                      isActive={differenceMode === "delta-theta"}
                      onClick={() => handleDifferenceMode("delta-theta")}
                      disabled={
                        spectrumPoints.length === 0 ||
                        !hasThetaData ||
                        !hasMultipleThetas
                      }
                      iconOnly
                    />
                    <SubToolButton
                      text="ΔΦ"
                      tooltip="Calculate azimuthal (phi) difference spectra"
                      isActive={differenceMode === "delta-phi"}
                      onClick={() => handleDifferenceMode("delta-phi")}
                      disabled={
                        spectrumPoints.length === 0 ||
                        !hasPhiData ||
                        !hasMultiplePhis
                      }
                      iconOnly
                    />
                  </div>

                  <ScrollShadow hideScrollBar className="max-h-[300px]">
                    <div className="space-y-2">
                      {differenceSpectra.length === 0 && (
                        <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                          Click θ or φ to calculate difference spectra.
                        </div>
                      )}

                      {differenceSpectra.length > 0 && (
                        <div className="space-y-2">
                          {differenceSpectra.map(
                            (spec: DifferenceSpectrum, index: number) => (
                              <div
                                key={index}
                                className={`relative flex items-center gap-2 rounded-lg border p-2 ${
                                  spec.preferred
                                    ? "border-accent bg-accent/5 dark:border-accent dark:bg-accent/10"
                                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleTogglePreferred(index)}
                                  className="shrink-0 text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400"
                                  title={
                                    spec.preferred
                                      ? "Remove preferred"
                                      : "Set as preferred"
                                  }
                                >
                                  <StarIcon
                                    className={`h-4 w-4 ${
                                      spec.preferred
                                        ? "fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400"
                                        : ""
                                    }`}
                                  />
                                </button>
                                <span className="flex-1 text-xs text-gray-700 dark:text-gray-300">
                                  {spec.label}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollShadow>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-detect Confirmation Dialog */}
      <SimpleDialog
        isOpen={showAutoDetectConfirm}
        onClose={() => setShowAutoDetectConfirm(false)}
        title="Confirm Peak Detection"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Peak detection is slow and under development. It may crash your
            browser.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAutoDetectConfirm(false)}
            >
              No
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmAutoDetect}
            >
              Yes
            </Button>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}
