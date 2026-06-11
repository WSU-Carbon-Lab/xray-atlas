import type { Prisma } from "~/prisma/browser";
import { z } from "zod";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import {
  formatMoleculeFormulaForKind,
  MOLECULE_COMPOUND_KINDS,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";

export interface MoleculeUploadData {
  commonName: string;
  pubchemCid: string | null;
  casNumber: string | null;
  iupacName: string;
  synonyms: string[];
  smiles: string;
  inchi: string;
  chemicalFormula: string;
  tagIds?: string[];
  compoundKind?: MoleculeCompoundKind;
  registryStub?: boolean;
}

export const moleculeUploadSchema = z
  .object({
    commonName: z.string().min(1, "Common name is required"),
    pubchemCid: z.string().nullable(),
    casNumber: z.string().nullable(),
    iupacName: z.string().min(1, "IUPAC name is required"),
    synonyms: z.array(z.string()).default([]),
    smiles: z.string(),
    inchi: z.string(),
    chemicalFormula: z.string().min(1, "Chemical formula is required"),
    tagIds: z.array(z.string().uuid()).optional(),
    compoundKind: z.enum(MOLECULE_COMPOUND_KINDS).default("small_molecule"),
    registryStub: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.registryStub) {
      const hasExternalId =
        (data.pubchemCid?.trim().length ?? 0) > 0 ||
        (data.casNumber?.trim().length ?? 0) > 0;
      if (!hasExternalId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Registry stub entries require PubChem CID or CAS registry number.",
          path: ["pubchemCid"],
        });
      }
      return;
    }
    if (!data.smiles.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SMILES is required unless registry stub mode is enabled.",
        path: ["smiles"],
      });
    }
    if (!data.inchi.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "InChI is required unless registry stub mode is enabled.",
        path: ["inchi"],
      });
    }
  });

/** Placeholder structure identifiers persisted for deferred-depiction stub rows. */
export const MOLECULE_REGISTRY_STUB_SMILES = "." as const;
export const MOLECULE_REGISTRY_STUB_INCHI = "InChI=1S//" as const;

/**
 * Normalizes contribute payload for Prisma create/update, including polymer
 * formula formatting and registry stub placeholders.
 *
 * @param data - Validated molecule upload payload from the registry form.
 */
export function normalizeMoleculeUploadForPersistence(
  data: MoleculeUploadData,
): MoleculeUploadData {
  const compoundKind = data.compoundKind ?? "small_molecule";
  const formattedFormula = formatMoleculeFormulaForKind(
    data.chemicalFormula,
    compoundKind,
  );
  const commonName = data.commonName.trim();
  const iupacName =
    data.iupacName.trim().length > 0 ? data.iupacName.trim() : commonName;

  if (data.registryStub) {
    return {
      ...data,
      commonName,
      iupacName,
      chemicalFormula: formattedFormula,
      smiles: data.smiles.trim() || MOLECULE_REGISTRY_STUB_SMILES,
      inchi: data.inchi.trim() || MOLECULE_REGISTRY_STUB_INCHI,
    };
  }

  return {
    ...data,
    commonName,
    iupacName,
    chemicalFormula: formattedFormula,
    smiles: data.smiles.trim(),
    inchi: data.inchi.trim(),
  };
}

export function moleculeUploadDataToPrismaInput(
  data: MoleculeUploadData,
): Omit<Prisma.moleculesCreateInput, "id" | "createdat" | "updatedat"> {
  const normalized = normalizeMoleculeUploadForPersistence(data);
  const allSynonyms = [
    normalized.commonName.trim(),
    ...normalized.synonyms.filter((s) => s.trim().length > 0),
  ];
  const uniqueSynonyms = Array.from(new Set(allSynonyms));

  const chemicalFormula = normalized.chemicalFormula.trim();

  return {
    iupacname: normalized.iupacName.trim(),
    inchi: normalized.inchi.trim(),
    smiles: normalized.smiles.trim(),
    chemicalformula: chemicalFormula,
    casnumber: normalized.casNumber?.trim() ?? null,
    pubchemcid: normalized.pubchemCid?.trim() ?? null,
    moleculesynonyms: {
      create: uniqueSynonyms.map((synonym, index) => ({
        synonym: synonym.trim(),
        slug: slugifyMoleculeSynonym(synonym),
        order: index,
      })),
    },
  } satisfies Omit<
    Prisma.moleculesCreateInput,
    "id" | "createdat" | "updatedat"
  >;
}
