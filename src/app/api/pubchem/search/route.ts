import { NextResponse } from "next/server";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(1, "Query is required"),
  type: z.enum(["name", "cid", "smiles"]).default("name"),
});

/**
 * Searches PubChem database for molecule information using PubChem PUG REST API
 * Supports searching by name, PubChem CID, or SMILES
 *
 * Returns data structured to match Prisma schema:
 * - iupacName: single string (required, unique in Prisma)
 * - commonName: string array (all synonyms excluding IUPAC name)
 * - chemicalFormula: string array (molecular formula, Prisma expects array)
 * - smiles, inchi, casNumber, pubChemCid: strings as defined in schema
 *
 * Uses PubChem PUG REST API endpoints:
 * - /property/ for molecular properties (IUPACName, CanonicalSMILES, InChI, InChIKey, MolecularFormula)
 * - /synonyms/ for all compound synonyms and common names
 * - /description/ for compound descriptions
 * - /xrefs/RegistryNumber/ for CAS numbers
 * - /PNG for structure images
 */
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

    const { query, type } = validationResult.data;
    let cid: string | null = null;

    // If searching by CID directly, use it
    if (type === "cid") {
      cid = query.trim();
    }
    // If searching by name or SMILES, first get the CID
    else {
      try {
        const searchUrl =
          type === "smiles"
            ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(query)}/cids/JSON`
            : `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`;

        const searchResponse = await fetch(searchUrl, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!searchResponse.ok) {
          throw new Error(`PubChem search failed: ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        const cids = searchData?.IdentifierList?.CID;

        if (!cids || cids.length === 0) {
          return NextResponse.json(
            {
              ok: false,
              message: `No results found for "${query}"`,
            },
            { status: 404 },
          );
        }

        // Use the first CID found
        cid = String(cids[0]);
      } catch (error) {
        console.error("Error searching PubChem:", error);
        return NextResponse.json(
          {
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to search PubChem database",
          },
          { status: 500 },
        );
      }
    }

    if (!cid) {
      return NextResponse.json(
        {
          ok: false,
          message: "Could not determine PubChem CID",
        },
        { status: 404 },
      );
    }

    // Fetch detailed information using the CID
    try {
      // Fetch multiple properties in parallel
      const [
        propertyResponse,
        synonymsResponse,
        imageResponse,
      ] = await Promise.allSettled([
        // Basic properties - include InChIKey as separate property
        // Request CanonicalSMILES, SMILES, and IsomericSMILES for fallback
        fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,InChI,InChIKey,CanonicalSMILES,SMILES,IsomericSMILES,IUPACName/JSON`,
          { headers: { Accept: "application/json" } },
        ),
        // Synonyms - get all synonyms including common names
        fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
          { headers: { Accept: "application/json" } },
        ),
        // Image
        fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`,
          { headers: { Accept: "image/png" } },
        ),
      ]);

      // Parse property response
      let molecularFormula = "";
      let inchi = "";
      let smiles = "";
      let iupacName = "";
      let inchiKey = "";

      if (propertyResponse.status === "fulfilled") {
        try {
          const propertyData = await propertyResponse.value.json();
          const properties = propertyData?.PropertyTable?.Properties?.[0];

          if (properties) {
            molecularFormula = properties.MolecularFormula || "";
            inchi = properties.InChI || "";
            inchiKey = properties.InChIKey || "";
            // Priority: CanonicalSMILES > SMILES > IsomericSMILES > empty string
            smiles =
              properties.CanonicalSMILES ||
              properties.SMILES ||
              properties.IsomericSMILES ||
              "";
            iupacName = properties.IUPACName || "";

            // Debug logging for SMILES
            if (!smiles) {
              console.warn(
                `No SMILES found for CID ${cid}. Available properties:`,
                Object.keys(properties),
              );
            }
          } else {
            console.warn(
              `No properties found in response for CID ${cid}:`,
              propertyData,
            );
          }
        } catch (error) {
          console.error("Error parsing property response:", error);
          // Continue without properties
        }
      } else if (propertyResponse.status === "rejected") {
        console.error(
          "Property fetch failed:",
          propertyResponse.reason,
        );
      }

      // Parse synonyms response
      let synonyms: string[] = [];
      if (synonymsResponse.status === "fulfilled") {
        const synonymsData = await synonymsResponse.value.json();
        const synonymList = synonymsData?.InformationList?.Information?.[0]?.Synonym;

        if (Array.isArray(synonymList)) {
          // Filter out very long synonyms, IUPAC names, and duplicates
          // Remove IUPAC name from synonyms as it's stored separately
          synonyms = Array.from(
            new Set(
              synonymList
                .filter((s: string) => {
                  if (!s || s.length >= 200) return false;
                  // Exclude IUPAC name if it matches
                  if (iupacName && s.toLowerCase() === iupacName.toLowerCase()) {
                    return false;
                  }
                  return true;
                })
                .slice(0, 50), // Limit to first 50 synonyms
            ),
          );
        }
      }

      // Description removed - not in Prisma schema

      // Handle image response
      let imageData: string | null = null;
      if (imageResponse.status === "fulfilled" && imageResponse.value.ok) {
        try {
          const imageBlob = await imageResponse.value.blob();
          // Convert to base64 data URL
          const arrayBuffer = await imageBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          imageData = `data:image/png;base64,${base64}`;
        } catch (error) {
          console.warn("Could not fetch image:", error);
          // Continue without image
        }
      }

      // Get CAS number and other identifiers from PubChem if available
      // This requires an additional API call to get all properties
      let casNumber: string | null = null;
      try {
        const xrefResponse = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/RegistryNumber/JSON`,
          { headers: { Accept: "application/json" } },
        );

        if (xrefResponse.ok) {
          const xrefData = await xrefResponse.json();
          const registryNumbers =
            xrefData?.InformationList?.Information?.[0]?.RegistryNumber;

          if (Array.isArray(registryNumbers) && registryNumbers.length > 0) {
            // CAS numbers typically start with digits and have format XXX-XX-X
            const casCandidate = registryNumbers.find((rn: string) =>
              /^\d{2,7}-\d{2}-\d$/.test(rn),
            );
            if (casCandidate) {
              casNumber = casCandidate;
            }
          }
        }
      } catch (error) {
        // Non-critical, continue without CAS number
        console.warn("Could not fetch CAS number:", error);
      }

      // If InChIKey wasn't found in properties, try to extract from InChI string
      if (!inchiKey && inchi) {
        // Try to extract InChI Key from InChI string (format: InChI=1S/.../.../Key-...)
        const keyMatch = inchi.match(/Key=([A-Z]{14}-[A-Z]{10}(-[A-Z])?)/);
        if (keyMatch && keyMatch[1]) {
          inchiKey = keyMatch[1];
        }
      }

      // Determine IUPAC name vs common name
      // IUPAC names are typically long systematic names (50+ chars)
      // Short names like "PC61BM" are likely common names, not IUPAC names
      const isLikelyIUPACName = (name: string): boolean => {
        if (!name) return false;
        // IUPAC names are typically longer and contain systematic naming patterns
        // If the IUPACName property exists and is reasonable length, use it
        // Otherwise, if we have synonyms, prefer longer systematic names
        return name.length > 50 || name.includes("(") || name.includes("[");
      };

      let finalIUPACName = iupacName;
      let finalCommonName = "";
      let finalSynonyms = [...synonyms];

      // If IUPAC name from properties is short (likely not a real IUPAC name),
      // check synonyms for a better IUPAC name
      if (iupacName && !isLikelyIUPACName(iupacName)) {
        // The "IUPAC name" is probably actually a common name
        // Look for a better IUPAC name in synonyms (longer, more systematic)
        const betterIUPAC = synonyms.find((s) => isLikelyIUPACName(s));
        if (betterIUPAC) {
          finalIUPACName = betterIUPAC;
          finalSynonyms = synonyms.filter((s) => s !== betterIUPAC);
          finalCommonName = iupacName; // The original "IUPAC" is actually common name
        } else {
          // No better IUPAC found, use the short one as IUPAC and first synonym as common
          finalCommonName = synonyms.length > 0 ? synonyms[0] : iupacName;
          finalSynonyms = synonyms.slice(1);
        }
      } else {
        // We have a proper IUPAC name, use first synonym as common name
        finalCommonName = synonyms.length > 0 ? synonyms[0] : query;
        finalSynonyms = synonyms.slice(1);
      }

      // Fallback: if no IUPAC name found, use the first long synonym
      if (!finalIUPACName && synonyms.length > 0) {
        const longSynonym = synonyms.find((s) => isLikelyIUPACName(s));
        if (longSynonym) {
          finalIUPACName = longSynonym;
          finalSynonyms = synonyms.filter((s) => s !== longSynonym);
          finalCommonName = synonyms.find((s) => s !== longSynonym) || query;
        } else {
          // No good IUPAC name found, use first synonym as IUPAC, second as common
          finalIUPACName = synonyms[0] || query;
          finalCommonName = synonyms.length > 1 ? synonyms[1] : query;
          finalSynonyms = synonyms.slice(2);
        }
      }

      // Final fallback if still no IUPAC name
      if (!finalIUPACName) {
        finalIUPACName = query;
      }
      if (!finalCommonName) {
        finalCommonName = finalSynonyms.length > 0 ? finalSynonyms[0] : query;
        finalSynonyms = finalSynonyms.slice(1);
      }

      // Return data structured to match Prisma schema:
      // - iupacName: single string (required, unique)
      // - commonName: string array (synonyms excluding IUPAC name)
      // - chemicalFormula: string array (typically one value, but Prisma expects array)
      // - All other fields as defined in schema
      return NextResponse.json({
        ok: true,
        data: {
          // For display in form - single common name field
          name: finalCommonName,
          // Prisma schema fields - matching exactly
          iupacName: finalIUPACName,
          // commonName as array (common name + remaining synonyms)
          commonName: finalCommonName
            ? [finalCommonName, ...finalSynonyms]
            : finalSynonyms.length > 0
              ? finalSynonyms
              : [query],
          // chemicalFormula as array (Prisma expects array)
          chemicalFormula: molecularFormula
            ? [molecularFormula]
            : [],
          synonyms: finalSynonyms, // Remaining synonyms for form display
          smiles: smiles || "",
          inchi: inchi || "",
          inchiKey: inchiKey || null,
          casNumber: casNumber,
          pubChemCid: cid,
          image: imageData,
          pubChemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
        },
      });
    } catch (error) {
      console.error("Error fetching PubChem details:", error);
      return NextResponse.json(
        {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch molecule details from PubChem",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in PubChem search:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}
