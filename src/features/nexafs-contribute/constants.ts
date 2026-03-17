export const EXPERIMENT_TYPE_OPTIONS = [
  { value: "TOTAL_ELECTRON_YIELD", label: "Total Electron Yield" },
  { value: "PARTIAL_ELECTRON_YIELD", label: "Partial Electron Yield" },
  { value: "FLUORESCENT_YIELD", label: "Fluorescent Yield" },
  { value: "TRANSMISSION", label: "Transmission" },
] as const;

export const PROCESS_METHOD_OPTIONS = [
  { value: "DRY", label: "Dry" },
  { value: "SOLVENT", label: "Solvent" },
] as const;
