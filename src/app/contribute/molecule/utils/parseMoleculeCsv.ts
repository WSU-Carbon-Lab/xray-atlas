import Papa from "papaparse";
import type { ParsedMoleculeData } from "./parseMoleculeJson";

const COLUMN_ALIASES: Record<string, string[]> = {
  commonName: ["commonname", "common_name", "name", "common name"],
  iupacName: ["iupacname", "iupac_name", "iupac", "iupac name"],
  synonyms: ["synonyms", "synonym", "alternativenames", "alternative_names"],
  smiles: ["smiles", "smile"],
  inchi: ["inchi", "inchi key", "inchikey"],
  chemicalFormula: [
    "chemicalformula",
    "chemical_formula",
    "formula",
    "chemical formula",
  ],
  casNumber: ["casnumber", "cas_number", "cas", "cas number", "cas no"],
  pubchemCid: ["pubchemcid", "pubchem_cid", "pubchem", "cid", "pubchem id"],
};

function findColumnKey(
  headers: string[],
  targetKey: keyof typeof COLUMN_ALIASES,
): string | null {
  const normalized = targetKey.toLowerCase().trim();
  const aliases = COLUMN_ALIASES[targetKey];
  if (!aliases) return null;
  for (const header of headers) {
    const h = header.toLowerCase().trim();
    if (h === normalized || aliases.includes(h)) return header;
  }
  return null;
}

function getCell(row: Record<string, unknown>, key: string | null): string {
  if (!key || row[key] == null) return "";
  const v = row[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function getCellOrNull(
  row: Record<string, unknown>,
  key: string | null,
): string | null {
  const s = getCell(row, key);
  return s === "" ? null : s;
}

function parseSynonyms(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseTagIds(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => UUID_REGEX.test(s));
}

function parseFirstRow(
  firstRow: Record<string, unknown>,
  headers: string[],
): ParsedMoleculeData {
  const commonNameKey = findColumnKey(headers, "commonName");
  const iupacNameKey = findColumnKey(headers, "iupacName");
  const synonymsKey = findColumnKey(headers, "synonyms");
  const smilesKey = findColumnKey(headers, "smiles");
  const inchiKey = findColumnKey(headers, "inchi");
  const chemicalFormulaKey = findColumnKey(headers, "chemicalFormula");
  const casNumberKey = findColumnKey(headers, "casNumber");
  const pubchemCidKey = findColumnKey(headers, "pubchemCid");
  const tagIdsKey = findColumnKey(headers, "tagIds");

  const commonName = getCell(firstRow, commonNameKey);
  const iupacName = getCell(firstRow, iupacNameKey);
  const synonymsRaw = getCell(firstRow, synonymsKey);
  const synonyms = synonymsRaw ? parseSynonyms(synonymsRaw) : [];
  const smiles = getCell(firstRow, smilesKey);
  const inchi = getCell(firstRow, inchiKey);
  const chemicalFormula = getCell(firstRow, chemicalFormulaKey);
  const casNumber = getCellOrNull(firstRow, casNumberKey);
  const pubchemCid = getCellOrNull(firstRow, pubchemCidKey);
  const tagIdsRaw = getCell(firstRow, tagIdsKey ?? "tag_ids");
  const tagIds = tagIdsRaw ? parseTagIds(tagIdsRaw) : [];

  return {
    commonName,
    iupacName,
    synonyms,
    smiles,
    inchi,
    chemicalFormula,
    casNumber,
    pubchemCid,
    tagIds,
  };
}

export function parseMoleculeCsvFile(file: File): Promise<ParsedMoleculeData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          const headers =
            results.meta.fields ??
            (rows[0] ? Object.keys(rows[0]) : []);
          if (!rows.length) {
            reject(new Error("CSV has no data rows"));
            return;
          }
          const firstRow = rows[0]!;
          resolve(parseFirstRow(firstRow, headers));
        } catch (err) {
          reject(
            err instanceof Error ? err : new Error("Failed to parse CSV file"),
          );
        }
      },
      error: (err) => {
        reject(
          err?.message
            ? new Error(err.message)
            : new Error("Failed to read CSV file"),
        );
      },
    });
  });
}
