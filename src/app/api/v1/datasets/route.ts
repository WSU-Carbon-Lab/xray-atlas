import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { rejectInvalidPresentedBearer } from "~/server/cli/access-token";
import type { CreateWithSpectrumInput } from "~/server/nexafs/create-experiment-with-spectrum";
import {
  createV1Caller,
  handleV1,
  readJsonBody,
  requireBearerScope,
  requireJsonObject,
} from "~/app/api/v1/_lib/write-api";
import {
  buildExperimentWhere,
  formatEdgeLabel,
  parseDatasetSummaryQuery,
} from "~/app/api/v1/_lib/researcher-api";

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request): Promise<NextResponse> {
  const bearerRejection = await rejectInvalidPresentedBearer(request);
  if (bearerRejection) {
    return bearerRejection;
  }
  try {
    const requestUrl = new URL(request.url);
    const query = parseDatasetSummaryQuery(requestUrl.searchParams);
    const where = buildExperimentWhere({
      moleculeId: query.moleculeId,
      edgeId: query.edgeId,
      atlasDatasetId: query.atlasDatasetId,
      doi: query.doi,
    });

    const datasets = await db.experiments.findMany({
      where,
      select: {
        id: true,
        atlasdatasetid: true,
        experimenttype: true,
        createdat: true,
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
            qualityaggregatescore: true,
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
        atlasDatasetId: dataset.atlasdatasetid?.trim().toLowerCase() || null,
        experimentType: dataset.experimenttype,
        edge: {
          id: dataset.edges.id,
          targetAtom: dataset.edges.targetatom,
          coreState: dataset.edges.corestate,
          label: formatEdgeLabel(
            dataset.edges.targetatom,
            dataset.edges.corestate,
          ),
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
        qualityAggregateScore:
          dataset.experimentmetrics?.qualityaggregatescore ?? null,
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
        atlasDatasetId: query.atlasDatasetId ?? null,
        doi: query.doi ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(
        error.issues[0]?.message ?? "Invalid query parameters.",
        400,
      );
    }
    return jsonError("Failed to list dataset summaries.", 500);
  }
}

/**
 * Creates a NEXAFS dataset at version 1.0.0.
 *
 * Requires `Authorization: Bearer` with the `write` scope; cookie sessions are not accepted.
 * The JSON body is the `experiments.createWithSpectrum` input, validated and authorized by that
 * procedure (contribution agreement included). Responds 201 with
 * `{ experimentId, version, sampleId, spectrumPointsCreated }`; failures use the
 * `{ error: { code, message } }` envelope.
 */
export async function POST(request: Request): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const body = requireJsonObject(await readJsonBody(request));
    const caller = createV1Caller(bearer, request);
    const result = await caller.experiments.createWithSpectrum(
      body as unknown as CreateWithSpectrumInput,
    );
    const created = result.experiments[0];
    if (!created) {
      throw new Error("Dataset creation produced no experiment.");
    }
    return NextResponse.json(
      {
        experimentId: created.experiment.id,
        version: "1.0.0",
        sampleId: result.sample.id,
        spectrumPointsCreated: created.spectrumPointsCreated,
      },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  });
}
