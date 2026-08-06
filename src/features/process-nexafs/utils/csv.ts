import Papa from "papaparse";

/**
 * Options for parsing a NEXAFS contribution CSV when the default header-on-row-0
 * assumption fails (metadata preamble, multi-line titles, or delimiter quirks).
 */
export interface ParseNexafsCsvOptions {
  /**
   * Zero-based index of the header row within the file text after blank-line
   * trimming at the start is applied by Papa. Defaults to `0`.
   */
  readonly headerRowIndex?: number;
  /**
   * Number of additional rows to skip after the header before data begins.
   * Defaults to `0`.
   */
  readonly skipRowsAfterHeader?: number;
  /**
   * Explicit delimiter; when omitted Papa auto-detects from the preview.
   */
  readonly delimiter?: string;
}

export interface ParsedNexafsCsv {
  readonly columns: string[];
  readonly data: Record<string, unknown>[];
  readonly meta: Papa.ParseMeta;
  readonly errors: Papa.ParseError[];
  readonly options: Required<
    Pick<ParseNexafsCsvOptions, "headerRowIndex" | "skipRowsAfterHeader">
  > & {
    readonly delimiter?: string;
  };
}

function normalizeHeaderCell(value: unknown, index: number): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return `column_${index + 1}`;
}

function rowToRecord(
  headers: string[],
  cells: unknown[],
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i]!;
    const cell = cells[i];
    if (cell === undefined || cell === null || cell === "") {
      record[key] = "";
      continue;
    }
    if (typeof cell === "number" && Number.isFinite(cell)) {
      record[key] = cell;
      continue;
    }
    if (typeof cell === "string") {
      const trimmed = cell.trim();
      if (trimmed === "") {
        record[key] = "";
        continue;
      }
      const asNum = Number.parseFloat(trimmed);
      if (
        Number.isFinite(asNum) &&
        /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)
      ) {
        record[key] = asNum;
        continue;
      }
      record[key] = trimmed;
      continue;
    }
    record[key] = cell;
  }
  return record;
}

/**
 * Parses CSV text into column headers and row records for NEXAFS upload.
 *
 * Applies optional header-row and post-header skip offsets so contributors can
 * recover files with preamble lines. Coerces plain numeric cells to finite
 * numbers so theta/phi geometry is never left as unparsed strings at submit.
 */
export function parseNexafsCsvText(
  text: string,
  options: ParseNexafsCsvOptions = {},
): ParsedNexafsCsv {
  const headerRowIndex = Math.max(0, options.headerRowIndex ?? 0);
  const skipRowsAfterHeader = Math.max(0, options.skipRowsAfterHeader ?? 0);

  const results = Papa.parse<unknown[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    delimiter: options.delimiter,
  });

  const rows = (results.data ?? []).filter((row): row is unknown[] =>
    Array.isArray(row),
  );

  if (rows.length === 0) {
    return {
      columns: [],
      data: [],
      meta: results.meta,
      errors: results.errors,
      options: {
        headerRowIndex,
        skipRowsAfterHeader,
        delimiter: options.delimiter,
      },
    };
  }

  if (headerRowIndex >= rows.length) {
    return {
      columns: [],
      data: [],
      meta: results.meta,
      errors: [
        ...results.errors,
        {
          type: "FieldMismatch",
          code: "TooFewFields",
          message: `Header row index ${headerRowIndex} is past the end of the file (${rows.length} rows).`,
          row: headerRowIndex,
        },
      ],
      options: {
        headerRowIndex,
        skipRowsAfterHeader,
        delimiter: options.delimiter,
      },
    };
  }

  const headerCells = rows[headerRowIndex] ?? [];
  const columns = headerCells.map((cell, index) =>
    normalizeHeaderCell(cell, index),
  );
  const dataStart = headerRowIndex + 1 + skipRowsAfterHeader;
  const data: Record<string, unknown>[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const cells = rows[i] ?? [];
    if (
      cells.every(
        (cell) =>
          cell === undefined ||
          cell === null ||
          (typeof cell === "string" && cell.trim() === ""),
      )
    ) {
      continue;
    }
    data.push(rowToRecord(columns, cells));
  }

  return {
    columns,
    data,
    meta: results.meta,
    errors: results.errors,
    options: {
      headerRowIndex,
      skipRowsAfterHeader,
      delimiter: options.delimiter,
    },
  };
}

/**
 * Reads a CSV `File` as text and parses it with {@link parseNexafsCsvText}.
 */
export async function parseCSVFile(
  file: File,
  options: ParseNexafsCsvOptions = {},
): Promise<ParsedNexafsCsv> {
  const text = await file.text();
  return parseNexafsCsvText(text, options);
}
