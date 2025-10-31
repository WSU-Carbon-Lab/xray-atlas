import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { upsertMolecule } from "~/server/upload";

const moleculeSchema = z.object({
  name: z.string().min(1),
  iupacName: z.string().min(1),
  synonyms: z.array(z.string()),
  molecularFormula: z.string().min(1),
  image: z.string().url().optional().or(z.string().length(0)),
  smiles: z.string().min(1),
  inchi: z.string().min(1),
  inchiKey: z.string().optional().or(z.string().length(0)),
  casNumber: z.string().optional().or(z.string().length(0)),
  pubChemCid: z.string().optional().or(z.string().length(0)),
});

/**
 * POST /api/molecules/create
 * Creates or updates a molecule in the database
 * Uses the same smart search logic as the upload service to avoid duplicates
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = moleculeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", issues: parsed.error.format() },
      { status: 400 },
    );
  }

  try {
    // Convert empty strings to undefined for optional fields
    const moleculeData = {
      ...parsed.data,
      image: parsed.data.image && parsed.data.image.length > 0 ? parsed.data.image : undefined,
      inchiKey: parsed.data.inchiKey && parsed.data.inchiKey.length > 0 ? parsed.data.inchiKey : undefined,
      casNumber: parsed.data.casNumber && parsed.data.casNumber.length > 0 ? parsed.data.casNumber : undefined,
      pubChemCid: parsed.data.pubChemCid && parsed.data.pubChemCid.length > 0 ? parsed.data.pubChemCid : undefined,
    };

    // Use the shared upsertMolecule function (searches for existing molecules)
    const result = await upsertMolecule(db, moleculeData);

    return NextResponse.json(
      {
        ok: true,
        moleculeId: result.molecule.id,
        created: result.created,
        message: result.created
          ? "Molecule created successfully"
          : "Molecule already exists and was updated",
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to create molecule" },
      { status: 500 },
    );
  }
}
