import { NextResponse } from "next/server";
import { db } from "~/server/db";

/**
 * GET /api/instruments/facilities
 * Returns a list of all unique facilities in the database
 */
export async function GET() {
  try {
    const facilities = await db.instrument.findMany({
      select: {
        facility: true,
      },
      distinct: ["facility"],
      orderBy: {
        facility: "asc",
      },
    });

    return NextResponse.json({
      facilities: facilities.map((f) => f.facility),
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch facilities" },
      { status: 500 },
    );
  }
}
