import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

const SEARCH_PARAM_KEYS = ["q", "query", "search", "s"] as const;
const SEARCH_TERM_SCHEMA = z.string().trim().min(1).max(256);

type SearchableMolecule = {
  id: string;
  iupacname: string;
  inchi: string;
  smiles: string;
  chemicalformula: string;
  casnumber: string | null;
  pubchemcid: string | null;
  favoritecount: number;
  viewcount: number | null;
  moleculesynonyms: Array<{ synonym: string; order: number }>;
};

type RankedMolecule = {
  moleculeId: string;
  score: number;
  hasExactMatch: boolean;
};

function readRawSearchTerm(url: URL): string | null {
  for (const key of SEARCH_PARAM_KEYS) {
    const value = url.searchParams.get(key);
    if (value != null && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function scoreValue(value: string | null | undefined, query: string): number {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return 0;
  if (normalizedValue === query) return 100;
  if (normalizedValue.startsWith(query)) return 55;
  if (normalizedValue.includes(query)) return 25;
  return 0;
}

function rankMolecule(molecule: SearchableMolecule, query: string): RankedMolecule {
  const synonymScore = molecule.moleculesynonyms.reduce((best, synonymRow) => {
    const valueScore = scoreValue(synonymRow.synonym, query);
    const primaryBoost = synonymRow.order === 0 ? 8 : 0;
    return Math.max(best, valueScore + primaryBoost);
  }, 0);

  const iupacScore = scoreValue(molecule.iupacname, query) + 30;
  const inchiScore = scoreValue(molecule.inchi, query) + 24;
  const smilesScore = scoreValue(molecule.smiles, query) + 24;
  const formulaScore = scoreValue(molecule.chemicalformula, query) + 22;
  const casScore = scoreValue(molecule.casnumber, query) + 32;
  const pubChemScore = scoreValue(molecule.pubchemcid, query) + 30;

  const baseScore = Math.max(
    synonymScore + 28,
    iupacScore,
    inchiScore,
    smilesScore,
    formulaScore,
    casScore,
    pubChemScore,
  );

  const popularityScore =
    Math.min(molecule.favoritecount, 1000) * 0.01 +
    Math.min(molecule.viewcount ?? 0, 10000) * 0.001;

  const hasExactMatch =
    normalize(molecule.iupacname) === query ||
    normalize(molecule.inchi) === query ||
    normalize(molecule.smiles) === query ||
    normalize(molecule.chemicalformula) === query ||
    normalize(molecule.casnumber) === query ||
    normalize(molecule.pubchemcid) === query ||
    molecule.moleculesynonyms.some((row) => normalize(row.synonym) === query);

  return {
    moleculeId: molecule.id,
    score: baseScore + popularityScore,
    hasExactMatch,
  };
}

function buildBrowseUrl(origin: string, searchTerm: string): URL {
  const url = new URL("/browse/molecules", origin);
  url.searchParams.set("q", searchTerm);
  return url;
}

function buildMoleculeUrl(origin: string, moleculeId: string): URL {
  return new URL(`/molecules/${moleculeId}`, origin);
}

/**
 * Resolves a browser-search query to a molecule detail route when confidence is high,
 * or to the browse route with `q` preserved when multiple plausible matches exist.
 *
 * Supported query keys are `q`, `query`, `search`, and `s`, enabling direct usage in
 * Firefox custom engine templates such as `/api/molecules/search?q=%s`.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const rawSearchTerm = readRawSearchTerm(requestUrl);

  const parsedTerm = SEARCH_TERM_SCHEMA.safeParse(rawSearchTerm ?? "");
  if (!parsedTerm.success) {
    return NextResponse.json(
      {
        error: "A non-empty search string is required.",
        example: "/api/molecules/search?q=benzene",
      },
      { status: 400 },
    );
  }

  const searchTerm = parsedTerm.data;
  const normalizedQuery = normalize(searchTerm);

  const molecules = await db.molecules.findMany({
    where: {
      OR: [
        { iupacname: { contains: searchTerm, mode: "insensitive" } },
        { inchi: { contains: searchTerm, mode: "insensitive" } },
        { smiles: { contains: searchTerm, mode: "insensitive" } },
        { chemicalformula: { contains: searchTerm, mode: "insensitive" } },
        { casnumber: { contains: searchTerm, mode: "insensitive" } },
        { pubchemcid: { contains: searchTerm, mode: "insensitive" } },
        {
          moleculesynonyms: {
            some: { synonym: { contains: searchTerm, mode: "insensitive" } },
          },
        },
      ],
    },
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
      moleculesynonyms: {
        select: { synonym: true, order: true },
        orderBy: [{ order: "asc" }, { synonym: "asc" }],
      },
    },
    take: 20,
  });

  if (molecules.length === 0) {
    const browseUrl = buildBrowseUrl(requestUrl.origin, searchTerm);
    return NextResponse.redirect(browseUrl, { status: 307 });
  }

  const ranked = molecules
    .map((molecule) => rankMolecule(molecule, normalizedQuery))
    .sort((a, b) => b.score - a.score);

  const exactMatches = ranked.filter((entry) => entry.hasExactMatch);

  if (exactMatches.length === 1) {
    const destination = buildMoleculeUrl(requestUrl.origin, exactMatches[0]!.moleculeId);
    return NextResponse.redirect(destination, { status: 307 });
  }

  if (exactMatches.length > 1) {
    const browseUrl = buildBrowseUrl(requestUrl.origin, searchTerm);
    return NextResponse.redirect(browseUrl, { status: 307 });
  }

  if (ranked.length === 1) {
    const destination = buildMoleculeUrl(requestUrl.origin, ranked[0]!.moleculeId);
    return NextResponse.redirect(destination, { status: 307 });
  }

  const best = ranked[0]!;
  const secondBest = ranked[1]!;
  if (best.score - secondBest.score >= 35) {
    const destination = buildMoleculeUrl(requestUrl.origin, best.moleculeId);
    return NextResponse.redirect(destination, { status: 307 });
  }

  const browseUrl = buildBrowseUrl(requestUrl.origin, searchTerm);
  return NextResponse.redirect(browseUrl, { status: 307 });
}
