import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";

/**
 * Encodes InChI string for CAS API
 * According to CAS API docs: InChI can be searched with or without the "InChI=" prefix
 */
function encodeInChIForCas(inchi: string): string {
  let cleaned = inchi.trim();
  if (cleaned.startsWith("InChI=")) {
    cleaned = cleaned.substring(6);
  }
  return encodeURIComponent(cleaned);
}

export const externalRouter = createTRPCRouter({
  searchCas: publicProcedure
    .input(
      z
        .object({
          inchi: z.string().optional(),
          synonym: z.string().optional(),
          casNumber: z.string().optional(),
        })
        .refine(
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- We want to reject empty strings, not just null/undefined
          (data) => data.inchi || data.synonym || data.casNumber,
          {
            message: "Either InChI, synonym, or CAS number is required",
          },
        ),
    )
    .query(async ({ input }) => {
      if (!env.CAS_API_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "CAS API key not configured",
        });
      }

      const { inchi, synonym, casNumber } = input;
      let searchQuery: string;

      if (casNumber) {
        // If CAS number is provided, search by it directly
        searchQuery = encodeURIComponent(casNumber.trim());
      } else if (inchi) {
        searchQuery = encodeInChIForCas(inchi);
      } else {
        searchQuery = encodeURIComponent(synonym!.trim());
      }

      try {
        const searchUrl = `https://commonchemistry.cas.org/api/search?q=${searchQuery}`;

        const searchResponse = await fetch(searchUrl, {
          method: "GET",
          headers: {
            accept: "application/json",
            "X-API-KEY": env.CAS_API_KEY,
          },
        });

        const responseText = await searchResponse.text();
        const contentType = searchResponse.headers.get("content-type") ?? "";

        if (!searchResponse.ok) {
          console.error(
            "CAS API error:",
            searchResponse.status,
            searchResponse.statusText,
            "Response:",
            responseText,
          );
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: `CAS API error: ${searchResponse.statusText}`,
          });
        }

        if (!contentType.toLowerCase().includes("application/json")) {
          console.error(
            "CAS API returned unexpected content type:",
            contentType,
            responseText.slice(0, 200),
          );
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: "CAS API returned an unexpected response format",
          });
        }

        if (!responseText.trim()) {
          console.error("CAS API returned an empty response body");
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: "CAS API returned an empty response",
          });
        }

        type CasSearchData =
          | {
              results?: Array<{ rn?: unknown; name?: string | null }>;
              rn?: unknown;
              name?: string | null;
            }
          | Array<{ rn?: unknown; name?: string | null }>
          | null;

        let searchData: CasSearchData;
        try {
          searchData = JSON.parse(responseText) as CasSearchData;
        } catch (parseError) {
          console.error(
            "CAS API returned invalid JSON:",
            (parseError as Error).message,
            responseText.slice(0, 200),
          );
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: "CAS API returned malformed JSON",
          });
        }

        // Extract CAS Registry Number from various possible response structures
        let casRegistryNumber: string | null = null;

        if (
          searchData &&
          !Array.isArray(searchData) &&
          searchData.results &&
          Array.isArray(searchData.results) &&
          searchData.results.length > 0
        ) {
          const firstResult = searchData.results[0];
          if (firstResult?.rn !== null && firstResult?.rn !== undefined) {
            const rnValue = firstResult.rn;
            if (typeof rnValue === "string") {
              casRegistryNumber = rnValue;
            } else if (typeof rnValue === "number") {
              casRegistryNumber = String(rnValue);
            } else {
              casRegistryNumber = JSON.stringify(rnValue);
            }
          }
        } else if (Array.isArray(searchData) && searchData.length > 0) {
          const firstResult = searchData[0];
          if (firstResult?.rn !== null && firstResult?.rn !== undefined) {
            const rnValue = firstResult.rn;
            if (typeof rnValue === "string") {
              casRegistryNumber = rnValue;
            } else if (typeof rnValue === "number") {
              casRegistryNumber = String(rnValue);
            } else {
              casRegistryNumber = JSON.stringify(rnValue);
            }
          }
        } else if (
          searchData &&
          !Array.isArray(searchData) &&
          searchData.rn !== null &&
          searchData.rn !== undefined
        ) {
          const rnValue = searchData.rn;
          if (typeof rnValue === "string") {
            casRegistryNumber = rnValue;
          } else if (typeof rnValue === "number") {
            casRegistryNumber = String(rnValue);
          } else {
            casRegistryNumber = JSON.stringify(rnValue);
          }
        }

        // Also get the molecule name from CAS if available
        let moleculeName: string | null = null;
        if (casRegistryNumber) {
          try {
            const detailUrl = `https://commonchemistry.cas.org/api/detail?cas_rn=${encodeURIComponent(casRegistryNumber)}`;
            const detailResponse = await fetch(detailUrl, {
              method: "GET",
              headers: {
                accept: "application/json",
                "X-API-KEY": env.CAS_API_KEY,
              },
            });

            if (detailResponse.ok) {
              const detailData = (await detailResponse.json()) as {
                name?: string | { name?: string } | null;
                molecule?: { name?: string | null } | null;
              } | null;
              // CAS API returns name in different possible fields
              if (detailData) {
                if (typeof detailData.name === "string") {
                  moleculeName = detailData.name;
                } else if (
                  detailData.name &&
                  typeof detailData.name === "object" &&
                  "name" in detailData.name &&
                  typeof detailData.name.name === "string"
                ) {
                  moleculeName = detailData.name.name;
                } else if (
                  detailData.molecule &&
                  typeof detailData.molecule === "object" &&
                  "name" in detailData.molecule &&
                  typeof detailData.molecule.name === "string"
                ) {
                  moleculeName = detailData.molecule.name;
                }
              }
            }
          } catch (error) {
            console.warn("Could not fetch molecule name from CAS:", error);
          }
        }

        // Also try to get name from search results if not found in detail
        if (!moleculeName) {
          if (
            searchData &&
            !Array.isArray(searchData) &&
            searchData.results &&
            Array.isArray(searchData.results) &&
            searchData.results.length > 0
          ) {
            const firstResultName = searchData.results[0]?.name;
            if (typeof firstResultName === "string") {
              moleculeName = firstResultName;
            }
          } else if (Array.isArray(searchData) && searchData.length > 0) {
            const firstResultName = searchData[0]?.name;
            if (typeof firstResultName === "string") {
              moleculeName = firstResultName;
            }
          }
        }

        return {
          ok: true,
          data: {
            casRegistryNumber,
            moleculeName,
          },
        };
      } catch (error) {
        console.error("Error searching CAS:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to search CAS database",
        });
      }
    }),

  searchPubchem: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, "Query is required"),
        type: z.enum(["name", "cid", "smiles"]).default("name"),
      }),
    )
    .query(async ({ input }) => {
      const { query, type } = input;
      let cid: string | null = null;

      // If searching by CID directly, use it
      if (type === "cid") {
        cid = query.trim();
      } else {
        // Search by name or SMILES to get CID
        const searchUrl =
          type === "smiles"
            ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(query)}/cids/JSON`
            : `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`;

        try {
          const searchResponse = await fetch(searchUrl, {
            headers: { Accept: "application/json" },
          });

          if (!searchResponse.ok) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Compound not found in PubChem",
            });
          }

          const searchData = (await searchResponse.json()) as {
            IdentifierList?: { CID?: unknown[] | null } | null;
          } | null;
          const cids = searchData?.IdentifierList?.CID;

          if (!Array.isArray(cids) || cids.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Compound not found in PubChem",
            });
          }

          const firstCid = cids[0];
          if (firstCid === null || firstCid === undefined) {
            cid = null;
          } else if (typeof firstCid === "string") {
            cid = firstCid;
          } else if (typeof firstCid === "number") {
            cid = String(firstCid);
          } else {
            cid = JSON.stringify(firstCid);
          }
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to search PubChem",
          });
        }
      }

      if (!cid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Compound not found in PubChem",
        });
      }

      // Fetch all data in parallel
      const [propertiesResponse, synonymsResponse, imageResponse] =
        await Promise.allSettled([
          fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName,CanonicalSMILES,InChI,InChIKey,MolecularFormula/JSON`,
            { headers: { Accept: "application/json" } },
          ),
          fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
            { headers: { Accept: "application/json" } },
          ),
          fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`,
          ),
        ]);

      // Parse properties
      let iupacName = "";
      let smiles = "";
      let inchi = "";
      let inchiKey = "";
      let chemicalFormula = "";

      if (
        propertiesResponse.status === "fulfilled" &&
        propertiesResponse.value.ok
      ) {
        const propertiesData = (await propertiesResponse.value.json()) as {
          PropertyTable?: {
            Properties?: Array<{
              IUPACName?: string | null;
              CanonicalSMILES?: string | null;
              InChI?: string | null;
              InChIKey?: string | null;
              MolecularFormula?: string | null;
            } | null> | null;
          } | null;
        } | null;
        const props = propertiesData?.PropertyTable?.Properties?.[0];

        if (props) {
          iupacName =
            typeof props.IUPACName === "string" ? props.IUPACName : "";
          smiles =
            typeof props.CanonicalSMILES === "string"
              ? props.CanonicalSMILES
              : "";
          inchi = typeof props.InChI === "string" ? props.InChI : "";
          inchiKey = typeof props.InChIKey === "string" ? props.InChIKey : "";
          chemicalFormula =
            typeof props.MolecularFormula === "string"
              ? props.MolecularFormula
              : "";
        }
      }

      // Parse synonyms
      let synonyms: string[] = [];
      if (
        synonymsResponse.status === "fulfilled" &&
        synonymsResponse.value.ok
      ) {
        const synonymsData = (await synonymsResponse.value.json()) as {
          InformationList?: {
            Information?: Array<{
              Synonym?: unknown[] | null;
            } | null> | null;
          } | null;
        } | null;
        const synList =
          synonymsData?.InformationList?.Information?.[0]?.Synonym;

        if (Array.isArray(synList)) {
          synonyms = synList
            .filter((s: unknown): s is string => typeof s === "string")
            .slice(0, 50);
        }
      }

      // Handle image
      let imageData: string | null = null;
      if (imageResponse.status === "fulfilled" && imageResponse.value.ok) {
        try {
          const imageBlob = await imageResponse.value.blob();
          const arrayBuffer = await imageBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          imageData = `data:image/png;base64,${base64}`;
        } catch (error) {
          console.warn("Could not fetch image:", error);
        }
      }

      // Get CAS number
      let casNumber: string | null = null;
      try {
        const xrefResponse = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/RegistryNumber/JSON`,
          { headers: { Accept: "application/json" } },
        );

        if (xrefResponse.ok) {
          const xrefData = (await xrefResponse.json()) as {
            InformationList?: {
              Information?: Array<{
                RegistryNumber?: unknown[] | null;
              } | null> | null;
            } | null;
          } | null;
          const registryNumbers =
            xrefData?.InformationList?.Information?.[0]?.RegistryNumber;

          if (Array.isArray(registryNumbers) && registryNumbers.length > 0) {
            const casCandidate = registryNumbers.find(
              (rn: unknown): rn is string => {
                if (typeof rn !== "string") return false;
                return /^\d{2,7}-\d{2}-\d$/.test(rn);
              },
            );
            if (casCandidate) {
              casNumber = casCandidate;
            }
          }
        }
      } catch (error) {
        console.warn("Could not fetch CAS number:", error);
      }

      // Extract InChI Key from InChI if not found
      if (!inchiKey && inchi) {
        const keyRegex = /Key=([A-Z]{14}-[A-Z]{10}(-[A-Z])?)/;
        const keyMatch = keyRegex.exec(inchi);
        if (keyMatch?.[1]) {
          inchiKey = keyMatch[1];
        }
      }

      // Determine IUPAC name vs common name
      const isLikelyIUPACName = (name: string): boolean => {
        if (!name) return false;
        return name.length > 50 || name.includes("(") || name.includes("[");
      };

      let finalIUPACName = iupacName;
      let finalCommonName = "";
      let finalSynonyms = [...synonyms];

      if (iupacName && !isLikelyIUPACName(iupacName)) {
        const betterIUPAC = synonyms.find((s) => isLikelyIUPACName(s));
        if (betterIUPAC) {
          finalIUPACName = betterIUPAC;
          finalSynonyms = synonyms.filter((s) => s !== betterIUPAC);
          finalCommonName = iupacName;
        } else {
          finalCommonName =
            synonyms.length > 0 && synonyms[0]
              ? synonyms[0]
              : (iupacName ?? "");
          finalSynonyms = synonyms.slice(1);
        }
      } else {
        finalCommonName =
          synonyms.length > 0 && synonyms[0] ? synonyms[0] : query;
        finalSynonyms = synonyms.slice(1);
      }

      // Fallback: if no IUPAC name found, use the first long synonym
      if (!finalIUPACName && synonyms.length > 0) {
        const longSynonym = synonyms.find((s) => isLikelyIUPACName(s));
        if (longSynonym) {
          finalIUPACName = longSynonym;
          finalSynonyms = synonyms.filter((s) => s !== longSynonym);
          finalCommonName = synonyms.find((s) => s !== longSynonym) ?? query;
        } else {
          finalIUPACName = synonyms[0] ?? query;
          finalCommonName =
            synonyms.length > 1 && synonyms[1] ? synonyms[1] : query;
          finalSynonyms = synonyms.slice(2);
        }
      }

      // Final fallback if still no IUPAC name
      if (!finalIUPACName) {
        finalIUPACName = query;
      }
      if (!finalCommonName) {
        finalCommonName =
          finalSynonyms.length > 0 && finalSynonyms[0]
            ? finalSynonyms[0]
            : query;
        finalSynonyms = finalSynonyms.slice(1);
      }

      return {
        ok: true,
        data: {
          iupacName: finalIUPACName,
          commonName: finalCommonName,
          synonyms: finalSynonyms,
          chemicalFormula,
          smiles,
          inchi,
          inchiKey,
          casNumber,
          pubChemCid: cid,
          image: imageData,
          source: "pubchem",
        },
      };
    }),
});
