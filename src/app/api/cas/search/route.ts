import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";

const searchSchema = z.object({
  inchi: z.string().optional(),
  synonym: z.string().optional(),
}).refine((data) => data.inchi || data.synonym, {
  message: "Either InChI or synonym is required",
});

/**
 * Searches CAS Common Chemistry API using InChI string
 * Returns CAS Registry Number (RN) if found
 *
 * According to CAS API docs: InChI can be searched with or without the "InChI=" prefix
 * URL encoding will handle special characters properly
 */
function encodeInChIForCas(inchi: string): string {
  // Remove "InChI=" prefix if present (CAS API accepts both with and without)
  let cleaned = inchi.trim();
  if (cleaned.startsWith("InChI=")) {
    cleaned = cleaned.substring(6);
  }

  // URL encode the InChI string
  // encodeURIComponent will properly encode all special characters
  return encodeURIComponent(cleaned);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = searchSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid request",
          errors: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { inchi, synonym } = validationResult.data;

    if (!env.CAS_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message: "CAS API key not configured",
        },
        { status: 500 },
      );
    }

    // Use InChI if available, otherwise use synonym (name search)
    const searchQuery = inchi
      ? encodeInChIForCas(inchi)
      : encodeURIComponent(synonym!.trim());

    try {
      // Build URL - CAS API supports InChI or name search
      const searchUrl = `https://commonchemistry.cas.org/api/search?q=${searchQuery}`;

      const searchResponse = await fetch(searchUrl, {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-KEY": env.CAS_API_KEY,
        },
      });

      const responseText = await searchResponse.text();

      if (!searchResponse.ok) {
        console.error(
          "CAS API error:",
          searchResponse.status,
          searchResponse.statusText,
          "Response:",
          responseText,
        );
        let errorDetails;
        try {
          errorDetails = JSON.parse(responseText);
        } catch {
          errorDetails = responseText;
        }
        return NextResponse.json(
          {
            ok: false,
            message: `CAS API error: ${searchResponse.statusText}`,
            details: errorDetails,
          },
          { status: searchResponse.status },
        );
      }

      const searchData = JSON.parse(responseText);

      // Debug logging
      console.log("CAS API Response:", JSON.stringify(searchData, null, 2));
      if (inchi) {
        console.log("Original InChI:", inchi);
        console.log("Encoded InChI used:", searchQuery);
      } else {
        console.log("Searching by synonym/name:", synonym);
        console.log("Encoded query used:", searchQuery);
      }

      // Look for the 'rn' key in the response
      // Expected structure: { count: number, results: [{ rn: string, name: string, ... }] }
      let casRegistryNumber: string | null = null;

      // Priority 1: Check for results[0].rn (most common structure)
      if (searchData?.results && Array.isArray(searchData.results) && searchData.results.length > 0) {
        const firstResult = searchData.results[0];
        if (firstResult?.rn) {
          casRegistryNumber = String(firstResult.rn);
          console.log("Found CAS RN in results[0]:", casRegistryNumber);
        } else {
          console.log("results[0] exists but has no 'rn' key");
        }
      } else if (Array.isArray(searchData)) {
        // Fallback: Direct array of results
        const firstResult = searchData[0];
        if (firstResult?.rn) {
          casRegistryNumber = String(firstResult.rn);
          console.log("Found CAS RN in array[0]:", casRegistryNumber);
        } else {
          console.log("Array[0] exists but has no 'rn' key. Array length:", searchData.length);
        }
      } else if (searchData?.rn) {
        // Fallback: Single object with 'rn' key
        casRegistryNumber = String(searchData.rn);
        console.log("Found CAS RN in root object:", casRegistryNumber);
      } else {
        console.log("Unexpected response structure:", Object.keys(searchData || {}));
        console.log("Full response:", JSON.stringify(searchData, null, 2));
      }

      return NextResponse.json({
        ok: true,
        data: {
          casRegistryNumber,
        },
      });
    } catch (error) {
      console.error("Error searching CAS:", error);
      return NextResponse.json(
        {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to search CAS database",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in CAS search:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
