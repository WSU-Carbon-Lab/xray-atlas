import { db } from "~/server/db";
import { NextResponse } from "next/server";

/**
 * Search for molecules in the database by common name
 * Searches in the commonName array field
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 },
      );
    }

    const searchTerm = query.trim();

    // Use raw SQL for case-insensitive array search
    // PostgreSQL allows us to use unnest and LOWER for case-insensitive matching
    const allMolecules = await db.$queryRaw<Array<{
      id: string;
      iupacName: string;
      commonName: string[];
      inchi: string;
      chemicalFormula: string;
      smiles: string;
      casNumber: string | null;
      pubChemCid: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT * FROM "Molecule"
      WHERE EXISTS (
        SELECT 1 FROM unnest("commonName") AS name
        WHERE LOWER(name) = LOWER(${searchTerm})
      )
      LIMIT 1
    `;

    if (allMolecules.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "No molecules found in database",
        },
        { status: 404 },
      );
    }

    // Return the first match (or we could return all matches)
    const molecule = allMolecules[0];

    // Transform to match the expected format
    return NextResponse.json({
      ok: true,
      data: {
        id: molecule.id,
        iupacName: molecule.iupacName,
        commonName: molecule.commonName,
        synonyms: molecule.commonName.slice(1), // All except first are synonyms
        inchi: molecule.inchi,
        smiles: molecule.smiles,
        chemicalFormula: molecule.chemicalFormula,
        casNumber: molecule.casNumber,
        pubChemCid: molecule.pubChemCid,
        source: "database",
      },
    });
  } catch (error) {
    console.error("Error searching molecules:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
