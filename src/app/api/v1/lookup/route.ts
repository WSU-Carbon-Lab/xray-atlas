import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { formatEdgeLabel } from "~/app/api/v1/_lib/researcher-api";
import {
  handleV1,
  requireBearerScope,
  V1HttpError,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

const lookupQuerySchema = z.object({
  kind: z.enum(["molecule", "instrument", "edge"]),
  q: z.string().trim().min(1).max(256),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const EDGE_QUERY =
  /^([A-Za-z]{1,2})\s*[(\s-]?\s*([A-Za-z][A-Za-z0-9]*)?\s*\)?$/;

async function lookupMolecules(q: string, limit: number) {
  const rows = await db.molecules.findMany({
    where: {
      OR: [
        { iupacname: { contains: q, mode: "insensitive" } },
        { casnumber: { equals: q, mode: "insensitive" } },
        { chemicalformula: { equals: q, mode: "insensitive" } },
        {
          moleculesynonyms: {
            some: { synonym: { contains: q, mode: "insensitive" } },
          },
        },
      ],
    },
    select: {
      id: true,
      iupacname: true,
      chemicalformula: true,
      casnumber: true,
      moleculesynonyms: {
        orderBy: [{ order: "asc" }, { synonym: "asc" }],
        take: 5,
        select: { synonym: true, slug: true },
      },
    },
    take: limit * 3,
  });
  const needle = q.toLowerCase();
  const scored = rows.map((row) => {
    const names = [
      row.iupacname,
      ...row.moleculesynonyms.map((entry) => entry.synonym),
    ].map((name) => name.toLowerCase());
    const exact =
      names.includes(needle) ||
      row.casnumber?.toLowerCase() === needle ||
      row.chemicalformula.toLowerCase() === needle;
    return { row, exact };
  });
  scored.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      a.row.iupacname.localeCompare(b.row.iupacname),
  );
  return scored.slice(0, limit).map(({ row, exact }) => ({
    id: row.id,
    iupacName: row.iupacname,
    chemicalFormula: row.chemicalformula,
    casNumber: row.casnumber,
    synonyms: row.moleculesynonyms.map((entry) => entry.synonym),
    slug: row.moleculesynonyms[0]?.slug ?? null,
    exact,
  }));
}

async function lookupInstruments(q: string, limit: number) {
  const rows = await db.instruments.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { id: { contains: q, mode: "insensitive" } },
        { facilities: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      name: true,
      status: true,
      facilities: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
    take: limit * 3,
  });
  const needle = q.toLowerCase();
  const scored = rows.map((row) => ({
    row,
    exact: row.id.toLowerCase() === needle || row.name.toLowerCase() === needle,
  }));
  scored.sort((a, b) => Number(b.exact) - Number(a.exact));
  return scored.slice(0, limit).map(({ row, exact }) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    facilityId: row.facilities.id,
    facilityName: row.facilities.name,
    exact,
  }));
}

async function lookupEdges(q: string, limit: number) {
  const match = EDGE_QUERY.exec(q);
  const atom = match?.[1];
  const state = match?.[2];
  const rows = await db.edges.findMany({
    where: atom
      ? {
          targetatom: { equals: atom, mode: "insensitive" },
          ...(state
            ? { corestate: { equals: state, mode: "insensitive" } }
            : {}),
        }
      : { targetatom: { contains: q, mode: "insensitive" } },
    orderBy: [{ targetatom: "asc" }, { corestate: "asc" }],
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    targetAtom: row.targetatom,
    coreState: row.corestate,
    label: formatEdgeLabel(row.targetatom, row.corestate),
    exact: state !== undefined,
  }));
}

/**
 * Resolves a name to catalog ids for the CLI.
 *
 * Requires `Authorization: Bearer` with the `read` scope. Query: `kind` (`molecule`,
 * `instrument`, or `edge`), `q` (name, CAS number, formula, instrument id, or edge label such as
 * `C(K)` or `C K`), and `limit` (1 to 50, default 20). Responds with
 * `{ kind, q, candidates }`; candidates are ordered exact matches first and carry `id` plus
 * display fields. Several candidates mean the match is ambiguous; choosing is the client's job.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return handleV1(async () => {
    await requireBearerScope(request, "read");
    const parsed = lookupQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      throw new V1HttpError(
        422,
        "UNPROCESSABLE_ENTITY",
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
    }
    const { kind, q, limit } = parsed.data;
    const candidates =
      kind === "molecule"
        ? await lookupMolecules(q, limit)
        : kind === "instrument"
          ? await lookupInstruments(q, limit)
          : await lookupEdges(q, limit);
    return NextResponse.json(
      { kind, q, candidates },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
