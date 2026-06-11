import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";
import {
  extractCasRegistryFromSynonyms,
  isLikelyChemicalFormula,
  pickPubChemDisplayTitle,
  pickPubChemSmiles,
  type PubChemCandidateSummary,
  type PubChemPropertyRow,
  PUBCHEM_COMPOUND_PROPERTY_QUERY,
} from "~/lib/pubchem-compound";

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

function normalizePubChemCid(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim().length > 0 ? value.trim() : null;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Resolves PubChem compound IDs for a name or SMILES query via PUG REST.
 *
 * @param query - Name or SMILES string passed to PubChem.
 * @param type - Whether `query` is a compound name or SMILES.
 * @param limit - Maximum number of CIDs to return (PubChem may return more).
 * @returns Ordered CID strings; empty when PubChem reports no matches.
 * @throws TRPCError with `NOT_FOUND` when PubChem has no compounds for the query.
 */
async function fetchPubChemCidsForQuery(
  query: string,
  type: "name" | "smiles",
  limit: number,
): Promise<string[]> {
  const searchUrl =
    type === "smiles"
      ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(query)}/cids/JSON`
      : `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`;

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
  const rawCids = searchData?.IdentifierList?.CID;

  if (!Array.isArray(rawCids) || rawCids.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Compound not found in PubChem",
    });
  }

  const cids: string[] = [];
  for (const raw of rawCids) {
    const normalized = normalizePubChemCid(raw);
    if (normalized) {
      cids.push(normalized);
    }
    if (cids.length >= limit) {
      break;
    }
  }

  if (cids.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Compound not found in PubChem",
    });
  }

  return cids;
}

const PUBCHEM_LISTKEY_POLL_MS = [400, 700, 1000, 1200, 1500, 1800, 2000] as const;

/**
 * Polls a PubChem asynchronous list key until CIDs are ready or attempts exhaust.
 *
 * @param listKey - List key from a PubChem `Waiting` response.
 * @returns Resolved CID strings; empty when polling times out.
 */
async function pollPubChemListKeyCids(listKey: string): Promise<string[]> {
  for (const delayMs of PUBCHEM_LISTKEY_POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const pollResponse = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/listkey/${listKey}/cids/JSON`,
      { headers: { Accept: "application/json" } },
    );
    if (!pollResponse.ok) {
      continue;
    }
    const pollData = (await pollResponse.json()) as {
      Waiting?: { ListKey?: string; Message?: string } | null;
      IdentifierList?: { CID?: unknown[] | null } | null;
    } | null;
    if (pollData?.Waiting) {
      continue;
    }
    const rawCids = pollData?.IdentifierList?.CID;
    if (!Array.isArray(rawCids) || rawCids.length === 0) {
      return [];
    }
    const cids: string[] = [];
    for (const raw of rawCids) {
      const normalized = normalizePubChemCid(raw);
      if (normalized) {
        cids.push(normalized);
      }
    }
    return cids;
  }
  return [];
}

/**
 * Resolves PubChem compound IDs for a Hill molecular formula via PUG REST.
 *
 * Formula lookups may return a `Waiting` list key; this helper polls until CIDs
 * are available or the poll budget is exhausted.
 *
 * @param formula - Hill-system formula string.
 * @param limit - Maximum number of CIDs to return.
 * @returns Ordered CID strings; empty when PubChem reports no matches.
 * @throws TRPCError with `NOT_FOUND` when PubChem has no compounds for the formula.
 */
async function fetchPubChemCidsForFormula(
  formula: string,
  limit: number,
): Promise<string[]> {
  const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/formula/${encodeURIComponent(formula)}/cids/JSON?MaxRecords=${limit}`;
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
    Waiting?: { ListKey?: string } | null;
    IdentifierList?: { CID?: unknown[] | null } | null;
  } | null;

  let rawCids: unknown[] | null | undefined;
  if (searchData?.Waiting?.ListKey) {
    const polled = await pollPubChemListKeyCids(searchData.Waiting.ListKey);
    rawCids = polled;
  } else {
    rawCids = searchData?.IdentifierList?.CID;
  }

  if (!Array.isArray(rawCids) || rawCids.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Compound not found in PubChem",
    });
  }

  const cids: string[] = [];
  for (const raw of rawCids) {
    const normalized = normalizePubChemCid(raw);
    if (normalized) {
      cids.push(normalized);
    }
    if (cids.length >= limit) {
      break;
    }
  }

  if (cids.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Compound not found in PubChem",
    });
  }

  return cids;
}

/**
 * Loads title and formula summaries for PubChem CIDs in one PUG property request.
 *
 * @param cids - PubChem compound IDs to summarize.
 * @returns Candidate rows aligned with `cids` order; missing rows use CID fallbacks.
 */
async function fetchPubChemCandidateSummaries(
  cids: readonly string[],
): Promise<PubChemCandidateSummary[]> {
  if (cids.length === 0) {
    return [];
  }

  const cidList = cids.join(",");
  const propertyResponse = await fetch(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cidList}/property/Title,IUPACName,MolecularFormula/JSON`,
    { headers: { Accept: "application/json" } },
  );

  const propsByCid = new Map<string, PubChemPropertyRow>();
  if (propertyResponse.ok) {
    const propertyData = (await propertyResponse.json()) as {
      PropertyTable?: { Properties?: PubChemPropertyRow[] | null } | null;
    } | null;
    for (const row of propertyData?.PropertyTable?.Properties ?? []) {
      if (row?.CID !== null && row?.CID !== undefined) {
        propsByCid.set(String(row.CID), row);
      }
    }
  }

  return cids.map((cid) => {
    const props = propsByCid.get(cid);
    const formula =
      typeof props?.MolecularFormula === "string" &&
      props.MolecularFormula.trim().length > 0
        ? props.MolecularFormula.trim()
        : null;
    return {
      cid,
      title: pickPubChemDisplayTitle(props, `PubChem CID ${cid}`),
      formula,
    };
  });
}

async function fetchCasRegistryFromCasApi(input: {
  inchi?: string;
  synonym?: string;
}): Promise<string | null> {
  if (!env.CAS_API_KEY) {
    return null;
  }
  const inchi = input.inchi?.trim();
  const synonym = input.synonym?.trim();
  if (!inchi && !synonym) {
    return null;
  }

  const searchQuery = inchi
    ? encodeInChIForCas(inchi)
    : encodeURIComponent(synonym!);
  const searchUrl = `https://commonchemistry.cas.org/api/search?q=${searchQuery}`;

  try {
    const searchResponse = await fetch(searchUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-KEY": env.CAS_API_KEY,
      },
    });
    if (!searchResponse.ok) {
      return null;
    }

    const searchData = (await searchResponse.json()) as
      | {
          results?: Array<{ rn?: unknown }>;
          rn?: unknown;
        }
      | Array<{ rn?: unknown }>
      | null;

    const firstRn =
      searchData &&
      !Array.isArray(searchData) &&
      Array.isArray(searchData.results) &&
      searchData.results.length > 0
        ? searchData.results[0]?.rn
        : Array.isArray(searchData) && searchData.length > 0
          ? searchData[0]?.rn
          : searchData &&
              !Array.isArray(searchData) &&
              searchData.rn !== null &&
              searchData.rn !== undefined
            ? searchData.rn
            : null;

    if (firstRn === null || firstRn === undefined) {
      return null;
    }
    if (typeof firstRn === "string") {
      return firstRn;
    }
    if (typeof firstRn === "number") {
      return String(firstRn);
    }
    return null;
  } catch {
    return null;
  }
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

        let moleculeName: string | null = null;
        let inchi: string | null = null;
        let smiles: string | null = null;
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
                inchi?: string | null;
                smiles?: string | null;
                molecularFormula?: string | null;
              } | null;
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
                if (
                  typeof detailData.inchi === "string" &&
                  detailData.inchi.trim()
                ) {
                  inchi = detailData.inchi.trim();
                }
                if (
                  typeof detailData.smiles === "string" &&
                  detailData.smiles.trim()
                ) {
                  smiles = detailData.smiles.trim();
                }
              }
            }
          } catch (error) {
            console.warn("Could not fetch CAS detail:", error);
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
            inchi: inchi ?? undefined,
            smiles: smiles ?? undefined,
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

  listPubchemCids: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, "Query is required"),
        type: z.enum(["name", "smiles", "formula"]).default("name"),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ input }) => {
      try {
        const trimmed = input.query.trim();
        const cids =
          input.type === "formula"
            ? await fetchPubChemCidsForFormula(trimmed, input.limit)
            : await fetchPubChemCidsForQuery(trimmed, input.type, input.limit);
        return { ok: true as const, cids };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search PubChem",
        });
      }
    }),

  searchPubchemCandidates: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, "Query is required"),
        limit: z.number().int().min(1).max(20).default(10),
        type: z
          .enum(["auto", "name", "formula", "cid", "smiles"])
          .default("auto"),
      }),
    )
    .query(async ({ input }) => {
      const trimmed = input.query.trim();
      const limit = input.limit;
      const requestedType = input.type;

      try {
        if (requestedType === "cid" || (requestedType === "auto" && /^\d+$/.test(trimmed))) {
          const candidates = await fetchPubChemCandidateSummaries([trimmed]);
          return {
            ok: true as const,
            searchType: "cid" as const,
            candidates,
          };
        }

        if (requestedType === "smiles") {
          const cids = await fetchPubChemCidsForQuery(trimmed, "smiles", limit);
          const candidates = await fetchPubChemCandidateSummaries(cids);
          return {
            ok: true as const,
            searchType: "smiles" as const,
            candidates,
          };
        }

        if (
          requestedType === "formula" ||
          (requestedType === "auto" && isLikelyChemicalFormula(trimmed))
        ) {
          const cids = await fetchPubChemCidsForFormula(trimmed, limit);
          const candidates = await fetchPubChemCandidateSummaries(cids);
          return {
            ok: true as const,
            searchType: "formula" as const,
            candidates,
          };
        }

        const cids = await fetchPubChemCidsForQuery(trimmed, "name", limit);
        const candidates = await fetchPubChemCandidateSummaries(cids);
        return {
          ok: true as const,
          searchType: "name" as const,
          candidates,
        };
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          const searchType =
            requestedType === "smiles"
              ? ("smiles" as const)
              : requestedType === "formula" ||
                  (requestedType === "auto" && isLikelyChemicalFormula(trimmed))
                ? ("formula" as const)
                : ("name" as const);
          return {
            ok: true as const,
            searchType,
            candidates: [] as PubChemCandidateSummary[],
          };
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search PubChem",
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

      if (type === "cid") {
        cid = query.trim();
      } else {
        try {
          const cids = await fetchPubChemCidsForQuery(query.trim(), type, 1);
          cid = cids[0] ?? null;
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

      const [propertiesResponse, synonymsResponse] = await Promise.allSettled([
        fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${PUBCHEM_COMPOUND_PROPERTY_QUERY}/JSON`,
          { headers: { Accept: "application/json" } },
        ),
        fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
          { headers: { Accept: "application/json" } },
        ),
      ]);

      // Parse properties
      let pubChemTitle = "";
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
            Properties?: PubChemPropertyRow[] | null;
          } | null;
        } | null;
        const props = propertiesData?.PropertyTable?.Properties?.[0];

        if (props) {
          pubChemTitle = pickPubChemDisplayTitle(props, query);
          iupacName =
            typeof props.IUPACName === "string" ? props.IUPACName : "";
          smiles = pickPubChemSmiles(props);
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

      casNumber ??= extractCasRegistryFromSynonyms(synonyms);

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

      if (pubChemTitle) {
        finalIUPACName = pubChemTitle;
        finalCommonName = query.trim();
        if (
          finalCommonName.length === 0 ||
          finalCommonName.toLowerCase() === pubChemTitle.toLowerCase()
        ) {
          finalCommonName =
            synonyms.find(
              (synonym) =>
                synonym.toLowerCase() !== pubChemTitle.toLowerCase(),
            ) ?? query;
        }
      } else if (iupacName && !isLikelyIUPACName(iupacName)) {
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

      if (!casNumber) {
        const casFromApi = await fetchCasRegistryFromCasApi({
          inchi: inchi || undefined,
          synonym: finalCommonName || query,
        });
        if (casFromApi) {
          casNumber = casFromApi;
        }
      }

      return {
        ok: true,
        data: {
          title: pubChemTitle || finalIUPACName,
          iupacName: finalIUPACName,
          commonName: finalCommonName,
          synonyms: finalSynonyms,
          chemicalFormula,
          smiles,
          inchi,
          inchiKey,
          casNumber,
          pubChemCid: cid,
          source: "pubchem",
        },
      };
    }),

  validateCasNumber: publicProcedure
    .input(z.object({ casNumber: z.string() }))
    .query(async ({ input }) => {
      const casNumber = input.casNumber.trim();
      if (!casNumber) return { valid: false };
      if (!env.CAS_API_KEY) return { valid: false };
      try {
        const detailUrl = `https://commonchemistry.cas.org/api/detail?cas_rn=${encodeURIComponent(casNumber)}`;
        const res = await fetch(detailUrl, {
          method: "GET",
          headers: {
            accept: "application/json",
            "X-API-KEY": env.CAS_API_KEY,
          },
        });
        if (!res.ok) return { valid: false };
        const data = (await res.json()) as unknown;
        const hasMolecule =
          data !== null &&
          typeof data === "object" &&
          ("name" in data || "molecule" in data || "rn" in data);
        return { valid: !!hasMolecule };
      } catch {
        return { valid: false };
      }
    }),

  validatePubChemCid: publicProcedure
    .input(z.object({ cid: z.string() }))
    .query(async ({ input }) => {
      const cid = input.cid.trim();
      if (!cid || !/^\d+$/.test(cid)) return { valid: false };
      try {
        const res = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula/JSON`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) return { valid: false };
        const data = (await res.json()) as {
          PropertyTable?: { Properties?: unknown[] };
        };
        const hasProperties =
          data?.PropertyTable?.Properties &&
          Array.isArray(data.PropertyTable.Properties) &&
          data.PropertyTable.Properties.length > 0;
        return { valid: !!hasProperties };
      } catch {
        return { valid: false };
      }
    }),
});
