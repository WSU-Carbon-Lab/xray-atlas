/**
 * Reads ANSTO SXR wide paired-column `.xlsx` workbooks and coerces each matching
 * sheet into long-format NEXAFS contribute tables (`energy`, `mu`, `theta`).
 */
import * as XLSX from "xlsx";
import type { CSVColumnMappings } from "../types";
import { normalizeHeaderCell, rowToRecord } from "./csv";
import type { ParsedFilename } from "./filenameParser";
import type { ExperimentTypeFromFilename } from "./filenameParser";
import {
  ANSTO_WIDE_UPLOAD_COLUMNS,
  experimentTypeFromAnstoWideSemantics,
  moleculeTokenFromAnstoWideWorkbookName,
  pairAnstoWideGeometryColumns,
  parseAnstoWideSheetName,
  parsedFilenameFromAnstoWideSemantics,
  type AnstoWideSheetSemantics,
  type AnstoWideUploadRow,
  unpivotAnstoWideRowsToUploadFormat,
} from "./ansto-wide-xlsx-semantics";

/**
 * One edge-level dataset extracted from an ANSTO SXR wide-format workbook sheet.
 */
export interface ParsedAnstoWideXlsxSheet {
  readonly sheetName: string;
  readonly semantics: AnstoWideSheetSemantics;
  readonly parsedFilename: ParsedFilename;
  readonly experimentType: ExperimentTypeFromFilename | null;
  readonly displayFileName: string;
  readonly columns: string[];
  readonly rawData: AnstoWideUploadRow[];
  readonly columnMappings: CSVColumnMappings;
  readonly geometryCount: number;
  readonly rowCount: number;
}

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
  ANSTO_WIDE_UPLOAD_COLUMNS.energy,
  ANSTO_WIDE_UPLOAD_COLUMNS.absorption,
  ANSTO_WIDE_UPLOAD_COLUMNS.theta,
];

const LONG_FORMAT_MAPPINGS: CSVColumnMappings = {
  energy: ANSTO_WIDE_UPLOAD_COLUMNS.energy,
  absorption: ANSTO_WIDE_UPLOAD_COLUMNS.absorption,
  theta: ANSTO_WIDE_UPLOAD_COLUMNS.theta,
};

/**
 * Reads an ANSTO SXR wide paired-column `.xlsx` workbook and coerces each matching
 * sheet into long-format NEXAFS upload tables (`energy`, `mu`, `theta`).
 *
 * @param file Browser `File` handle for the workbook.
 * @returns One parsed sheet per edge tab; rejects when no sheets match the layout.
 */
export async function parseAnstoWideXlsxFile(
  file: File,
): Promise<ParsedAnstoWideXlsxSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  const workbookMolecule = moleculeTokenFromAnstoWideWorkbookName(file.name);
  const parsedSheets: ParsedAnstoWideXlsxSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const semantics = parseAnstoWideSheetName(sheetName);
    if (!semantics) continue;

    const { headers, rows } = recordsFromMatrix(worksheetMatrix(worksheet));
    const pairs = pairAnstoWideGeometryColumns(headers, semantics.baseToken);
    if (pairs.length === 0) continue;

    const rawData = unpivotAnstoWideRowsToUploadFormat(rows, pairs);
    if (rawData.length === 0) continue;

    const parsedFilename = parsedFilenameFromAnstoWideSemantics(
      semantics,
      workbookMolecule,
    );

    parsedSheets.push({
      sheetName,
      semantics,
      parsedFilename,
      experimentType: experimentTypeFromAnstoWideSemantics(semantics),
      displayFileName: buildDisplayFileName(file.name, sheetName),
      columns: [...LONG_FORMAT_COLUMNS],
      rawData,
      columnMappings: LONG_FORMAT_MAPPINGS,
      geometryCount: pairs.length,
      rowCount: rawData.length,
    });
  }

  if (parsedSheets.length === 0) {
    throw new Error(
      "No ANSTO wide paired-column sheets were found. Expected sheet names like N2200_C_K_edge_TEY_ANSTO_SXR with paired _XXdeg_En / _XXdeg columns.",
    );
  }

  return parsedSheets;
}

/**
 * Returns true when `fileName` ends with `.xlsx` (case-insensitive).
 *
 * @param fileName Upload candidate name.
 */
export function isAnstoWideXlsxFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".xlsx");
}
