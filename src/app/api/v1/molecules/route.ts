import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { parseMoleculeCatalogQuery } from "~/app/api/v1/_lib/researcher-api";

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const query = parseMoleculeCatalogQuery(requestUrl.searchParams);
    const requiresSynonymCountFilter = query.synonymsCountMax !== undefined;

    const where = {
      ...(query.q
        ? {
            OR: [
              { iupacname: { contains: query.q, mode: "insensitive" as const } },
              { inchi: { contains: query.q, mode: "insensitive" as const } },
              { smiles: { contains: query.q, mode: "insensitive" as const } },
              {
                chemicalformula: {
                  contains: query.q,
                  mode: "insensitive" as const,
                },
              },
              { casnumber: { contains: query.q, mode: "insensitive" as const } },
              { pubchemcid: { contains: query.q, mode: "insensitive" as const } },
              {
                moleculesynonyms: {
                  some: {
                    synonym: { contains: query.q, mode: "insensitive" as const },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.hasCas === undefined
        ? {}
        : query.hasCas
          ? { casnumber: { not: null } }
          : { casnumber: null }),
    };

    const molecules = await db.molecules.findMany({
      where,
      select: {
        id: true,
        iupacname: true,
        inchi: true,
        smiles: true,
        chemicalformula: true,
        casnumber: true,
        pubchemcid: true,
        favoritecount: true,
        viewcount: true,
        createdat: true,
        updatedat: true,
        moleculesynonyms: {
          orderBy: [{ order: "asc" }, { synonym: "asc" }],
          select: {
            synonym: true,
            order: true,
          },
        },
        _count: {
          select: {
            moleculesynonyms: true,
            samples: true,
          },
        },
      },
      orderBy: [{ favoritecount: "desc" }, { viewcount: "desc" }, { iupacname: "asc" }],
      skip: requiresSynonymCountFilter ? 0 : query.offset,
      take: requiresSynonymCountFilter ? 1000 : query.limit + 1,
    });

    const filteredBySynonymCount =
      query.synonymsCountMax === undefined
        ? molecules
        : molecules.filter(
            (molecule) => molecule._count.moleculesynonyms <= query.synonymsCountMax!,
          );

    const page = requiresSynonymCountFilter
      ? filteredBySynonymCount.slice(query.offset, query.offset + query.limit)
      : filteredBySynonymCount.slice(0, query.limit);
    const hasMore = requiresSynonymCountFilter
      ? filteredBySynonymCount.length > query.offset + query.limit
      : filteredBySynonymCount.length > query.limit;

    return NextResponse.json({
      data: page.map((molecule) => ({
        id: molecule.id,
        iupacName: molecule.iupacname,
        inchi: molecule.inchi,
        smiles: molecule.smiles,
        chemicalFormula: molecule.chemicalformula,
        casNumber: molecule.casnumber,
        pubChemCid: molecule.pubchemcid,
        favoriteCount: molecule.favoritecount,
        viewCount: molecule.viewcount,
        synonymsCount: molecule._count.moleculesynonyms,
        sampleCount: molecule._count.samples,
        synonyms: molecule.moleculesynonyms
          .slice(0, query.synonymsLimit)
          .map((entry) => entry.synonym),
        createdAt: molecule.createdat.toISOString(),
        updatedAt: molecule.updatedat.toISOString(),
      })),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        nextOffset: hasMore ? query.offset + query.limit : null,
      },
      filters: {
        q: query.q ?? null,
        hasCas: query.hasCas ?? null,
        synonymsCountMax: query.synonymsCountMax ?? null,
        synonymsLimit: query.synonymsLimit,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid query parameters.", 400);
    }
    return jsonError("Failed to list molecules.", 500);
  }
}
