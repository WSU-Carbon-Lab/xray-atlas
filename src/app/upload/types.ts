import type { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * Type for molecule upload data from the frontend form
 * Note: image is handled separately as a File, so it's not included here
 */
export interface MoleculeUploadData {
  commonName: string;
  pubchemCid: string | null;
  casNumber: string | null;
  iupacName: string;
  synonyms: string[];
  smiles: string;
  inchi: string;
  chemicalFormula: string; // Comma-separated string from form, will be split
}

/**
 * Zod schema for validating MoleculeUploadData
 */
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

/**
 * Converts MoleculeUploadData to Prisma create input
 * Handles deduplication and array transformation
 */
export function moleculeUploadDataToPrismaInput(
  data: MoleculeUploadData,
): Omit<Prisma.moleculesCreateInput, "id" | "createdat" | "updatedat"> {
  // Process synonyms: remove duplicates and include common name
  // The commonName is the primary name to display
  const allSynonyms = [
    data.commonName.trim(),
    ...data.synonyms.filter((s) => s.trim().length > 0),
  ];
  const uniqueSynonyms = Array.from(new Set(allSynonyms));
  const commonNameTrimmed = data.commonName.trim();

  // Process chemical formula: trim whitespace
  const chemicalFormula = data.chemicalFormula.trim();

  // Return input matching the schema
  // The commonName is marked as primary (true), others as false
  return {
    iupacname: data.iupacName.trim(),
    inchi: data.inchi.trim(),
    smiles: data.smiles.trim(),
    chemicalformula: chemicalFormula,
    casnumber: data.casNumber?.trim() ?? null,
    pubchemcid: data.pubchemCid?.trim() ?? null,
    moleculesynonyms: {
      create: uniqueSynonyms.map((synonym) => ({
        synonym: synonym.trim(),
        primary: synonym.trim() === commonNameTrimmed, // Mark commonName as primary
      })),
    },
  } satisfies Omit<
    Prisma.moleculesCreateInput,
    "id" | "createdat" | "updatedat"
  >;
}
