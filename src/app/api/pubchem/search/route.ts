import { NextResponse } from "next/server";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(["name", "smiles"]).default("name"),
});

type PubChemCompound = {
  CID: number;
  IUPACName?: string;
  CanonicalSMILES?: string;
  SMILES?: string;
  InChI?: string;
  InChIKey?: string;
  MolecularFormula?: string;
};

/**
 * POST /api/pubchem/search
 * Searches PubChem database by name or SMILES
 * Returns molecule information that can be imported into the form
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", issues: parsed.error.format() },
      { status: 400 },
    );
  }

  const { query, type } = parsed.data;

  try {
    let cid: number | null = null;

    // Step 1: Search by name or SMILES to get CID
    // Format: https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/{input_type}/{input}/{operation}/{output}
    // Example: https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/CC(=O)Oc1ccccc1C(=O)O/cids/JSON
    if (type === "smiles") {
      // Search by SMILES - URL encode the SMILES string to handle special characters like parentheses
      const encodedSmiles = encodeURIComponent(query);
      const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodedSmiles}/cids/JSON`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!searchRes.ok) {
        const errorText = await searchRes
          .text()
          .catch(() => searchRes.statusText);
        throw new Error(
          `PubChem SMILES search failed (${searchRes.status}): ${errorText}`,
        );
      }

      const searchData = await searchRes.json();
      if (
        searchData.IdentifierList?.CID &&
        Array.isArray(searchData.IdentifierList.CID) &&
        searchData.IdentifierList.CID.length > 0
      ) {
        cid = searchData.IdentifierList.CID[0];
      }
    } else {
      // Search by name
      const encodedName = encodeURIComponent(query);
      const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodedName}/cids/JSON`;

      const searchRes = await fetch(searchUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!searchRes.ok) {
        const errorText = await searchRes
          .text()
          .catch(() => searchRes.statusText);
        throw new Error(
          `PubChem name search failed (${searchRes.status}): ${errorText}`,
        );
      }

      const searchData = await searchRes.json();
      if (
        searchData.IdentifierList?.CID &&
        Array.isArray(searchData.IdentifierList.CID) &&
        searchData.IdentifierList.CID.length > 0
      ) {
        cid = searchData.IdentifierList.CID[0];
      }
    }

    if (!cid) {
      return NextResponse.json(
        { message: "No compound found in PubChem" },
        { status: 404 },
      );
    }

    // Step 2: Get detailed properties using CID
    // Format: https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/{properties}/JSON
    // Example: https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/MolecularFormula,InChIKey/JSON
    // Valid property names (case-sensitive): MolecularFormula, CanonicalSMILES, IsomericSMILES, InChI, InChIKey, IUPACName
    // Note: CAS and Title are not direct properties - we'll get them differently
    const properties = [
      "MolecularFormula",
      "CanonicalSMILES",
      "SMILES",
      "InChI",
      "InChIKey",
      "IUPACName",
    ];

    const propertiesUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${properties.join(",")}/JSON`;
    const propertiesRes = await fetch(propertiesUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!propertiesRes.ok) {
      const errorText = await propertiesRes
        .text()
        .catch(() => propertiesRes.statusText);
      throw new Error(
        `Failed to fetch compound properties (${propertiesRes.status}): ${errorText}`,
      );
    }

    const propertiesData = await propertiesRes.json();
    const compound = propertiesData.PropertyTable?.Properties?.[0] as
      | PubChemCompound
      | undefined;

    if (!compound) {
      return NextResponse.json(
        { message: "Failed to retrieve compound properties" },
        { status: 500 },
      );
    }

    // Step 3: Get synonyms for additional names, title, and CAS number
    let synonyms: string[] = [];
    let title = query; // Default to search query
    let casNumber = "";

    try {
      const synonymsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
      const synonymsRes = await fetch(synonymsUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (synonymsRes.ok) {
        const synonymsData = await synonymsRes.json();
        const synonymList =
          synonymsData.InformationList?.Information?.[0]?.Synonym;
        if (Array.isArray(synonymList) && synonymList.length > 0) {
          // Use the first synonym as the common name/title
          title = synonymList[0];

          // Look for CAS number pattern (digits-separated by hyphens: XX-XX-X format)
          const casPattern = /^\d{2,7}-\d{2}-\d$/;
          const casMatch = synonymList.find((s: string) => casPattern.test(s));
          if (casMatch) {
            casNumber = casMatch;
          }

          // Filter synonyms: exclude the title and CAS number, limit to reasonable number
          synonyms = synonymList
            .filter((s: string) => s !== title && s !== casNumber)
            .slice(0, 10); // Limit to first 10 synonyms
        }
      }
    } catch (err) {
      // Synonyms are optional, continue without them
      console.warn("Failed to fetch synonyms:", err);
    }

    // InChI should already be in compound.InChI from the properties call
    const inchi = compound.InChI || "";

    // Get SMILES: prefer CanonicalSMILES, fall back to SMILES
    const smiles = compound.CanonicalSMILES || compound.SMILES || "";

    // Format response to match our molecule form structure
    const result = {
      name: title || query,
      iupacName: compound.IUPACName || title || "",
      synonyms: synonyms,
      molecularFormula: compound.MolecularFormula || "",
      smiles: smiles,
      inchi: inchi || "",
      inchiKey: compound.InChIKey || "",
      casNumber: casNumber || "",
      pubChemCid: cid.toString(),
      pubChemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      image: `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to search PubChem" },
      { status: 500 },
    );
  }
}
