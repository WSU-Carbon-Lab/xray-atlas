export interface ParsedFilename {
  edge: string | null;
  experimentMode: string | null;
  facility: string | null;
  beamline: string | null;
  experimenter: string | null;
  vendorSlug: string | null;
  extraInfo: string | null;
}

export type InstrumentMatchOption = {
  id: string;
  name: string;
  facilityName?: string;
};

export function parseNexafsFilename(filename: string): ParsedFilename {
  const result: ParsedFilename = {
    edge: null,
    experimentMode: null,
    facility: null,
    beamline: null,
    experimenter: null,
    vendorSlug: null,
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

  if (parts.length > 5) {
    result.vendorSlug = parts.slice(5).join("_");
  }

  if (parts.length >= 6) {
    result.extraInfo = parts.slice(5).join("_") ?? null;
  }

  return result;
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
