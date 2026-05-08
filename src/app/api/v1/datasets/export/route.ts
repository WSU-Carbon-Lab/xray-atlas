import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "~/server/db";
import {
  buildExperimentWhere,
  formatEdgeLabel,
  parseDatasetExportQuery,
} from "~/app/api/v1/_lib/researcher-api";

type DatasetExportRow = {
  dataset_id: string;
  experiment_type: string | null;
  sample_id: string;
  sample_identifier: string;
  molecule_id: string;
  molecule_iupac_name: string;
  edge_id: string;
  edge_label: string;
  instrument_id: string;
  instrument_name: string;
  facility_id: string | null;
  facility_name: string | null;
  publication_dois: string;
  energy_ev: number;
  raw_abs: number;
  i0: number | null;
  od: number | null;
  mass_absorption: number | null;
  beta: number | null;
  created_at: string;
};

const datasetExportColumns = [
  "dataset_id",
  "experiment_type",
  "sample_id",
  "sample_identifier",
  "molecule_id",
  "molecule_iupac_name",
  "edge_id",
  "edge_label",
  "instrument_id",
  "instrument_name",
  "facility_id",
  "facility_name",
  "publication_dois",
  "energy_ev",
  "raw_abs",
  "i0",
  "od",
  "mass_absorption",
  "beta",
  "created_at",
] as const;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function toCsvValue(value: string | number | null): string {
  if (value === null) {
    return "";
  }
  const asString = String(value);
  if (asString.includes(",") || asString.includes('"') || asString.includes("\n")) {
    return `"${asString.replaceAll('"', '""')}"`;
  }
  return asString;
}

function encodeRowsAsCsv(rows: DatasetExportRow[]): string {
  const header = datasetExportColumns.join(",");
  const lines = rows.map((row) =>
    datasetExportColumns
      .map((column) => toCsvValue(row[column]))
      .join(","),
  );
  return [header, ...lines].join("\n");
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const query = parseDatasetExportQuery(requestUrl.searchParams);
    const where = buildExperimentWhere({
      moleculeId: query.moleculeId,
      edgeId: query.edgeId,
      doi: query.doi,
    });

    const spectrumRows = await db.spectrumpoints.findMany({
      where: {
        experiments: where,
      },
      include: {
        experiments: {
          select: {
            id: true,
            createdat: true,
            experimenttype: true,
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
            edges: {
              select: {
                id: true,
                targetatom: true,
                corestate: true,
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
                publications: {
                  select: {
                    doi: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { experiments: { createdat: "desc" } },
        { experimentid: "asc" },
        { energyev: "asc" },
      ],
      take: query.limit,
    });

    const rows: DatasetExportRow[] = spectrumRows.map((point) => {
      const publicationDois = point.experiments.experimentpublications
        .map((entry) => entry.publications.doi)
        .sort()
        .join(";");
      const edge = point.experiments.edges;
      const sample = point.experiments.samples;
      const instrument = point.experiments.instruments;
      const facility = instrument.facilities;

      return {
        dataset_id: point.experiments.id,
        experiment_type: point.experiments.experimenttype,
        sample_id: sample.id,
        sample_identifier: sample.identifier,
        molecule_id: sample.molecules.id,
        molecule_iupac_name: sample.molecules.iupacname,
        edge_id: edge.id,
        edge_label: formatEdgeLabel(edge.targetatom, edge.corestate),
        instrument_id: instrument.id,
        instrument_name: instrument.name,
        facility_id: facility?.id ?? null,
        facility_name: facility?.name ?? null,
        publication_dois: publicationDois,
        energy_ev: point.energyev,
        raw_abs: point.rawabs,
        i0: point.i0,
        od: point.od,
        mass_absorption: point.massabsorption,
        beta: point.beta,
        created_at: point.experiments.createdat.toISOString(),
      };
    });

    if (query.format === "csv") {
      return new NextResponse(encodeRowsAsCsv(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="xray-atlas-datasets-v1.csv"',
        },
      });
    }

    return NextResponse.json({
      columns: datasetExportColumns,
      rowCount: rows.length,
      filters: {
        moleculeId: query.moleculeId ?? null,
        edgeId: query.edgeId ?? null,
        doi: query.doi ?? null,
      },
      rows,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid query parameters.", 400);
    }
    return jsonError("Failed to export datasets.", 500);
  }
}
