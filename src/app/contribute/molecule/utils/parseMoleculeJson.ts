export interface MoleculeJsonInput {
  commonName?: string | null;
  common_name?: string | null;
  iupacName?: string | null;
  iupac_name?: string | null;
  synonyms?: string[] | null;
  smiles?: string | null;
  SMILES?: string | null;
  inchi?: string | null;
  InChI?: string | null;
  chemicalFormula?: string | null;
  chemical_formula?: string | null;
  casNumber?: string | null;
  cas_number?: string | null;
  pubchemCid?: string | null;
  pubchem_cid?: string | null;
  tagIds?: string[] | null;
  tag_ids?: string[] | null;
}

export interface ParsedMoleculeData {
  commonName: string;
  iupacName: string;
  synonyms: string[];
  smiles: string;
  inchi: string;
  chemicalFormula: string;
  casNumber: string | null;
  pubchemCid: string | null;
  tagIds: string[];
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const strOrNull = (v: unknown): string | null => {
  const s = str(v);
  return s === "" ? null : s;
};

const stringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
};

export function parseMoleculeJson(json: unknown): ParsedMoleculeData {
  const raw = json as MoleculeJsonInput | null;
  if (!raw || typeof raw !== "object") {
    throw new Error("JSON must be an object");
  }

  const commonName = str(raw.commonName) || str(raw.common_name) || "";
  const iupacName = str(raw.iupacName) || str(raw.iupac_name) || "";
  const synonyms = raw.synonyms ? stringArray(raw.synonyms) : [];
  const smiles = str(raw.smiles) || str(raw.SMILES) || "";
  const inchi = str(raw.inchi) || str(raw.InChI) || "";
  const chemicalFormula =
    str(raw.chemicalFormula) || str(raw.chemical_formula) || "";
  const casNumber =
    strOrNull(raw.casNumber) ?? strOrNull(raw.cas_number) ?? null;
  const pubchemCid =
    strOrNull(raw.pubchemCid) ?? strOrNull(raw.pubchem_cid) ?? null;
  const tagIds = raw.tagIds
    ? stringArray(raw.tagIds).filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    : raw.tag_ids
      ? stringArray(raw.tag_ids).filter((id) => /^[0-9a-f-]{36}$/i.test(id))
      : [];

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

export function parseMoleculeJsonFile(file: File): Promise<ParsedMoleculeData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        if (typeof text !== "string") {
          reject(new Error("Failed to read file as text"));
          return;
        }
        const json = JSON.parse(text) as unknown;
        resolve(parseMoleculeJson(json));
      } catch (err) {
        reject(
          err instanceof Error ? err : new Error("Failed to parse JSON file"),
        );
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
