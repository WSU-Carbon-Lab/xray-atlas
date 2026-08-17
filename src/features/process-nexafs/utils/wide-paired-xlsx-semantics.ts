/**
 * Semantic parsing for wide paired-column NEXAFS workbooks.
 *
 * Owns sheet-name and column-header grammar for edge-labeled tabs such as
 * `{molecule}_{atom}_{shell}_edge_{technique}_{facility}_{beamline}` and
 * `{base}_{theta}deg` / `{base}_{theta}deg_En` column pairs. Facility and
 * beamline are opaque tokens so the same layout works across instruments
 * (ANSTO SXR, ALS, and others). Unpivots those pairs into long-format
 * contribute rows. Does not read xlsx bytes.
 */
import type { ParsedFilename } from "./filenameParser";
import {
  experimentTypeFromParsedFilename,
  normalizeEdge,
  normalizeFacilityToken,
  type ExperimentTypeFromFilename,
} from "./filenameParser";

/**
 * Canonical long-format column names produced when unpivoting wide
 * paired-column workbooks into NEXAFS contribute upload tables.
 */
export const WIDE_PAIRED_UPLOAD_COLUMNS = {
  energy: "energy",
  absorption: "mu",
  theta: "theta",
} as const;

/**
 * Parsed metadata from a wide paired-column sheet or column prefix token.
 * `facility` and `beamline` are raw tokens from the sheet name; display mapping
 * happens via {@link normalizeFacilityToken} when building autofill.
 */
export interface WidePairedSheetSemantics {
  readonly molecule: string;
  readonly targetAtom: string;
  readonly coreState: string;
  readonly edgeLabel: string;
  readonly technique: string;
  readonly facility: string;
  readonly beamline: string;
  readonly baseToken: string;
}

/**
 * One geometry trace identified from paired `_En` / signal column headers.
 */
export interface WidePairedGeometryColumnPair {
  readonly thetaDegrees: number;
  readonly energyColumn: string;
  readonly absorptionColumn: string;
  readonly baseToken: string;
}

/**
 * Parsed wide-format column header: geometry plus energy vs absorption role.
 */
export interface WidePairedColumnHeader {
  readonly baseToken: string;
  readonly thetaDegrees: number;
  readonly channel: "energy" | "absorption";
}

/**
 * Long-format contribute row after unpivoting one geometry pair.
 */
export interface WidePairedUploadRow {
  readonly energy: number;
  readonly mu: number;
  readonly theta: number;
}

const EDGE_LITERAL = "edge";

const TECHNIQUE_TOKENS = new Set(["tey", "pey", "fy", "trans", "transmission"]);

const WIDE_COLUMN_HEADER =
  /^(?<base>.+?)_(?<theta>\d+(?:\.\d+)?)deg(?<energySuffix>_En)?$/i;

/**
 * Parses `{molecule}_{atom}_{shell}_edge_{technique}_{facility}_{beamline}` sheet
 * names (for example `N2200_C_K_edge_TEY_ANSTO_SXR` or `ZnPc_C_K_edge_TEY_ALS_5322`).
 *
 * @param sheetName Workbook sheet tab label.
 * @returns Structured semantics, or `null` when the label does not match.
 */
export function parseWidePairedSheetName(
  sheetName: string,
): WidePairedSheetSemantics | null {
  const trimmed = sheetName.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("_");
  const edgeIdx = parts.findIndex(
    (part) => part.toLowerCase() === EDGE_LITERAL,
  );
  if (edgeIdx < 2 || edgeIdx + 3 >= parts.length) return null;

  const molecule = parts.slice(0, edgeIdx - 2).join("_");
  const targetAtom = parts[edgeIdx - 2];
  const coreState = parts[edgeIdx - 1];
  const technique = parts[edgeIdx + 1];
  const facility = parts[edgeIdx + 2];
  const beamline = parts.slice(edgeIdx + 3).join("_");

  if (
    !molecule ||
    !targetAtom ||
    !coreState ||
    !technique ||
    !facility ||
    !beamline
  ) {
    return null;
  }

  if (!TECHNIQUE_TOKENS.has(technique.toLowerCase())) return null;

  const edgeLabel =
    normalizeEdge(`${targetAtom}(${coreState})`) ??
    `${targetAtom}(${coreState})`;

  return {
    molecule,
    targetAtom,
    coreState,
    edgeLabel,
    technique,
    facility,
    beamline,
    baseToken: trimmed,
  };
}

/**
 * Parses a wide-format column header into geometry and channel role.
 *
 * @param header Column label such as `N2200_C_K_edge_TEY_ANSTO_SXR_30deg_En`.
 * @returns Parsed column semantics, or `null` when the header is not wide-format.
 */
export function parseWidePairedColumnHeader(
  header: string,
): WidePairedColumnHeader | null {
  const trimmed = header.trim();
  if (!trimmed) return null;

  const match = WIDE_COLUMN_HEADER.exec(trimmed);
  const baseToken = match?.groups?.base;
  const thetaToken = match?.groups?.theta;
  if (!baseToken || !thetaToken) return null;

  const thetaDegrees = Number.parseFloat(thetaToken);
  if (!Number.isFinite(thetaDegrees)) return null;

  return {
    baseToken,
    thetaDegrees,
    channel: match.groups?.energySuffix ? "energy" : "absorption",
  };
}

/**
 * Groups wide paired columns into geometry traces sorted by ascending theta.
 *
 * @param headers Header row labels from one worksheet.
 * @param expectedBaseToken When set, only pairs whose base token matches are kept.
 * @returns Ordered geometry pairs; empty when no valid pairs are found.
 */
export function pairWidePairedGeometryColumns(
  headers: readonly string[],
  expectedBaseToken?: string,
): WidePairedGeometryColumnPair[] {
  const energyByKey = new Map<
    string,
    WidePairedColumnHeader & { header: string }
  >();
  const absorptionByKey = new Map<
    string,
    WidePairedColumnHeader & { header: string }
  >();

  for (const header of headers) {
    const parsed = parseWidePairedColumnHeader(header);
    if (!parsed) continue;
    if (expectedBaseToken && parsed.baseToken !== expectedBaseToken) continue;

    const key = `${parsed.baseToken}::${parsed.thetaDegrees}`;
    const entry = { ...parsed, header };
    if (parsed.channel === "energy") {
      energyByKey.set(key, entry);
    } else {
      absorptionByKey.set(key, entry);
    }
  }

  const pairs: WidePairedGeometryColumnPair[] = [];
  for (const [key, energyEntry] of energyByKey) {
    const absorptionEntry = absorptionByKey.get(key);
    if (!absorptionEntry) continue;
    pairs.push({
      thetaDegrees: energyEntry.thetaDegrees,
      energyColumn: energyEntry.header,
      absorptionColumn: absorptionEntry.header,
      baseToken: energyEntry.baseToken,
    });
  }

  pairs.sort((a, b) => a.thetaDegrees - b.thetaDegrees);
  return pairs;
}

/**
 * Collects distinct wide-format base tokens from a header row.
 *
 * @param headers Header row labels from one worksheet.
 * @returns Unique base tokens in first-seen order.
 */
export function uniqueWidePairedBaseTokens(
  headers: readonly string[],
): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const header of headers) {
    const parsed = parseWidePairedColumnHeader(header);
    if (!parsed || seen.has(parsed.baseToken)) {
      continue;
    }
    seen.add(parsed.baseToken);
    tokens.push(parsed.baseToken);
  }
  return tokens;
}

/**
 * Parses sheet-name grammar from the first wide-format column prefix.
 *
 * @param headers Header row labels from one worksheet.
 * @returns Semantics when a prefix matches `{molecule}_{atom}_{shell}_edge_…`, otherwise `null`.
 */
export function parseWidePairedSemanticsFromHeaders(
  headers: readonly string[],
): WidePairedSheetSemantics | null {
  const tokens = uniqueWidePairedBaseTokens(headers);
  for (const token of tokens) {
    const semantics = parseWidePairedSheetName(token);
    if (semantics) {
      return semantics;
    }
  }
  return null;
}

/**
 * Builds a contributor-facing warning when the sheet tab and column prefixes
 * disagree on edge, technique, facility, or beamline.
 *
 * @param sheetName Workbook sheet tab label.
 * @param sheetSemantics Parsed sheet-tab semantics, or `null` when the tab does not match.
 * @param headerSemantics Parsed column-prefix semantics, or `null` when prefixes do not match.
 * @returns Warning text, or `null` when there is no disagreement to surface.
 */
export function widePairedSemanticsConflictMessage(
  sheetName: string,
  sheetSemantics: WidePairedSheetSemantics | null,
  headerSemantics: WidePairedSheetSemantics | null,
): string | null {
  if (!sheetSemantics || !headerSemantics) {
    return null;
  }
  if (
    sheetSemantics.edgeLabel === headerSemantics.edgeLabel &&
    sheetSemantics.technique.toLowerCase() ===
      headerSemantics.technique.toLowerCase() &&
    sheetSemantics.facility.toLowerCase() ===
      headerSemantics.facility.toLowerCase() &&
    sheetSemantics.beamline.toLowerCase() ===
      headerSemantics.beamline.toLowerCase()
  ) {
    return null;
  }
  return `Sheet tab "${sheetName}" is ${sheetSemantics.edgeLabel} ${sheetSemantics.technique} ${sheetSemantics.facility} ${sheetSemantics.beamline}, but columns are labeled ${headerSemantics.edgeLabel} ${headerSemantics.technique} ${headerSemantics.facility} ${headerSemantics.beamline}. Descriptors were filled from the column headers. Confirm edge, facility, and instrument before submitting.`;
}

/**
 * Extracts a molecule hint from workbook filenames such as `N2200 1.xlsx`.
 *
 * @param fileName Original workbook file name.
 * @returns Molecule token when present, otherwise `null`.
 */
export function moleculeTokenFromWidePairedWorkbookName(
  fileName: string,
): string | null {
  const base = fileName.replace(/\.xlsx$/i, "").trim();
  const match = /^(.+?)(?:\s+\d+)?$/.exec(base);
  const token = match?.[1]?.trim();
  if (token === undefined || token === "") return null;
  return token;
}

/**
 * Maps parsed wide sheet semantics onto contribute filename autofill tokens.
 *
 * @param semantics Parsed sheet metadata.
 * @param workbookMolecule Optional molecule hint from the workbook file name.
 * @returns `ParsedFilename` compatible with existing NEXAFS upload autofill.
 */
export function parsedFilenameFromWidePairedSemantics(
  semantics: WidePairedSheetSemantics,
  workbookMolecule?: string | null,
): ParsedFilename {
  return {
    edge: semantics.edgeLabel,
    experimentMode: semantics.technique,
    facility: normalizeFacilityToken(semantics.facility),
    beamline: semantics.beamline,
    experimenter: null,
    vendorSlug: null,
    extraInfo: null,
    moleculeToken: workbookMolecule ?? semantics.molecule,
  };
}

/**
 * Returns true when a worksheet name and header row match the wide pair layout.
 *
 * @param sheetName Workbook sheet tab label.
 * @param headers Header row labels.
 * @returns Whether the sheet can be unpivoted by {@link pairWidePairedGeometryColumns}.
 */
export function isWidePairedWorksheet(
  sheetName: string,
  headers: readonly string[],
): boolean {
  const semantics = parseWidePairedSheetName(sheetName);
  if (!semantics) return false;
  return pairWidePairedGeometryColumns(headers, semantics.baseToken).length > 0;
}

/**
 * Resolves contribute experiment type from wide sheet semantics.
 *
 * @param semantics Parsed sheet metadata.
 * @returns Normalized experiment type when mappable, otherwise `null`.
 */
export function experimentTypeFromWidePairedSemantics(
  semantics: WidePairedSheetSemantics,
): ExperimentTypeFromFilename | null {
  return experimentTypeFromParsedFilename(
    parsedFilenameFromWidePairedSemantics(semantics),
  );
}

function parseFiniteCell(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function cellAsStringOrNumber(
  value: string | number | undefined,
): string | number | null {
  if (typeof value === "number" || typeof value === "string") return value;
  return null;
}

/**
 * Unpivots wide paired-column rows into long-format upload records with theta geometry.
 *
 * @param wideRows Worksheet body rows keyed by original wide headers.
 * @param pairs Geometry column pairs from {@link pairWidePairedGeometryColumns}.
 * @returns Long rows using {@link WIDE_PAIRED_UPLOAD_COLUMNS} field names.
 */
export function unpivotWidePairedRowsToUploadFormat(
  wideRows: ReadonlyArray<Readonly<Record<string, string | number>>>,
  pairs: readonly WidePairedGeometryColumnPair[],
): WidePairedUploadRow[] {
  const longRows: WidePairedUploadRow[] = [];

  for (const row of wideRows) {
    for (const pair of pairs) {
      const energyCell = cellAsStringOrNumber(row[pair.energyColumn]);
      const absorptionCell = cellAsStringOrNumber(row[pair.absorptionColumn]);
      if (energyCell === null || absorptionCell === null) continue;

      const energy = parseFiniteCell(energyCell);
      const absorption = parseFiniteCell(absorptionCell);
      if (energy === null || absorption === null) continue;

      longRows.push({
        energy,
        mu: absorption,
        theta: pair.thetaDegrees,
      });
    }
  }

  return longRows;
}
