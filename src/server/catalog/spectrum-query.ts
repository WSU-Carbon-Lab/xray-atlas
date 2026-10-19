/**
 * Read-only SQL over the public spectrum export.
 *
 * Callers may select from `spectrum_points` only. The statement runs inside
 * that relation, which projects the same columns as `GET /api/v1/datasets/export`.
 * It does not accept writes, other tables, or schema-qualified names.
 */

import { db } from "~/server/db";

const STATEMENT_LIMIT = 8_000;
const ROW_LIMIT = 10_000;

const WRITE_SQL =
  /\b(insert|update|delete|drop|alter|attach|detach|pragma|replace|create|vacuum|reindex|load_extension|copy|grant|revoke|truncate|into|call|do|execute|prepare|set|reset|listen|notify|comment|security|owner|pg_|dblink|lo_|current_user|session_user|current_database|current_schema|current_setting|inet_|version|query_to_xml|set_config)\b/i;

const SPECTRUM_POINTS_SQL = `
SELECT
  e.id::text AS dataset_id,
  NULLIF(lower(btrim(e.atlas_dataset_id)), '') AS atlas_dataset_id,
  e.experimenttype::text AS experiment_type,
  s.id::text AS sample_id,
  s.identifier AS sample_identifier,
  m.id::text AS molecule_id,
  m.iupacname AS molecule_iupac_name,
  ed.id::text AS edge_id,
  ed.targetatom || '(' || ed.corestate || ')' AS edge_label,
  i.id AS instrument_id,
  i.name AS instrument_name,
  f.id::text AS facility_id,
  f.name AS facility_name,
  COALESCE((
    SELECT string_agg(p.doi, ';' ORDER BY p.doi)
    FROM public.experimentpublications AS ep
    JOIN public.publications AS p ON p.id = ep.publicationid
    WHERE ep.experimentid = e.id
  ), '') AS publication_dois,
  sp.energyev AS energy_ev,
  sp.rawabs AS raw_abs,
  sp.i0 AS i0,
  sp.od AS od,
  sp.massabsorption AS mass_absorption,
  sp.beta AS beta,
  sp.delta AS delta,
  to_char(e.createdat AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
FROM public.spectrumpoints AS sp
JOIN public.experiments AS e ON e.id = sp.experimentid
JOIN public.samples AS s ON s.id = e.sampleid
JOIN public.molecules AS m ON m.id = s.moleculeid
JOIN public.edges AS ed ON ed.id = e.edgeid
JOIN public.instruments AS i ON i.id = e.instrumentid
JOIN public.facilities AS f ON f.id = i.facilityid
`;

/**
 * One cell returned by {@link runSpectrumSelect}.
 */
export type SpectrumQueryCell = string | number | null;

/**
 * Rows from one accepted spectrum statement.
 */
export interface SpectrumQueryResult {
  columns: string[];
  rows: Record<string, SpectrumQueryCell>[];
  truncated: boolean;
}

/**
 * Rejects a statement that is not one read of `spectrum_points`.
 */
export class SpectrumQueryError extends Error {
  /**
   * @param message - Caller-facing reason the statement was rejected.
   */
  constructor(message: string) {
    super(message);
    this.name = "SpectrumQueryError";
  }
}

/**
 * Checks that `sql` is one SELECT or WITH against `spectrum_points`.
 *
 * @param sql - Statement text. A trailing semicolon is removed. At most 8000 characters.
 * @returns The statement that may be placed under the spectrum relation.
 * @throws {SpectrumQueryError} when the statement is empty, compound, writes, or names another relation.
 */
export function assertSpectrumSelect(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/u, "");
  if (trimmed.length === 0) {
    throw new SpectrumQueryError("query needs a SELECT statement.");
  }
  if (trimmed.length > STATEMENT_LIMIT) {
    throw new SpectrumQueryError("query is limited to 8000 characters.");
  }
  if (
    trimmed.includes(";") ||
    trimmed.includes("$") ||
    trimmed.includes("\\")
  ) {
    throw new SpectrumQueryError("query accepts one statement.");
  }
  if (
    trimmed.includes("--") ||
    trimmed.includes("/*") ||
    trimmed.includes("*/")
  ) {
    throw new SpectrumQueryError("query does not accept comments.");
  }
  if (!/^(select|with)\b/iu.test(trimmed)) {
    throw new SpectrumQueryError("query accepts a SELECT or WITH statement.");
  }
  if (WRITE_SQL.test(trimmed)) {
    throw new SpectrumQueryError(
      "query is read-only and can read spectrum_points only.",
    );
  }
  const bare = maskStrings(trimmed);
  if (bare.includes(".")) {
    throw new SpectrumQueryError("query can read spectrum_points only.");
  }
  const cteNames = readCteNames(bare);
  if (cteNames.has("spectrum_points")) {
    throw new SpectrumQueryError("query can read spectrum_points only.");
  }
  if (!/\bspectrum_points\b/iu.test(bare)) {
    throw new SpectrumQueryError("query must read spectrum_points.");
  }
  for (const name of readRelations(bare)) {
    if (name !== "spectrum_points" && !cteNames.has(name)) {
      throw new SpectrumQueryError("query can read spectrum_points only.");
    }
  }
  return trimmed;
}

/**
 * Runs `sql` against the public spectrum relation and caps the row count.
 *
 * @param sql - Statement accepted by {@link assertSpectrumSelect}.
 * @param limit - Maximum rows returned, from 1 to 10000. One extra row is fetched to set `truncated`.
 * @returns Column names, capped rows, and whether more rows were available.
 * @throws {SpectrumQueryError} when `sql` or `limit` is rejected.
 * @throws {Error} when the database rejects the statement.
 */
export async function runSpectrumSelect(
  sql: string,
  limit: number,
): Promise<SpectrumQueryResult> {
  const statement = assertSpectrumSelect(sql);
  if (!Number.isInteger(limit) || limit < 1 || limit > ROW_LIMIT) {
    throw new SpectrumQueryError("query limit must be from 1 to 10000.");
  }
  const wrapped = `WITH spectrum_points AS (${SPECTRUM_POINTS_SQL}) SELECT * FROM (${statement}) AS atlas_query LIMIT $1`;
  const records = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe(
      "SELECT set_config('statement_timeout', '8s', true)",
    );
    return tx.$queryRawUnsafe(wrapped, limit + 1);
  });
  const rawRows = rawRecords(records);
  const truncated = rawRows.length > limit;
  const rows = rawRows.slice(0, limit).map(normalizeRow);
  return { columns: Object.keys(rows[0] ?? {}), rows, truncated };
}

function rawRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function normalizeRow(
  row: Record<string, unknown>,
): Record<string, SpectrumQueryCell> {
  const cells: Record<string, SpectrumQueryCell> = {};
  for (const [key, value] of Object.entries(row)) {
    cells[key] = cell(value);
  }
  return cells;
}

function cell(value: unknown): SpectrumQueryCell {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return decimalCell(value);
  }
  return null;
}

function decimalCell(value: object): SpectrumQueryCell {
  if (!("toNumber" in value)) {
    return null;
  }
  const toNumber = value.toNumber;
  if (typeof toNumber !== "function") {
    return null;
  }
  const parsed: unknown = Reflect.apply(toNumber, value, []);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function maskStrings(sql: string): string {
  return sql.replace(/'(?:''|[^'])*'/gu, "''");
}

function readCteNames(sql: string): Set<string> {
  const names = new Set<string>();
  const pattern = /\b([a-z_][a-z0-9_]*)\s+as\s*\(/giu;
  for (const match of sql.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();
    if (name) {
      names.add(name);
    }
  }
  return names;
}

function readRelations(sql: string): string[] {
  const names: string[] = [];
  const pattern = /\b(?:from|join)\b/giu;
  for (const match of sql.matchAll(pattern)) {
    let index = match.index + match[0].length;
    index = skipSpace(sql, index);
    if (sql[index] === "(") {
      continue;
    }
    const ident = readIdent(sql, index);
    if (!ident) {
      continue;
    }
    names.push(ident.name);
    index = ident.next;
    for (;;) {
      const cursor = skipSpace(sql, index);
      if (sql[cursor] !== ",") {
        break;
      }
      const afterComma = skipSpace(sql, cursor + 1);
      const next = readIdent(sql, afterComma);
      if (!next) {
        break;
      }
      names.push(next.name);
      index = next.next;
    }
  }
  return names;
}

function readIdent(
  sql: string,
  index: number,
): { name: string; next: number } | null {
  const match = /^[a-z_][a-z0-9_]*/iu.exec(sql.slice(index));
  const name = match?.[0];
  if (!name) {
    return null;
  }
  return { name: name.toLowerCase(), next: index + name.length };
}

function skipSpace(sql: string, index: number): number {
  let cursor = index;
  while (cursor < sql.length && /\s/u.test(sql[cursor] ?? "")) {
    cursor += 1;
  }
  return cursor;
}
