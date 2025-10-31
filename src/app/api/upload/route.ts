import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import {
  createExperimentUpload,
  createExperimentFromIds,
} from "~/server/upload";

const moleculeSchema = z.object({
  name: z.string().min(1),
  iupacName: z.string().min(1),
  synonyms: z.array(z.string()),
  molecularFormula: z.string().min(1),
  image: z.string().url().optional(),
  smiles: z.string().min(1),
  inchi: z.string().min(1),
  inchiKey: z.string().optional(),
  casNumber: z.string().optional(),
  pubChemCid: z.string().optional(),
});

const vendorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
});

const instrumentSchema = z.object({
  facility: z.string().min(1),
  instrument: z.string().min(1),
  link: z.string().url().optional(),
});

const experimentSchema = z.object({
  absorbingAtom: z.string().min(1),
  coreLevel: z.enum(["K", "L1", "L2", "L3", "M1", "M2", "M3"]),
  normalization: z.string().optional(),
  incidentElectricFieldPolarAngle: z.number().optional(),
  incidentElectricFieldAzimuthalAngle: z.number().optional(),
  energy: z.array(z.number()).min(1),
  intensity: z.array(z.number()).min(1),
  izero: z.array(z.number()).min(1),
  izero2: z.array(z.number()).min(1),
});

const payloadSchema = z.object({
  molecule: moleculeSchema,
  vendor: vendorSchema,
  instrument: instrumentSchema,
  experiment: experimentSchema,
});

const payloadWithIdsSchema = z.object({
  moleculeId: z.string().min(1),
  vendorId: z.string().min(1),
  instrumentId: z.string().min(1),
  experiment: experimentSchema,
});

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

  // Try parsing as payload with IDs first (new format)
  const parsedWithIds = payloadWithIdsSchema.safeParse(json);
  if (parsedWithIds.success) {
    try {
      const result = await createExperimentFromIds(userId, parsedWithIds.data);
      return NextResponse.json({ ok: true, ...result }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json(
        { message: err?.message ?? "Failed to save upload" },
        { status: 500 },
      );
    }
  }

  // Try parsing as full payload (old format)
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Validation failed",
        issues: parsed.error.format(),
        hint: "Expected either moleculeId/vendorId/instrumentId or full molecule/vendor/instrument objects",
      },
      { status: 400 },
    );
  }

  const { molecule, vendor, instrument, experiment } = parsed.data;

  try {
    const result = await createExperimentUpload(userId, {
      molecule,
      vendor,
      instrument,
      experiment,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to save upload" },
      { status: 500 },
    );
  }
}
