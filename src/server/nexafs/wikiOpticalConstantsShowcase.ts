import { db } from "~/server/db";
import { formatExperimentType } from "~/components/browse/nexafs-browse-experiment-utils";
import type { SpectrumPoint } from "~/components/plots/types";
import { WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID } from "~/lib/wiki-optical-constants-showcase-id";
import {
  mapDbSpectrumRowsToPoints,
  type DbSpectrumRowWithPolarization,
} from "~/features/process-nexafs/utils/mapDbSpectrumRowsToPoints";

export { WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID };

const SPECTRUM_POINT_LIMIT = 10_000;

/**
 * Wiki optical-constants plot loads this experiment via Prisma (`experiments.findUnique` +
 * `spectrumpoints.findMany`), matching browse catalog persistence and
 * `spectrumpoints.getByExperiment` / `mapDbSpectrumRowsToPoints` (not kk-calc fixtures).
 */
export interface WikiOpticalConstantsShowcaseCaption {
  readonly moleculeDisplayName: string;
  readonly moleculeSynonym: string | null;
  readonly chemicalFormula: string;
  readonly edgeLabel: string;
  readonly experimentTypeLabel: string;
  readonly facilityLabel: string | null;
  readonly instrumentLabel: string;
  readonly geometryCount: number;
  readonly geometrySummary: string | null;
  readonly experimentId: string;
  readonly pointCount: number;
}

export interface WikiOpticalConstantsShowcasePayload {
  readonly caption: WikiOpticalConstantsShowcaseCaption;
  readonly spectrumPoints: SpectrumPoint[];
}

export type WikiOpticalConstantsShowcaseResult =
  | { readonly ok: true; readonly data: WikiOpticalConstantsShowcasePayload }
  | { readonly ok: false; readonly reason: "no_dataset" };

function rowHasFiniteBetaAndDelta(row: DbSpectrumRowWithPolarization): boolean {
  return (
    row.beta != null &&
    Number.isFinite(row.beta) &&
    row.delta != null &&
    Number.isFinite(row.delta)
  );
}

function summarizeGeometry(points: SpectrumPoint[]): {
  geometryCount: number;
  geometrySummary: string | null;
} {
  const thetas = new Set<number>();
  for (const point of points) {
    if (typeof point.theta === "number" && Number.isFinite(point.theta)) {
      thetas.add(point.theta);
    }
  }
  const sorted = [...thetas].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { geometryCount: 0, geometrySummary: null };
  }
  if (sorted.length === 1) {
    return {
      geometryCount: 1,
      geometrySummary: `theta ${sorted[0]}°`,
    };
  }
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  return {
    geometryCount: sorted.length,
    geometrySummary: `${sorted.length} polarizations (theta ${min}°–${max}°)`,
  };
}

/**
 * Loads the configured showcase experiment and spectrum points for the wiki optical-constants plot.
 * Returns `no_dataset` when the experiment is missing or lacks qualifying optical-constant rows.
 */
export async function fetchWikiOpticalConstantsShowcase(): Promise<WikiOpticalConstantsShowcaseResult> {
  const experiment = await db.experiments.findUnique({
    where: { id: WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID },
    include: {
      samples: {
        include: {
          molecules: {
            include: {
              moleculesynonyms: {
                orderBy: [{ order: "asc" }, { synonym: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
      edges: true,
      instruments: {
        include: {
          facilities: true,
        },
      },
    },
  });

  if (!experiment?.samples?.molecules || !experiment.edges) {
    return { ok: false, reason: "no_dataset" };
  }

  const molecule = experiment.samples.molecules;
  const chemicalFormula = molecule.chemicalformula?.trim() ?? "";
  if (chemicalFormula.length === 0) {
    return { ok: false, reason: "no_dataset" };
  }

  const primarySynonym = molecule.moleculesynonyms[0]?.synonym?.trim() ?? null;
  const moleculeDisplayName =
    primarySynonym && primarySynonym.length > 0
      ? primarySynonym
      : molecule.iupacname;
  const edgeLabel = `${experiment.edges.targetatom.trim()} ${experiment.edges.corestate.trim()}`;
  const experimentTypeLabel =
    formatExperimentType(experiment.experimenttype) ?? "NEXAFS";
  const facilityLabel = experiment.instruments.facilities?.name ?? null;
  const instrumentLabel = experiment.instruments.name;

  const rawRows = await db.spectrumpoints.findMany({
    where: { experimentid: WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID },
    orderBy: { energyev: "asc" },
    take: SPECTRUM_POINT_LIMIT,
    include: {
      polarizations: {
        select: { polardeg: true, azimuthdeg: true },
      },
    },
  });

  const rowsWithOptical = rawRows.filter(rowHasFiniteBetaAndDelta);

  if (rowsWithOptical.length < 4) {
    return { ok: false, reason: "no_dataset" };
  }

  const spectrumPoints = mapDbSpectrumRowsToPoints(rowsWithOptical);
  if (spectrumPoints.length < 4) {
    return { ok: false, reason: "no_dataset" };
  }

  const { geometryCount, geometrySummary } = summarizeGeometry(spectrumPoints);

  return {
    ok: true,
    data: {
      caption: {
        moleculeDisplayName,
        moleculeSynonym: primarySynonym,
        chemicalFormula,
        edgeLabel,
        experimentTypeLabel,
        facilityLabel,
        instrumentLabel,
        geometryCount,
        geometrySummary,
        experimentId: WIKI_OPTICAL_CONSTANTS_SHOWCASE_EXPERIMENT_ID,
        pointCount: spectrumPoints.length,
      },
      spectrumPoints,
    },
  };
}
