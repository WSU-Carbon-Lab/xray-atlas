import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "~/server/db";
import {
  buildExperimentWhere,
  formatEdgeLabel,
  parseDatasetSummaryQuery,
} from "~/app/api/v1/_lib/researcher-api";

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const query = parseDatasetSummaryQuery(requestUrl.searchParams);
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
        experimentpublications: {
          select: {
            role: true,
            publications: {
              select: {
                id: true,
                doi: true,
                title: true,
                year: true,
              },
            },
          },
          orderBy: {
            publications: {
              doi: "asc",
            },
          },
        },
        experimentmetrics: {
          select: {
            datasetdoi: true,
            hasdatasetdoi: true,
          },
        },
        experimentzenododeposit: {
          select: {
            state: true,
            doi: true,
            recordurl: true,
          },
        },
        _count: {
          select: {
            spectrumpoints: true,
          },
        },
      },
      orderBy: [{ createdat: "desc" }, { id: "desc" }],
      skip: query.offset,
      take: query.limit + 1,
    });

    const page = datasets.slice(0, query.limit);
    const hasMore = datasets.length > query.limit;

    return NextResponse.json({
      data: page.map((dataset) => ({
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
        datasetDoi:
          dataset.experimentmetrics?.datasetdoi ??
          dataset.experimentzenododeposit?.doi ??
          null,
        zenodoDepositState: dataset.experimentzenododeposit?.state ?? null,
        zenodoRecordUrl: dataset.experimentzenododeposit?.recordurl ?? null,
        publications: dataset.experimentpublications.map((entry) => ({
          id: entry.publications.id,
          doi: entry.publications.doi,
          title: entry.publications.title,
          year: entry.publications.year,
          role: entry.role,
        })),
      })),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        nextOffset: hasMore ? query.offset + query.limit : null,
      },
      filters: {
        moleculeId: query.moleculeId ?? null,
        edgeId: query.edgeId ?? null,
        doi: query.doi ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid query parameters.", 400);
    }
    return jsonError("Failed to list dataset summaries.", 500);
  }
}
