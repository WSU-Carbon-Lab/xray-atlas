/**
 * Reads spectrum `.xlsx` workbooks via ordered format detectors and coerces
 * each sheet into its own NEXAFS contribute dataset.
 *
 * Wide paired-column edge-labeled sheets unpivot to long-format
 * (`energy`, `mu`, `theta`). Sheets that do not match that layout fall back to
 * a generic table so the contributor can map Energy / Absorption (and optional
 * geometry) in the existing column-mapping UI. Facility and beamline remain
 * free tokens.
 */
import * as XLSX from "xlsx";
import type { CSVColumnMappings } from "../types";
import { normalizeHeaderCell, rowToRecord } from "./csv";
import { detectAuxiliarySpectrumColumnNames } from "./auxiliarySpectrumColumns";
import {
  csvParseNeedsUserHelp,
  detectCsvParseChallenges,
  detectSpectrumColumnNames,
} from "./csvParseChallenge";
import type { ParsedFilename } from "./filenameParser";
import type { ExperimentTypeFromFilename } from "./filenameParser";
import { experimentTypeFromParsedFilename } from "./filenameParser";
import {
  WIDE_PAIRED_UPLOAD_COLUMNS,
  experimentTypeFromWidePairedSemantics,
  moleculeTokenFromWidePairedWorkbookName,
  pairWidePairedGeometryColumns,
  parseWidePairedSemanticsFromHeaders,
  parseWidePairedSheetName,
  parsedFilenameFromWidePairedSemantics,
  type WidePairedSheetSemantics,
  type WidePairedUploadRow,
  unpivotWidePairedRowsToUploadFormat,
  widePairedSemanticsConflictMessage,
} from "./wide-paired-xlsx-semantics";

/** Detector id recorded on each parsed sheet. */
export type SpectrumXlsxFormatId = "wide-paired" | "generic-table";

/**
 * One worksheet extracted from a spectrum workbook, always one contribute dataset.
 */
export interface ParsedSpectrumXlsxSheet {
  readonly sheetName: string;
  readonly semantics: WidePairedSheetSemantics | null;
  readonly parsedFilename: ParsedFilename;
  readonly experimentType: ExperimentTypeFromFilename | null;
  readonly displayFileName: string;
  readonly columns: string[];
  readonly rawData: Array<Record<string, string | number>>;
  readonly columnMappings: CSVColumnMappings;
  readonly geometryCount: number;
  readonly rowCount: number;
  /** Detector that produced this sheet. */
  readonly formatId: SpectrumXlsxFormatId;
  /** Contributor-facing parse / metadata issues for the mapping UI. */
  readonly parseChallenges: string[];
  /** When true, open column-mapping remediation before ingest. */
  readonly needsUserMapping: boolean;
}

/**
 * Detector contract for spectrum workbook layouts. Implementations return
 * zero or more sheets; the first detector that claims a given sheet name wins.
 */
export type SpectrumXlsxDetector = (input: {
  file: File;
  workbook: XLSX.WorkBook;
}) => ParsedSpectrumXlsxSheet[];

const SHEET_TO_JSON_OPTIONS = {
  header: 1,
  defval: "",
  raw: false,
} as const;

function emptyParsedFilename(moleculeToken: string | null): ParsedFilename {
  return {
    edge: null,
    experimentMode: null,
    facility: null,
    beamline: null,
    experimenter: null,
    vendorSlug: null,
    extraInfo: null,
    moleculeToken,
  };
}

function worksheetMatrix(worksheet: XLSX.WorkSheet): unknown[][] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(
    worksheet,
    SHEET_TO_JSON_OPTIONS,
  );
  return matrix.filter((row): row is unknown[] => Array.isArray(row));
}

function headersFromMatrixRow(headerRow: unknown[]): string[] {
  return headerRow.map((cell, index) => normalizeHeaderCell(cell, index));
}

function recordsFromMatrix(matrix: unknown[][]): {
  headers: string[];
  rows: Record<string, string | number>[];
} {
  const headerRow = matrix[0];
  if (!headerRow) return { headers: [], rows: [] };

  const headers = headersFromMatrixRow(headerRow);
  const rows: Record<string, string | number>[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex] ?? [];
    const isBlank = cells.every(
      (cell) =>
        cell === undefined ||
        cell === null ||
        cell === "" ||
        (typeof cell === "string" && cell.trim() === ""),
    );
    if (isBlank) continue;

    const record = rowToRecord(headers, cells);
    const numericRecord: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "number" || typeof value === "string") {
        numericRecord[key] = value;
      }
    }
    rows.push(numericRecord);
  }

  return { headers, rows };
}

function buildDisplayFileName(workbookName: string, sheetName: string): string {
  const stem = workbookName.replace(/\.xlsx$/i, "").trim();
  return `${stem} - ${sheetName}.xlsx`;
}

const LONG_FORMAT_COLUMNS = [
  WIDE_PAIRED_UPLOAD_COLUMNS.energy,
  WIDE_PAIRED_UPLOAD_COLUMNS.absorption,
  WIDE_PAIRED_UPLOAD_COLUMNS.theta,
];

const LONG_FORMAT_MAPPINGS: CSVColumnMappings = {
  energy: WIDE_PAIRED_UPLOAD_COLUMNS.energy,
  absorption: WIDE_PAIRED_UPLOAD_COLUMNS.absorption,
  theta: WIDE_PAIRED_UPLOAD_COLUMNS.theta,
};

function widePairedRowsAsRecords(
  rows: readonly WidePairedUploadRow[],
): Array<Record<string, string | number>> {
  return rows.map((row) => ({
    energy: row.energy,
    mu: row.mu,
    theta: row.theta,
  }));
}

function parseOneWidePairedSheet(input: {
  file: File;
  sheetName: string;
  worksheet: XLSX.WorkSheet;
  workbookMolecule: string | null;
}): ParsedSpectrumXlsxSheet | null {
  const { headers, rows } = recordsFromMatrix(worksheetMatrix(input.worksheet));
  if (headers.length === 0 || rows.length === 0) {
    return null;
  }

  const sheetSemantics = parseWidePairedSheetName(input.sheetName);
  let pairs = sheetSemantics
    ? pairWidePairedGeometryColumns(headers, sheetSemantics.baseToken)
    : [];
  if (pairs.length === 0) {
    pairs = pairWidePairedGeometryColumns(headers);
  }
  if (pairs.length === 0) {
    return null;
  }

  const rawData = unpivotWidePairedRowsToUploadFormat(rows, pairs);
  if (rawData.length === 0) {
    return null;
  }

  const headerSemantics = parseWidePairedSemanticsFromHeaders(headers);
  const autofillSemantics = headerSemantics ?? sheetSemantics;
  const conflict = widePairedSemanticsConflictMessage(
    input.sheetName,
    sheetSemantics,
    headerSemantics,
  );
  const parsedFilename = autofillSemantics
    ? parsedFilenameFromWidePairedSemantics(
        autofillSemantics,
        input.workbookMolecule,
      )
    : emptyParsedFilename(input.workbookMolecule);

  return {
    sheetName: input.sheetName,
    semantics: autofillSemantics,
    parsedFilename,
    experimentType: autofillSemantics
      ? experimentTypeFromWidePairedSemantics(autofillSemantics)
      : experimentTypeFromParsedFilename(parsedFilename),
    displayFileName: buildDisplayFileName(input.file.name, input.sheetName),
    columns: [...LONG_FORMAT_COLUMNS],
    rawData: widePairedRowsAsRecords(rawData),
    columnMappings: LONG_FORMAT_MAPPINGS,
    geometryCount: pairs.length,
    rowCount: rawData.length,
    formatId: "wide-paired",
    parseChallenges: conflict ? [conflict] : [],
    needsUserMapping: false,
  };
}

/**
 * Detects wide paired-column sheets, including tabs whose column prefixes do
 * not match the sheet name (for example an NSLS-II tab with ANSTO-style headers).
 */
export function detectWidePairedSpectrumXlsxSheets(input: {
  file: File;
  workbook: XLSX.WorkBook;
}): ParsedSpectrumXlsxSheet[] {
  const workbookMolecule = moleculeTokenFromWidePairedWorkbookName(
    input.file.name,
  );
  const parsedSheets: ParsedSpectrumXlsxSheet[] = [];

  for (const sheetName of input.workbook.SheetNames) {
    const worksheet = input.workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const parsed = parseOneWidePairedSheet({
      file: input.file,
      sheetName,
      worksheet,
      workbookMolecule,
    });
    if (parsed) {
      parsedSheets.push(parsed);
    }
  }

  return parsedSheets;
}

function parseOneGenericTableSheet(input: {
  file: File;
  sheetName: string;
  worksheet: XLSX.WorkSheet;
  workbookMolecule: string | null;
}): ParsedSpectrumXlsxSheet | null {
  const { headers, rows } = recordsFromMatrix(worksheetMatrix(input.worksheet));
  if (headers.length === 0) {
    return null;
  }

  const sheetSemantics = parseWidePairedSheetName(input.sheetName);
  const parsedFilename = sheetSemantics
    ? parsedFilenameFromWidePairedSemantics(
        sheetSemantics,
        input.workbookMolecule,
      )
    : emptyParsedFilename(input.workbookMolecule);
  const detected = detectSpectrumColumnNames(headers);
  const columnMappings: CSVColumnMappings = {
    energy: detected.energy ?? "",
    absorption: detected.absorption ?? "",
    theta: detected.theta,
    phi: detected.phi,
    ...detectAuxiliarySpectrumColumnNames(headers),
  };
  const challenges = detectCsvParseChallenges({
    columns: headers,
    rawData: rows,
    mappings: columnMappings,
    spectrumPointCount:
      columnMappings.energy && columnMappings.absorption ? rows.length : 0,
  });
  const parseChallenges = challenges.map((row) => row.message);
  if (rows.length === 0 && parseChallenges.length === 0) {
    parseChallenges.push(
      "This sheet has headers but no data rows. Confirm the header row or paste values.",
    );
  }

  return {
    sheetName: input.sheetName,
    semantics: sheetSemantics,
    parsedFilename,
    experimentType: sheetSemantics
      ? experimentTypeFromWidePairedSemantics(sheetSemantics)
      : experimentTypeFromParsedFilename(parsedFilename),
    displayFileName: buildDisplayFileName(input.file.name, input.sheetName),
    columns: headers,
    rawData: rows,
    columnMappings,
    geometryCount: 0,
    rowCount: rows.length,
    formatId: "generic-table",
    parseChallenges,
    needsUserMapping: csvParseNeedsUserHelp(challenges) || rows.length === 0,
  };
}

/**
 * Falls back to a CSV-like table per sheet when wide paired-column detection
 * does not apply, so the contributor can map missing Energy / Absorption columns.
 */
export function detectGenericTableSpectrumXlsxSheets(input: {
  file: File;
  workbook: XLSX.WorkBook;
}): ParsedSpectrumXlsxSheet[] {
  const workbookMolecule = moleculeTokenFromWidePairedWorkbookName(
    input.file.name,
  );
  const parsedSheets: ParsedSpectrumXlsxSheet[] = [];

  for (const sheetName of input.workbook.SheetNames) {
    const worksheet = input.workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const parsed = parseOneGenericTableSheet({
      file: input.file,
      sheetName,
      worksheet,
      workbookMolecule,
    });
    if (parsed) {
      parsedSheets.push(parsed);
    }
  }

  return parsedSheets;
}

/**
 * Ordered spectrum workbook detectors. Wide paired-column layouts claim a
 * sheet first; remaining sheets become generic tables for manual mapping.
 */
export const SPECTRUM_XLSX_DETECTORS: readonly SpectrumXlsxDetector[] = [
  detectWidePairedSpectrumXlsxSheets,
  detectGenericTableSpectrumXlsxSheets,
];

/**
 * Reads a spectrum `.xlsx` workbook and produces one dataset per non-empty sheet.
 *
 * @param file Browser `File` handle for the workbook.
 * @returns One parsed sheet per worksheet that contains headers or data.
 * @throws When the workbook has no usable sheets.
 */
export async function parseSpectrumXlsxFile(
  file: File,
): Promise<ParsedSpectrumXlsxSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const claimed = new Set<string>();
  const sheets: ParsedSpectrumXlsxSheet[] = [];

  for (const detect of SPECTRUM_XLSX_DETECTORS) {
    for (const sheet of detect({ file, workbook })) {
      if (claimed.has(sheet.sheetName)) {
        continue;
      }
      claimed.add(sheet.sheetName);
      sheets.push(sheet);
    }
  }

  if (sheets.length === 0) {
    throw new Error(
      "No spectrum sheets were found in this workbook. Each tab is imported as its own dataset. If columns are unlabeled, map Energy and Absorption after upload.",
    );
  }

  return sheets;
}

/**
 * Returns true when `fileName` ends with `.xlsx` (case-insensitive).
 *
 * @param fileName Upload candidate name.
 */
export function isSpectrumXlsxFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".xlsx");
}
