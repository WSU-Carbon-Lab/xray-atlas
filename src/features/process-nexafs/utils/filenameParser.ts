export interface ParsedFilename {
  edge: string | null;
  experimentMode: string | null;
  facility: string | null;
  beamline: string | null;
  experimenter: string | null;
  vendorSlug: string | null;
  extraInfo: string | null;
  /** Optional molecule hint from `{mode}_{molecule}` basenames. */
  moleculeToken: string | null;
}

export type InstrumentMatchOption = {
  id: string;
  name: string;
  facilityName?: string;
};

export type ExperimentTypeFromFilename =
  | "TOTAL_ELECTRON_YIELD"
  | "PARTIAL_ELECTRON_YIELD"
  | "FLUORESCENT_YIELD"
  | "TRANSMISSION";

function emptyParsedFilename(): ParsedFilename {
  return {
    edge: null,
    experimentMode: null,
    facility: null,
    beamline: null,
    experimenter: null,
    vendorSlug: null,
    extraInfo: null,
    moleculeToken: null,
  };
}

/**
 * Returns true when `fileName` is a spectrum upload candidate (CSV or JSON only).
 */
export function isSpectrumUploadFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".csv") || lower.endsWith(".json");
}

/**
 * Builds molecule autosuggest lookup tokens from a filename fragment
 * (for example `ZnPcSi` → `ZnPcSi`, `ZnPc`).
 */
export function moleculeLookupTokens(token: string): string[] {
  const cleaned = token.trim();
  if (!cleaned) return [];
  const tokens = [cleaned];
  let stripped = cleaned;
  if (stripped.endsWith("CSi")) {
    stripped = stripped.slice(0, -3);
  } else if (stripped.endsWith("Si") || stripped.endsWith("si")) {
    stripped = stripped.slice(0, -2);
  } else if (/[a-z]C$/.test(stripped)) {
    stripped = stripped.slice(0, -1);
  }
  if (
    stripped.length >= 2 &&
    stripped.toLowerCase() !== cleaned.toLowerCase()
  ) {
    tokens.push(stripped);
  }
  return tokens;
}

function parseModeMoleculeBasename(baseName: string): ParsedFilename | null {
  const transmissionMatch = /^transmission[_\s-]+(.+)$/i.exec(baseName);
  if (transmissionMatch) {
    const moleculeToken = transmissionMatch[1]!.trim();
    return {
      ...emptyParsedFilename(),
      experimentMode: "TRANSMISSION",
      moleculeToken: moleculeToken || null,
    };
  }

  const teyPolarizationMatch = /^TEY\s+polarization[_\s-]+(.+)$/i.exec(baseName);
  if (teyPolarizationMatch) {
    const moleculeToken = teyPolarizationMatch[1]!.trim();
    return {
      ...emptyParsedFilename(),
      experimentMode: "TEY",
      moleculeToken: moleculeToken || null,
    };
  }

  const teyAngleMatch = /^TEY\s+angle[_\s-]+(.+)$/i.exec(baseName);
  if (teyAngleMatch) {
    const moleculeToken = teyAngleMatch[1]!.trim();
    return {
      ...emptyParsedFilename(),
      experimentMode: "TEY",
      moleculeToken: moleculeToken || null,
    };
  }

  return null;
}

/**
 * Parses a contribute spectrum basename into edge / mode / facility tokens.
 *
 * Supports Atlas six-token basenames and `{mode}_{molecule}` names such as
 * `transmission_ZnPc` (Beer-law / TRANSMISSION) and `TEY polarization_ZnPcSi`.
 */
export function parseNexafsFilename(filename: string): ParsedFilename {
  const baseName = filename.replace(/\.(csv|json)$/i, "").trim();
  const modeMolecule = parseModeMoleculeBasename(baseName);
  if (modeMolecule) {
    return modeMolecule;
  }

  const result = emptyParsedFilename();
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

  if (parts.length > 5) {
    result.vendorSlug = parts.slice(5).join("_");
  }

  if (parts.length >= 6) {
    result.extraInfo = parts.slice(5).join("_") ?? null;
  }

  return result;
}

/**
 * Maps a parsed filename experiment-mode token onto a contribute experiment type.
 */
export function experimentTypeFromParsedFilename(
  parsed: ParsedFilename,
): ExperimentTypeFromFilename | null {
  return experimentTypeFromModeToken(parsed.experimentMode);
}

function experimentTypeFromModeToken(
  modeToken: string | null,
): ExperimentTypeFromFilename | null {
  if (!modeToken) return null;
  const trimmed = modeToken.trim();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("TEY") || upper.includes("TOTAL ELECTRON")) {
    return "TOTAL_ELECTRON_YIELD";
  }
  if (upper.startsWith("PEY") || upper.includes("PARTIAL ELECTRON")) {
    return "PARTIAL_ELECTRON_YIELD";
  }
  if (upper.startsWith("FY") || upper.includes("FLUORESCEN")) {
    return "FLUORESCENT_YIELD";
  }
  if (upper.startsWith("TRANS") || upper.includes("TRANSMISSION")) {
    return "TRANSMISSION";
  }
  const normalized = normalizeExperimentMode(trimmed);
  if (
    normalized === "TOTAL_ELECTRON_YIELD" ||
    normalized === "PARTIAL_ELECTRON_YIELD" ||
    normalized === "FLUORESCENT_YIELD" ||
    normalized === "TRANSMISSION"
  ) {
    return normalized;
  }
  return null;
}

export function matchInstrumentIdFromParsedNexafsFilename(
  parsed: ParsedFilename,
  options: InstrumentMatchOption[],
): string | undefined {
  const beam = parsed.beamline?.trim();
  const normalizedFacility = normalizeFacilityToken(parsed.facility);
  const facNorm = normalizedFacility?.toUpperCase().replace(/\s+/g, "") ?? "";

  if (beam && facNorm) {
    const beamUpper = beam.toUpperCase().replace(/\s+/g, "");
    const hit = options.find((inst) => {
      const fn = inst.facilityName?.toUpperCase().replace(/\s+/g, "") ?? "";
      const facilityOk =
        fn === facNorm ||
        fn.includes(facNorm) ||
        facNorm.includes(fn);
      const inUpper = inst.name.toUpperCase().replace(/\s+/g, "");
      const beamOk =
        inUpper === beamUpper ||
        inUpper.includes(beamUpper) ||
        beamUpper.includes(inUpper);
      return facilityOk && beamOk;
    });
    if (hit) return hit.id;
  }

  if (beam) {
    const beamUpper = beam.toUpperCase().replace(/\s+/g, "");
    const byBeam = options.find((inst) => {
      const inUpper = inst.name.toUpperCase().replace(/\s+/g, "");
      return (
        inUpper === beamUpper ||
        inUpper.includes(beamUpper) ||
        beamUpper.includes(inUpper)
      );
    });
    if (byBeam) return byBeam.id;
  }

  if (normalizedFacility) {
    const parsedFac = normalizedFacility.toUpperCase().replace(/\s+/g, "");
    const byFac = options.find((inst) => {
      const fn = inst.facilityName?.toUpperCase().replace(/\s+/g, "") ?? "";
      return (
        fn === parsedFac ||
        fn.includes(parsedFac) ||
        parsedFac.includes(fn)
      );
    });
    if (byFac) return byFac.id;
  }

  return undefined;
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

  if (normalized.startsWith("TEY")) {
    return "TOTAL_ELECTRON_YIELD";
  }
  if (normalized.startsWith("PEY")) {
    return "PARTIAL_ELECTRON_YIELD";
  }
  if (normalized.startsWith("FY") || normalized.includes("FLUORESCEN")) {
    return "FLUORESCENT_YIELD";
  }
  if (normalized.startsWith("TRANS") || normalized.includes("TRANSMISSION")) {
    return "TRANSMISSION";
  }

  const modeMap: Record<string, string> = {
    TEY: "TOTAL_ELECTRON_YIELD",
    PEY: "PARTIAL_ELECTRON_YIELD",
    FY: "FLUORESCENT_YIELD",
    FLUORESCENT: "FLUORESCENT_YIELD",
    TOTAL: "TOTAL_ELECTRON_YIELD",
    PARTIAL: "PARTIAL_ELECTRON_YIELD",
    TRANSMISSION: "TRANSMISSION",
    TRANS: "TRANSMISSION",
  };

  return modeMap[normalized] ?? normalized;
}

export function normalizeFacilityToken(
  facility: string | null,
): string | null {
  if (!facility) return null;
  const t = facility.trim();
  if (!t) return null;

  const upperNoSpace = t.toUpperCase().replace(/\s+/g, "");

  const facilityMap: Record<string, string> = {
    ALS: "Advanced Light Source",
    NSLSII: "National Synchrotron Light Source II",
    ANSTO: "The Australian Synchrotron",
    ANSTRO: "The Australian Synchrotron",
  };

  return facilityMap[upperNoSpace] ?? t;
}

export function normalizeInstrumentName(
  facilityDisplayName: string | null,
  instrument: string | null,
): string | null {
  if (!instrument?.trim()) return null;
  const inst = instrument.trim();
  const fac = facilityDisplayName?.trim() ?? "";
  if (fac === "Advanced Light Source" && inst === "5.3.2") {
    return "Beamline 5.3.2.2";
  }
  return inst;
}
