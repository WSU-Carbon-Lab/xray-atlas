export interface ParsedFilename {
  edge: string | null;
  experimentMode: string | null;
  facility: string | null;
  beamline: string | null;
  experimenter: string | null;
  extraInfo: string | null;
}

export function parseNexafsFilename(filename: string): ParsedFilename {
  const result: ParsedFilename = {
    edge: null,
    experimentMode: null,
    facility: null,
    beamline: null,
    experimenter: null,
    extraInfo: null,
  };

  const baseName = filename.replace(/\.(csv|json)$/i, "");
  const parts = baseName.split("_");

  if (parts.length < 2) {
    return result;
  }

  result.edge = parts[0] ?? null;

  if (parts.length >= 2) {
    result.experimentMode = parts[1] ?? null;
  }

  if (parts.length >= 3) {
    result.facility = parts[2] ?? null;
  }

  if (parts.length >= 4) {
    result.beamline = parts[3] ?? null;
  }

  if (parts.length >= 5) {
    result.experimenter = parts[4] ?? null;
  }

  if (parts.length >= 6) {
    result.extraInfo = parts.slice(5).join("_") ?? null;
  }

  return result;
}

export function normalizeEdge(edge: string | null): string | null {
  if (!edge) return null;

  const normalized = edge.trim().toUpperCase();

  const edgeMap: Record<string, string> = {
    "C(K)": "C(K)",
    "CK": "C(K)",
    "C K": "C(K)",
    "N(K)": "N(K)",
    "NK": "N(K)",
    "N K": "N(K)",
    "O(K)": "O(K)",
    "OK": "O(K)",
    "O K": "O(K)",
    "F(K)": "F(K)",
    "FK": "F(K)",
    "F K": "F(K)",
  };

  return edgeMap[normalized] ?? normalized;
}

export function normalizeExperimentMode(mode: string | null): string | null {
  if (!mode) return null;

  const normalized = mode.trim().toUpperCase();

  const modeMap: Record<string, string> = {
    "TEY": "TOTAL_ELECTRON_YIELD",
    "PEY": "PARTIAL_ELECTRON_YIELD",
    "FY": "FLUORESCENT_YIELD",
    "FLUORESCENT": "FLUORESCENT_YIELD",
    "TOTAL": "TOTAL_ELECTRON_YIELD",
    "PARTIAL": "PARTIAL_ELECTRON_YIELD",
    "TRANSMISSION": "TRANSMISSION",
    "TRANS": "TRANSMISSION",
  };

  return modeMap[normalized] ?? normalized;
}
