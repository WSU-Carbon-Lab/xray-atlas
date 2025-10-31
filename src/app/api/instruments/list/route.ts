import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

const querySchema = z.object({
  facility: z.string().min(1),
});

/**
 * GET /api/instruments/list?facility=FACILITY_NAME
 * Returns a list of instruments for a given facility
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      facility: searchParams.get("facility"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Facility parameter is required" },
        { status: 400 },
      );
    }

    const { facility } = parsed.data;

    const instruments = await db.instrument.findMany({
      where: {
        facility: facility,
      },
      select: {
        id: true,
        instrument: true,
        link: true,
      },
      orderBy: {
        instrument: "asc",
      },
    });

    return NextResponse.json({
      instruments: instruments.map((i) => ({
        id: i.id,
        name: i.instrument,
        link: i.link,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch instruments" },
      { status: 500 },
    );
  }
}
