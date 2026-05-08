import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { db } from "~/server/db";
import {
  buildExperimentWhere,
  formatEdgeLabel,
  normalizeDoi,
} from "~/app/api/v1/_lib/researcher-api";

const paramsSchema = z.object({
  moleculeId: z.string().uuid(),
});

const querySchema = z.object({
  doi: z.string().trim().max(512).optional(),
});

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ moleculeId: string }> },
): Promise<NextResponse> {
  try {
    const params = paramsSchema.parse(await context.params);
    const requestUrl = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(requestUrl.searchParams));
    const doi = normalizeDoi(query.doi);

    const molecule = await db.molecules.findUnique({
      where: { id: params.moleculeId },
      select: {
        id: true,
        iupacname: true,
      },
    });

    if (!molecule) {
      return jsonError("Molecule not found.", 404);
    }

    const edgeCounts = await db.experiments.groupBy({
      by: ["edgeid"],
      where: buildExperimentWhere({
        moleculeId: params.moleculeId,
        doi,
      }),
      _count: {
        edgeid: true,
      },
    });

    const edgeIds = edgeCounts.map((entry) => entry.edgeid);
    const edges = edgeIds.length
      ? await db.edges.findMany({
          where: { id: { in: edgeIds } },
          select: {
            id: true,
            targetatom: true,
            corestate: true,
          },
        })
      : [];

    const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

    return NextResponse.json({
      molecule: {
        id: molecule.id,
        iupacName: molecule.iupacname,
      },
      filters: {
        doi,
      },
      data: edgeCounts
        .map((entry) => {
          const edge = edgeById.get(entry.edgeid);
          if (!edge) {
            return null;
          }
          return {
            edgeId: edge.id,
            targetAtom: edge.targetatom,
            coreState: edge.corestate,
            label: formatEdgeLabel(edge.targetatom, edge.corestate),
            datasetCount: entry._count.edgeid,
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null)
        .sort((a, b) => b.datasetCount - a.datasetCount || a.label.localeCompare(b.label)),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid request parameters.", 400);
    }
    return jsonError("Failed to load edge summary.", 500);
  }
}
