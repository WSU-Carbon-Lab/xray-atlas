/**
 * Reads spectrum `.xlsx` workbooks via ordered format detectors and coerces
 * matching sheets into long-format NEXAFS contribute tables (`energy`, `mu`, `theta`).
 *
 * The first detector is wide paired-column edge-labeled sheets (facility and
 * beamline as free tokens). Additional workbook layouts can register later
 * without changing contribute upload wiring.
 */
import * as XLSX from "xlsx";
import type { CSVColumnMappings } from "../types";
import { normalizeHeaderCell, rowToRecord } from "./csv";
import type { ParsedFilename } from "./filenameParser";
import type { ExperimentTypeFromFilename } from "./filenameParser";
import {
  WIDE_PAIRED_UPLOAD_COLUMNS,
  experimentTypeFromWidePairedSemantics,
  moleculeTokenFromWidePairedWorkbookName,
  pairWidePairedGeometryColumns,
  parseWidePairedSheetName,
  parsedFilenameFromWidePairedSemantics,
  type WidePairedSheetSemantics,
  type WidePairedUploadRow,
  unpivotWidePairedRowsToUploadFormat,
} from "./wide-paired-xlsx-semantics";

/**
 * One edge-level dataset extracted from a recognized spectrum workbook sheet.
 */
export interface ParsedSpectrumXlsxSheet {
  readonly sheetName: string;
  readonly semantics: WidePairedSheetSemantics;
  readonly parsedFilename: ParsedFilename;
  readonly experimentType: ExperimentTypeFromFilename | null;
  readonly displayFileName: string;
  readonly columns: string[];
  readonly rawData: WidePairedUploadRow[];
  readonly columnMappings: CSVColumnMappings;
  readonly geometryCount: number;
  readonly rowCount: number;
  /** Detector that produced this sheet; reserved for multi-format routing. */
  readonly formatId: "wide-paired";
}

/**
 * Detector contract for spectrum workbook layouts. Implementations return
 * zero or more sheets; the first detector that yields sheets wins.
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

/**
 * Detects wide paired-column sheets with edge-labeled facility/beamline tokens.
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

    const semantics = parseWidePairedSheetName(sheetName);
    if (!semantics) continue;

    const { headers, rows } = recordsFromMatrix(worksheetMatrix(worksheet));
    const pairs = pairWidePairedGeometryColumns(headers, semantics.baseToken);
    if (pairs.length === 0) continue;

    const rawData = unpivotWidePairedRowsToUploadFormat(rows, pairs);
    if (rawData.length === 0) continue;

    const parsedFilename = parsedFilenameFromWidePairedSemantics(
      semantics,
      workbookMolecule,
    );

    parsedSheets.push({
      sheetName,
      semantics,
      parsedFilename,
      experimentType: experimentTypeFromWidePairedSemantics(semantics),
      displayFileName: buildDisplayFileName(input.file.name, sheetName),
      columns: [...LONG_FORMAT_COLUMNS],
      rawData,
      columnMappings: LONG_FORMAT_MAPPINGS,
      geometryCount: pairs.length,
      rowCount: rawData.length,
      formatId: "wide-paired",
    });
  }

  return parsedSheets;
}

/**
 * Ordered spectrum workbook detectors. Add new layouts here without changing
 * contribute upload consumers.
 */
export const SPECTRUM_XLSX_DETECTORS: readonly SpectrumXlsxDetector[] = [
  detectWidePairedSpectrumXlsxSheets,
];

/**
 * Reads a spectrum `.xlsx` workbook and coerces each matching sheet into
 * long-format NEXAFS upload tables (`energy`, `mu`, `theta`).
 *
 * @param file Browser `File` handle for the workbook.
 * @returns One parsed sheet per matching edge tab; rejects when no detector matches.
 */
export async function parseSpectrumXlsxFile(
  file: File,
): Promise<ParsedSpectrumXlsxSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  for (const detect of SPECTRUM_XLSX_DETECTORS) {
    const sheets = detect({ file, workbook });
    if (sheets.length > 0) {
      return sheets;
    }
  }

  throw new Error(
    "No recognized spectrum sheets were found in this workbook. Expected edge-labeled tabs like Molecule_C_K_edge_TEY_FACILITY_BEAMLINE with paired _XXdeg_En / _XXdeg columns.",
  );
}

/**
 * Returns true when `fileName` ends with `.xlsx` (case-insensitive).
 *
 * @param fileName Upload candidate name.
 */
export function isSpectrumXlsxFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".xlsx");
}
