import type { MoleculeView } from "~/types/molecule";

/**
 * Builds concise molecule detail title and meta description for `generateMetadata` (no keyword stuffing).
 *
 * @param view - Molecule DTO from tRPC `molecules.getById` / `getBySlug`.
 * @returns `title` respects root `metadata.title.template`; `description` stays readable with optional formula, CAS, PubChem CID, and dataset count.
 */
export function buildMoleculeDetailSeoText(view: MoleculeView): {
  title: string;
  description: string;
} {
  const name = view.name.trim();
  const formula = view.chemicalFormula.trim();
  const formulaSuffix = formula.length > 0 ? ` (${formula})` : "";
  const title = `${name}${formulaSuffix} NEXAFS datasets`;

  const lead =
    formula.length > 0
      ? `${name} (${formula}) on X-ray Atlas.`
      : `${name} on X-ray Atlas.`;

  const idParts: string[] = [];
  const cas = view.casNumber?.trim();
  if (cas && cas.length > 0) idParts.push(`CAS ${cas}`);
  const cid = view.pubChemCid?.trim();
  if (cid && cid.length > 0) idParts.push(`PubChem CID ${cid}`);
  const idClause =
    idParts.length > 0 ? ` ${idParts.join("; ")}.` : "";

  const n = view.experimentCount ?? 0;
  const tail =
    n > 0
      ? ` ${n} NEXAFS dataset${n === 1 ? "" : "s"} and linked spectroscopy metadata.`
      : " Molecular identifiers and linked spectroscopy metadata.";

  const description = `${lead}${idClause}${tail}`.replace(/\s+/g, " ").trim();

  return { title, description };
}

/**
 * Production origin used for absolute molecule URLs in JSON-LD `url` and related fields.
 * Matches `metadataBase` in `src/app/metadata.ts`.
 */
export const SITE_CANONICAL_ORIGIN = "https://xrayatlas.wsu.edu";

/**
 * Builds a schema.org JSON-LD node for a public molecule page using `ChemicalSubstance` and
 * `MolecularEntity` types. Omits optional properties when values are empty after trim.
 *
 * @param view - Molecule DTO from `toMoleculeView` / tRPC `molecules.getById` or `getBySlug`.
 * @param canonicalSlug - Path slug from `canonicalMoleculeSlugFromView` (not a UUID).
 * @returns A plain object suitable for `JSON.stringify` inside `application/ld+json`.
 */
export function buildMoleculeChemicalSubstanceJsonLd(
  view: MoleculeView,
  canonicalSlug: string,
): Record<string, unknown> {
  const url = `${SITE_CANONICAL_ORIGIN}/molecules/${canonicalSlug}`;
  const primary = view.name.trim();
  const alternateNames = (view.commonName ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== primary)
    .slice(0, 12);

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["ChemicalSubstance", "MolecularEntity"],
    name: primary,
    url,
  };

  if (alternateNames.length === 1) {
    node.alternateName = alternateNames[0];
  } else if (alternateNames.length > 1) {
    node.alternateName = alternateNames;
  }

  const iupac = view.iupacName.trim();
  if (iupac.length > 0 && iupac !== primary) {
    node.iupacName = iupac;
  }

  const formula = view.chemicalFormula.trim();
  if (formula.length > 0) {
    node.molecularFormula = formula;
  }

  const inchi = view.InChI.trim();
  if (inchi.length > 0) {
    node.inChI = inchi.startsWith("InChI=") ? inchi : `InChI=${inchi}`;
  }

  const smiles = view.SMILES.trim();
  if (smiles.length > 0) {
    node.smiles = smiles;
  }

  const identifiers: Array<Record<string, unknown>> = [];
  const cas = view.casNumber?.trim();
  if (cas && cas.length > 0) {
    identifiers.push({
      "@type": "PropertyValue",
      name: "CAS Registry Number",
      value: cas,
    });
  }
  const cid = view.pubChemCid?.trim();
  if (cid && cid.length > 0) {
    identifiers.push({
      "@type": "PropertyValue",
      name: "PubChem compound",
      value: cid,
    });
  }
  if (identifiers.length === 1) {
    node.identifier = identifiers[0];
  } else if (identifiers.length > 1) {
    node.identifier = identifiers;
  }

  if (cid && cid.length > 0) {
    node.sameAs = `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(cid)}`;
  }

  return node;
}

/**
 * Serializes JSON-LD for a `<script type="application/ld+json">` tag; escapes `<` for HTML embedding.
 *
 * @param data - Object from `buildMoleculeChemicalSubstanceJsonLd`.
 */
export function serializeMoleculeJsonLdScriptContent(
  data: Record<string, unknown>,
): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
