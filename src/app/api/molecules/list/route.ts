import { NextResponse } from "next/server";
import { db } from "~/server/db";

/**
 * GET /api/molecules/list
 * Returns a list of all molecules in the database
 */
export async function GET() {
  try {
    const molecules = await db.molecule.findMany({
      select: {
        id: true,
        name: true,
        molecularFormula: true,
        smiles: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ molecules });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch molecules" },
      { status: 500 },
    );
  }
}
