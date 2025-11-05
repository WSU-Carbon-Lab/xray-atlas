import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { MoleculeUploadData } from "~/app/upload/types";
import {
  moleculeUploadDataToPrismaInput,
  moleculeUploadSchema,
} from "~/app/upload/types";

/**
 * Helper function to authenticate user
 */
async function authenticateUser(): Promise<string | null> {
  try {
    const authResult = await auth();
    if (authResult?.userId) return authResult.userId;
  } catch (error) {
    console.error("Auth check failed:", error);
  }

  try {
    const user = await currentUser();
    if (user?.id) return user.id;
  } catch (error) {
    console.error("currentUser check failed:", error);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const userId = await authenticateUser();
    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized - Please sign in to upload molecules",
          details:
            "Authentication failed. Please refresh the page and try again.",
        },
        { status: 401 },
      );
    }

    // Parse request - can be JSON or FormData
    let moleculeData: MoleculeUploadData;
    let moleculeId: string | null = null;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (with image file)
      const formData = await request.formData();

      // Extract molecule data from form fields with proper type handling
      const iupacName = formData.get("iupacName");
      const commonName = formData.get("commonName");
      const synonymsStr = formData.get("synonyms");
      const inchi = formData.get("inchi");
      const smiles = formData.get("smiles");
      const chemicalFormula = formData.get("chemicalFormula");
      const casNumber = formData.get("casNumber");
      const pubchemCid = formData.get("pubchemCid");

      const body = {
        iupacName: typeof iupacName === "string" ? iupacName : "",
        commonName: typeof commonName === "string" ? commonName : "",
        synonyms: (() => {
          try {
            return Array.isArray(JSON.parse((synonymsStr as string) ?? "[]"))
              ? (JSON.parse((synonymsStr as string) ?? "[]") as string[])
              : [];
          } catch {
            return [] as string[];
          }
        })(),
        inchi: typeof inchi === "string" ? inchi : "",
        smiles: typeof smiles === "string" ? smiles : "",
        chemicalFormula:
          typeof chemicalFormula === "string" ? chemicalFormula : "",
        casNumber:
          typeof casNumber === "string" && casNumber.trim().length > 0
            ? casNumber.trim()
            : null,
        pubchemCid:
          typeof pubchemCid === "string" && pubchemCid.trim().length > 0
            ? pubchemCid.trim()
            : null,
      };

      // Validate molecule data
      const validationResult = moleculeUploadSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      moleculeData = validationResult.data;

      // Check for molecule ID (for updates)
      const idFromForm = formData.get("moleculeId");
      if (typeof idFromForm === "string" && idFromForm.trim().length > 0) {
        moleculeId = idFromForm.trim();
      }
    } else {
      // Handle JSON body
      const body = await request.json();

      // Check for molecule ID (for updates)
      if (
        typeof body.moleculeId === "string" &&
        body.moleculeId.trim().length > 0
      ) {
        moleculeId = body.moleculeId.trim();
      }

      // Validate molecule data
      const validationResult = moleculeUploadSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      moleculeData = validationResult.data;
    }

    // Check if molecule already exists (only for new molecules, not updates)
    if (!moleculeId) {
      const existingMolecule = await db.molecule.findUnique({
        where: { iupacName: moleculeData.iupacName },
      });

      if (existingMolecule) {
        return NextResponse.json(
          { error: "A molecule with this IUPAC name already exists" },
          { status: 409 },
        );
      }
    }

    // Convert to Prisma input format
    const prismaInput = moleculeUploadDataToPrismaInput(moleculeData);

    // Ensure all required string fields are non-empty and properly formatted
    if (!prismaInput.iupacName?.trim()) {
      return NextResponse.json(
        { error: "IUPAC name cannot be empty" },
        { status: 400 },
      );
    }
    if (!prismaInput.inchi?.trim()) {
      return NextResponse.json(
        { error: "InChI cannot be empty" },
        { status: 400 },
      );
    }
    if (!prismaInput.smiles?.trim()) {
      return NextResponse.json(
        { error: "SMILES cannot be empty" },
        { status: 400 },
      );
    }
    const commonNameArray = Array.isArray(prismaInput.commonName)
      ? prismaInput.commonName
      : [];
    if (commonNameArray.length === 0) {
      return NextResponse.json(
        { error: "Common name cannot be empty" },
        { status: 400 },
      );
    }

    // Validate chemical formula (now a single string, not an array)
    // Handle both old array type (from Prisma types) and new string type (from schema)
    const chemicalFormulaString =
      typeof prismaInput.chemicalFormula === "string"
        ? prismaInput.chemicalFormula
        : Array.isArray(prismaInput.chemicalFormula)
          ? prismaInput.chemicalFormula.join(", ")
          : "";

    if (!chemicalFormulaString || chemicalFormulaString.trim().length === 0) {
      return NextResponse.json(
        { error: "Chemical formula cannot be empty" },
        { status: 400 },
      );
    }

    // Create Prisma input - ONLY user-provided fields
    // DO NOT include auto-generated fields: id, createdAt, updatedAt
    // DO NOT include relation fields: Sample
    // Note: chemicalFormula is a string in the schema, but Prisma types may still show array until client is regenerated
    const createInput: Prisma.MoleculeCreateInput = {
      iupacName: prismaInput.iupacName,
      commonName: commonNameArray,
      inchi: prismaInput.inchi,
      smiles: prismaInput.smiles,
      chemicalFormula: chemicalFormulaString as any, // Type assertion - schema expects string, types may lag
      casNumber: prismaInput.casNumber ?? null,
      pubChemCid: prismaInput.pubChemCid ?? null,
    };

    // Create molecule in database
    // Database generates UUID using gen_random_uuid() via @default(dbgenerated(...))
    // Prisma auto-generates timestamps via @default(now()) and @updatedAt
    console.log("Creating molecule with input:", {
      iupacName: createInput.iupacName,
      commonNameLength: Array.isArray(createInput.commonName)
        ? createInput.commonName.length
        : 0,
      hasInchi: !!createInput.inchi,
      hasSmiles: !!createInput.smiles,
      chemicalFormula:
        typeof createInput.chemicalFormula === "string"
          ? createInput.chemicalFormula
          : "invalid",
      casNumber: createInput.casNumber,
      pubChemCid: createInput.pubChemCid,
    });

    // Update existing molecule or create new one
    let molecule;
    if (moleculeId) {
      // Update existing molecule
      molecule = await db.molecule.update({
        where: { id: moleculeId },
        data: createInput,
      });

      return NextResponse.json(
        {
          success: true,
          molecule: {
            id: molecule.id,
            iupacName: molecule.iupacName,
          },
          updated: true,
        },
        { status: 200 },
      );
    } else {
      // Create new molecule
      molecule = await db.molecule.create({
        data: createInput,
      });

      return NextResponse.json(
        {
          success: true,
          molecule: {
            id: molecule.id,
            iupacName: molecule.iupacName,
          },
          updated: false,
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("Error uploading molecule:", error);

    if (error instanceof Error) {
      // Handle Prisma unique constraint errors
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "A molecule with this identifier already exists" },
          { status: 409 },
        );
      }

      // Return the actual error message for better debugging
      return NextResponse.json(
        {
          error: error.message ?? "Internal server error",
          details:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: "Unknown error occurred" },
      { status: 500 },
    );
  }
}
