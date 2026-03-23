import { readFile, writeFile } from "node:fs/promises";

type LegacyMolecule = {
  name: string;
  synonyms?: string[];
  chemical_formula?: string;
  description?: string;
  SMILES?: string;
  InChI?: string;
  img?: string;
};

type PubChemProperties = {
  CID: number;
  MolecularFormula?: string;
  CanonicalSMILES?: string;
  IsomericSMILES?: string;
  InChI?: string;
  IUPACName?: string;
};

type MoleculeReport = {
  name: string;
  synonyms: string[];
  local: {
    formula: string | null;
    smiles: string | null;
    inchiRaw: string | null;
    inchiNormalized: string | null;
    inchiPrefixAdded: boolean;
  };
  lookup: {
    success: boolean;
    method: string | null;
    query: string | null;
    cid: number | null;
  };
  pubchem: {
    formula: string | null;
    canonicalSmiles: string | null;
    inchi: string | null;
    iupacName: string | null;
    rnValues: string[];
    preferredCas: string | null;
  };
  checks: {
    formulaMatch: boolean | null;
    inchiMatch: boolean | null;
    smilesMatch: boolean | null;
    likelyIssue: boolean;
    notes: string[];
  };
};

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const INDEX_PATH = "/Users/hduva/projects/xray-atlas/s3/MOLECULES/INDEX.json";
const OUT_JSON =
  "/Users/hduva/projects/xray-atlas/s3/MOLECULE_METADATA_CONSISTENCY.json";
const OUT_MD =
  "/Users/hduva/projects/xray-atlas/s3/MOLECULE_METADATA_CONSISTENCY.md";

function normalizeInchi(inchi: string | undefined): {
  raw: string | null;
  normalized: string | null;
  prefixAdded: boolean;
} {
  const trimmed = (inchi ?? "").trim();
  if (!trimmed) return { raw: null, normalized: null, prefixAdded: false };
  if (trimmed.startsWith("InChI=")) {
    return { raw: trimmed, normalized: trimmed, prefixAdded: false };
  }
  return { raw: trimmed, normalized: `InChI=${trimmed}`, prefixAdded: true };
}

function normalizeFormula(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.replace(/\s+/g, "").toUpperCase();
}

function normalizeText(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v ? v : null;
}

function extractCas(values: string[]): string | null {
  const pattern = /^\d{2,7}-\d{2}-\d$/;
  const exact = values.find((v) => pattern.test(v.trim()));
  return exact ?? null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getCidsByInchi(inchi: string): Promise<number[]> {
  const url = `${PUBCHEM_BASE}/compound/inchi/${encodeURIComponent(inchi)}/cids/JSON`;
  const data = await fetchJson<{ IdentifierList?: { CID?: number[] } }>(url);
  return (data?.IdentifierList?.CID ?? []).filter((cid) => cid > 0);
}

async function getCidsBySmiles(smiles: string): Promise<number[]> {
  const url = `${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON`;
  const data = await fetchJson<{ IdentifierList?: { CID?: number[] } }>(url);
  return (data?.IdentifierList?.CID ?? []).filter((cid) => cid > 0);
}

async function getCidsByName(name: string): Promise<number[]> {
  const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`;
  const data = await fetchJson<{ IdentifierList?: { CID?: number[] } }>(url);
  return (data?.IdentifierList?.CID ?? []).filter((cid) => cid > 0);
}

async function getPubChemProperties(
  cid: number,
): Promise<PubChemProperties | null> {
  const fields = [
    "MolecularFormula",
    "CanonicalSMILES",
    "IsomericSMILES",
    "InChI",
    "IUPACName",
  ].join(",");
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/property/${fields}/JSON`;
  const data = await fetchJson<{ PropertyTable?: { Properties?: PubChemProperties[] } }>(
    url,
  );
  return data?.PropertyTable?.Properties?.[0] ?? null;
}

async function getPubChemRnValues(cid: number): Promise<string[]> {
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/xrefs/RN/JSON`;
  const data = await fetchJson<{
    InformationList?: { Information?: Array<{ RN?: string[] }> };
  }>(url);
  const values = data?.InformationList?.Information?.flatMap((x) => x.RN ?? []) ?? [];
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort();
}

async function lookupPubChem(
  molecule: LegacyMolecule,
  inchiNormalized: string | null,
  localFormula: string | null,
): Promise<{ method: string; query: string; cid: number } | null> {
  if (inchiNormalized) {
    const cids = await getCidsByInchi(inchiNormalized);
    if (cids.length) return { method: "inchi", query: inchiNormalized, cid: cids[0]! };
  }
  const smiles = normalizeText(molecule.SMILES);
  if (smiles) {
    const cids = await getCidsBySmiles(smiles);
    if (cids.length) return { method: "smiles", query: smiles, cid: cids[0]! };
  }
  const candidates = [molecule.name, ...(molecule.synonyms ?? [])]
    .map((x) => x.trim())
    .filter(Boolean);
  for (const candidate of candidates) {
    const cids = await getCidsByName(candidate);
    for (const cid of cids) {
      const properties = await getPubChemProperties(cid);
      if (!properties) continue;
      if (!localFormula) return { method: "name", query: candidate, cid };
      const remoteFormula = normalizeFormula(properties.MolecularFormula ?? null);
      if (remoteFormula && remoteFormula === normalizeFormula(localFormula)) {
        return { method: "name", query: candidate, cid };
      }
    }
  }
  return null;
}

function analyzeChecks(input: {
  localFormula: string | null;
  localSmiles: string | null;
  localInchi: string | null;
  pubchemFormula: string | null;
  pubchemSmiles: string | null;
  pubchemInchi: string | null;
  lookupMethod: string | null;
  prefixAdded: boolean;
  found: boolean;
}): MoleculeReport["checks"] {
  const notes: string[] = [];
  const formulaMatch =
    input.localFormula && input.pubchemFormula
      ? normalizeFormula(input.localFormula) === normalizeFormula(input.pubchemFormula)
      : null;
  const inchiMatch =
    input.localInchi && input.pubchemInchi
      ? input.localInchi.trim() === input.pubchemInchi.trim()
      : null;
  const smilesMatch =
    input.localSmiles && input.pubchemSmiles
      ? input.localSmiles.trim() === input.pubchemSmiles.trim()
      : null;
  if (!input.found) notes.push("No PubChem match found by InChI/SMILES/name");
  if (input.lookupMethod === "name") notes.push("Lookup succeeded by name only");
  if (input.prefixAdded) notes.push("Input InChI was missing InChI= prefix");
  if (formulaMatch === false) notes.push("Formula mismatch with PubChem");
  if (inchiMatch === false) notes.push("InChI mismatch with PubChem");
  if (smilesMatch === false) notes.push("SMILES mismatch with PubChem");
  const likelyIssue =
    !input.found ||
    input.lookupMethod === "name" ||
    formulaMatch === false ||
    inchiMatch === false ||
    smilesMatch === false;
  return { formulaMatch, inchiMatch, smilesMatch, likelyIssue, notes };
}

function formatList(values: string[]): string {
  return values.length ? values.map((v) => `\`${v}\``).join(", ") : "(none)";
}

async function main(): Promise<void> {
  const raw = await readFile(INDEX_PATH, "utf8");
  const parsed = JSON.parse(raw) as { molecules: LegacyMolecule[] };
  const reports: MoleculeReport[] = [];

  for (const molecule of parsed.molecules) {
    const normalized = normalizeInchi(molecule.InChI);
    const localFormula = normalizeText(molecule.chemical_formula);
    const lookup = await lookupPubChem(
      molecule,
      normalized.normalized,
      localFormula,
    );
    let properties: PubChemProperties | null = null;
    let rnValues: string[] = [];
    if (lookup) {
      properties = await getPubChemProperties(lookup.cid);
      rnValues = await getPubChemRnValues(lookup.cid);
    }
    const localSmiles = normalizeText(molecule.SMILES);
    const localInchi = normalized.normalized;
    const pubchemFormula = normalizeText(properties?.MolecularFormula);
    const pubchemSmiles =
      normalizeText(properties?.CanonicalSMILES) ??
      normalizeText(properties?.IsomericSMILES);
    const pubchemInchi = normalizeText(properties?.InChI);
    const checks = analyzeChecks({
      localFormula,
      localSmiles,
      localInchi,
      pubchemFormula,
      pubchemSmiles,
      pubchemInchi,
      lookupMethod: lookup?.method ?? null,
      prefixAdded: normalized.prefixAdded,
      found: Boolean(lookup && properties),
    });
    reports.push({
      name: molecule.name,
      synonyms: (molecule.synonyms ?? []).map((x) => x.trim()).filter(Boolean),
      local: {
        formula: localFormula,
        smiles: localSmiles,
        inchiRaw: normalized.raw,
        inchiNormalized: normalized.normalized,
        inchiPrefixAdded: normalized.prefixAdded,
      },
      lookup: {
        success: Boolean(lookup && properties),
        method: lookup?.method ?? null,
        query: lookup?.query ?? null,
        cid: properties?.CID ?? null,
      },
      pubchem: {
        formula: pubchemFormula,
        canonicalSmiles: pubchemSmiles,
        inchi: pubchemInchi,
        iupacName: normalizeText(properties?.IUPACName),
        rnValues,
        preferredCas: extractCas(rnValues),
      },
      checks,
    });
  }

  const timestamp = new Date().toISOString();
  const jsonOutput = {
    generatedAt: timestamp,
    source: "s3/MOLECULES/INDEX.json",
    count: reports.length,
    reports,
  };
  await writeFile(OUT_JSON, JSON.stringify(jsonOutput, null, 2), "utf8");

  const issueCount = reports.filter((r) => r.checks.likelyIssue).length;
  let md = "# Molecule metadata consistency check\n\n";
  md += `Generated at: \`${timestamp}\`\n\n`;
  md += `Source file: \`s3/MOLECULES/INDEX.json\`\n\n`;
  md += `Molecules analyzed: **${reports.length}**\n\n`;
  md += `Flagged for review: **${issueCount}**\n\n`;
  md +=
    "Checks compare local INDEX metadata against PubChem lookup by normalized InChI, then SMILES, then name/synonyms.\n\n";
  md +=
    "| Molecule | Lookup | CID | Formula (local -> PubChem) | CAS from PubChem RN | Flags |\n";
  md += "|---|---|---:|---|---|---|\n";
  for (const r of reports) {
    const flags = r.checks.notes.length ? r.checks.notes.join("; ") : "OK";
    md += `| ${r.name} | ${r.lookup.method ?? "none"} | ${r.lookup.cid ?? ""} | ${r.local.formula ?? "(none)"} -> ${r.pubchem.formula ?? "(none)"} | ${r.pubchem.preferredCas ?? "(none)"} | ${flags} |\n`;
  }
  md += "\n## Detailed per-molecule notes\n\n";
  for (const r of reports) {
    md += `### ${r.name}\n\n`;
    md += `- Lookup: ${r.lookup.success ? "success" : "failed"} (${r.lookup.method ?? "none"})\n`;
    md += `- CID: ${r.lookup.cid ?? "(none)"}\n`;
    md += `- Synonyms: ${formatList(r.synonyms)}\n`;
    md += `- Local formula: ${r.local.formula ?? "(none)"}\n`;
    md += `- PubChem formula: ${r.pubchem.formula ?? "(none)"}\n`;
    md += `- Local InChI raw: ${r.local.inchiRaw ?? "(none)"}\n`;
    md += `- Local InChI normalized: ${r.local.inchiNormalized ?? "(none)"}\n`;
    md += `- PubChem InChI: ${r.pubchem.inchi ?? "(none)"}\n`;
    md += `- Local SMILES: ${r.local.smiles ?? "(none)"}\n`;
    md += `- PubChem canonical SMILES: ${r.pubchem.canonicalSmiles ?? "(none)"}\n`;
    md += `- PubChem IUPAC name: ${r.pubchem.iupacName ?? "(none)"}\n`;
    md += `- PubChem RN values: ${formatList(r.pubchem.rnValues)}\n`;
    md += `- Suggested CAS: ${r.pubchem.preferredCas ?? "(none)"}\n`;
    md += `- Checks: formula=${String(r.checks.formulaMatch)}, inchi=${String(r.checks.inchiMatch)}, smiles=${String(r.checks.smilesMatch)}\n`;
    md += `- Review notes: ${r.checks.notes.length ? r.checks.notes.join("; ") : "none"}\n\n`;
  }
  await writeFile(OUT_MD, md, "utf8");
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
}

await main();
