import type { Molecule, Prisma } from "@prisma/client";
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
): Omit<Prisma.MoleculeCreateInput, "id" | "createdAt" | "updatedAt"> {
  // Process synonyms: remove duplicates and exclude common name
  const uniqueSynonyms = Array.from(
    new Set(data.synonyms.filter((s) => s.trim().length > 0)),
  ).filter((synonym) => synonym !== data.commonName);

  // Process chemical formula: trim whitespace (now a single string, not an array)
  const chemicalFormula = data.chemicalFormula.trim();

  // Return input - note: Prisma types may still show array until client is regenerated
  // The actual database schema expects a string
  return {
    iupacName: data.iupacName.trim(),
    commonName: [data.commonName.trim(), ...uniqueSynonyms],
    inchi: data.inchi.trim(),
    smiles: data.smiles.trim(),
    chemicalFormula: chemicalFormula as any, // Type assertion needed until Prisma client is regenerated
    casNumber: data.casNumber?.trim() ?? null,
    pubChemCid: data.pubchemCid?.trim() ?? null,
  } satisfies Omit<
    Prisma.MoleculeCreateInput,
    "id" | "createdAt" | "updatedAt"
  >;
}
