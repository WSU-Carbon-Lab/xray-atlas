import { NextResponse } from "next/server";
import { db } from "~/server/db";

/**
 * GET /api/vendors/list
 * Returns a list of all vendors in the database
 */
export async function GET() {
  try {
    const vendors = await db.vendor.findMany({
      select: {
        id: true,
        name: true,
        url: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ vendors });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch vendors" },
      { status: 500 },
    );
  }
}
