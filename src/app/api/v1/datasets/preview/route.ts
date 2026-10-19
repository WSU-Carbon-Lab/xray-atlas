import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { rejectInvalidPresentedBearer } from "~/server/cli/access-token";
import { parseDatasetPreviewQuery } from "~/app/api/v1/_lib/researcher-api";

interface PreviewSampleRow {
  polar_deg: number | null;
  azimuth_deg: number | null;
  energy_ev: number;
  raw_abs: number;
  od: number | null;
  mass_absorption: number | null;
  beta: number | null;
  delta: number | null;
  point_count: number;
}

interface PreviewPoint {
  energyEv: number;
  rawAbs: number;
  od: number | null;
  massAbsorption: number | null;
  beta: number | null;
  delta: number | null;
}

interface PreviewGroup {
  polarDeg: number | null;
  azimuthDeg: number | null;
  pointCount: number;
  rows: PreviewPoint[];
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function requiredNumber(value: unknown): number {
  return finiteNumber(value) ?? Number.NaN;
}

/**
 * Returns the first energy samples of one dataset, one group per polarization pair.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const bearerRejection = await rejectInvalidPresentedBearer(request);
  if (bearerRejection) {
    return bearerRejection;
  }
  try {
    const requestUrl = new URL(request.url);
    const query = parseDatasetPreviewQuery(requestUrl.searchParams);
    const where = query.datasetId
      ? { id: query.datasetId }
      : query.atlasDatasetId
        ? { atlasdatasetid: query.atlasDatasetId }
        : null;
    if (!where) {
      return jsonError("Provide datasetId or atlasDatasetId.", 400);
    }
    const experiment = await db.experiments.findFirst({
      where,
      select: {
        id: true,
        atlasdatasetid: true,
      },
    });
    if (!experiment) {
      return jsonError("Dataset not found.", 404);
    }
    const samples = await db.$queryRaw<PreviewSampleRow[]>`
      WITH ranked AS (
        SELECT
          pol.polardeg::float8 AS polar_deg,
          pol.azimuthdeg::float8 AS azimuth_deg,
          s.energyev AS energy_ev,
          s.rawabs AS raw_abs,
          s.od AS od,
          s.massabsorption AS mass_absorption,
          s.beta AS beta,
          s.delta AS delta,
          COUNT(*) OVER (
            PARTITION BY s.experimentid, s.polarizationid
          )::int AS point_count,
          ROW_NUMBER() OVER (
            PARTITION BY s.experimentid, s.polarizationid
            ORDER BY s.energyev ASC
          ) AS sample_index
        FROM public.spectrumpoints s
        LEFT JOIN public.polarizations pol ON pol.id = s.polarizationid
        WHERE s.experimentid = ${experiment.id}::uuid
      )
      SELECT
        polar_deg,
        azimuth_deg,
        energy_ev,
        raw_abs,
        od,
        mass_absorption,
        beta,
        delta,
        point_count
      FROM ranked
      WHERE sample_index <= ${query.rows}
      ORDER BY polar_deg ASC NULLS LAST, azimuth_deg ASC NULLS LAST, energy_ev ASC
    `;
    const groups: PreviewGroup[] = [];
    for (const sample of samples) {
      const polarDeg = finiteNumber(sample.polar_deg);
      const azimuthDeg = finiteNumber(sample.azimuth_deg);
      const point = {
        energyEv: requiredNumber(sample.energy_ev),
        rawAbs: requiredNumber(sample.raw_abs),
        od: finiteNumber(sample.od),
        massAbsorption: finiteNumber(sample.mass_absorption),
        beta: finiteNumber(sample.beta),
        delta: finiteNumber(sample.delta),
      };
      const current = groups[groups.length - 1];
      if (
        !current ||
        current.polarDeg !== polarDeg ||
        current.azimuthDeg !== azimuthDeg
      ) {
        groups.push({
          polarDeg,
          azimuthDeg,
          pointCount: finiteNumber(sample.point_count) ?? 0,
          rows: [point],
        });
        continue;
      }
      current.rows.push(point);
    }
    return NextResponse.json({
      datasetId: experiment.id,
      atlasDatasetId: experiment.atlasdatasetid?.trim().toLowerCase() || null,
      rowsPerGroup: query.rows,
      groups,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(
        error.issues[0]?.message ?? "Invalid query parameters.",
        400,
      );
    }
    return jsonError("Failed dataset preview.", 500);
  }
}
