import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "~/server/db";
import {
  buildExperimentWhere,
  formatEdgeLabel,
  parseDoiDiscoveryQuery,
} from "~/app/api/v1/_lib/researcher-api";

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const query = parseDoiDiscoveryQuery(requestUrl.searchParams);

    if (!query.doi) {
      return jsonError("DOI is required.", 400);
    }

    const publication = await db.publications.findUnique({
      where: { doi: query.doi },
      select: {
        id: true,
        doi: true,
        title: true,
        journal: true,
        year: true,
      },
    });

    if (!publication) {
      return jsonError("DOI not found.", 404);
    }

    const where = buildExperimentWhere({
      moleculeId: query.moleculeId,
      edgeId: query.edgeId,
      doi: query.doi,
    });

    const datasets = await db.experiments.findMany({
      where,
      include: {
        edges: {
          select: {
            id: true,
            targetatom: true,
            corestate: true,
          },
        },
        samples: {
          select: {
            id: true,
            identifier: true,
            molecules: {
              select: {
                id: true,
                iupacname: true,
              },
            },
          },
        },
        instruments: {
          select: {
            id: true,
            name: true,
            facilities: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            spectrumpoints: true,
          },
        },
      },
      orderBy: [{ createdat: "desc" }, { id: "desc" }],
    });

    return NextResponse.json({
      publication,
      filters: {
        moleculeId: query.moleculeId ?? null,
        edgeId: query.edgeId ?? null,
      },
      data: datasets.map((dataset) => ({
        datasetId: dataset.id,
        experimentType: dataset.experimenttype,
        edge: {
          id: dataset.edges.id,
          targetAtom: dataset.edges.targetatom,
          coreState: dataset.edges.corestate,
          label: formatEdgeLabel(dataset.edges.targetatom, dataset.edges.corestate),
        },
        molecule: {
          id: dataset.samples.molecules.id,
          iupacName: dataset.samples.molecules.iupacname,
        },
        sample: {
          id: dataset.samples.id,
          identifier: dataset.samples.identifier,
        },
        instrument: {
          id: dataset.instruments.id,
          name: dataset.instruments.name,
        },
        facility: dataset.instruments.facilities
          ? {
              id: dataset.instruments.facilities.id,
              name: dataset.instruments.facilities.name,
            }
          : null,
        spectrumPointCount: dataset._count.spectrumpoints,
        createdAt: dataset.createdat.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid query parameters.", 400);
    }
    return jsonError("Failed DOI-first dataset discovery.", 500);
  }
}
