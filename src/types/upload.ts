import type { Prisma } from "@prisma/client";
import { z } from "zod";

export interface MoleculeUploadData {
  commonName: string;
  pubchemCid: string | null;
  casNumber: string | null;
  iupacName: string;
  synonyms: string[];
  smiles: string;
  inchi: string;
  chemicalFormula: string;
}

export const moleculeUploadSchema = z.object({
  commonName: z.string().min(1, "Common name is required"),
  pubchemCid: z.string().nullable(),
  casNumber: z.string().nullable(),
  iupacName: z.string().min(1, "IUPAC name is required"),
  synonyms: z.array(z.string()).default([]),
  smiles: z.string().min(1, "SMILES is required"),
  inchi: z.string().min(1, "InChI is required"),
  chemicalFormula: z.string().min(1, "Chemical formula is required"),
});

export function moleculeUploadDataToPrismaInput(
  data: MoleculeUploadData,
): Omit<Prisma.moleculesCreateInput, "id" | "createdat" | "updatedat"> {
  const allSynonyms = [
    data.commonName.trim(),
    ...data.synonyms.filter((s) => s.trim().length > 0),
  ];
  const uniqueSynonyms = Array.from(new Set(allSynonyms));

  const chemicalFormula = data.chemicalFormula.trim();

  return {
    iupacname: data.iupacName.trim(),
    inchi: data.inchi.trim(),
    smiles: data.smiles.trim(),
    chemicalformula: chemicalFormula,
    casnumber: data.casNumber?.trim() ?? null,
    pubchemcid: data.pubchemCid?.trim() ?? null,
    moleculesynonyms: {
      create: uniqueSynonyms.map((synonym, index) => ({
        synonym: synonym.trim(),
        order: index,
      })),
    },
  } satisfies Omit<
    Prisma.moleculesCreateInput,
    "id" | "createdat" | "updatedat"
  >;
}
