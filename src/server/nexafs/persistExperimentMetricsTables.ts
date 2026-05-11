/**
 * Persists computed spectroscopy diagnostics onto `experiment_metrics` / `experiment_metrics_channel`.
 *
 * Sources canonical polarization spectra via {@link ./normalizationMetadata.ts} quality helpers so browse cards,
 * scripts, and ingest flows share identical per-channel spacing/SNR/normalization-distance semantics with JSON `quality_scores`.
 */

import type { PrismaClient } from "~/prisma/client";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  combinePercentsMean,
  normalizationMeanDeviationToPercent,
  snrToPercent,
  spacingEvToPercent,
} from "~/lib/nexafs-dataset-metric-policy";
import { parseStoredNormalizationRanges } from "~/lib/nexafs-normalization-ranges";
import {
  buildQualityScores,
  type NormalizationRanges,
  type NormalizationScope,
  type UploadedChannel,
} from "~/server/nexafs/normalizationMetadata";

const UPLOADED_CHANNELS: readonly UploadedChannel[] = [
  "rawabs",
  "od",
  "massabsorption",
  "beta",
];

function prismaSpectrumToSpectrumPoints(
  rows: Array<{
    energyev: number;
    rawabs: number;
    rawabserr: number | null;
    od: number | null;
    oderr: number | null;
    massabsorption: number | null;
    massabsorptionerr: number | null;
    beta: number | null;
    betaerr: number | null;
  }>,
): SpectrumPoint[] {
  return rows.map((p) => ({
    energy: p.energyev,
    absorption: p.rawabs,
    rawabsError: p.rawabserr ?? undefined,
    od: p.od ?? undefined,
    odError: p.oderr ?? undefined,
    massabsorption: p.massabsorption ?? undefined,
    massabsorptionError: p.massabsorptionerr ?? undefined,
    beta: p.beta ?? undefined,
    betaError: p.betaerr ?? undefined,
  }));
}

export type PersistExperimentMetricsTablesResult =
  | { ok: true; experimentId: string; channelRows: number }
  | {
      ok: false;
      experimentId: string;
      reason: "no_points" | "missing_polarization";
    };

/**
 * Recomputes experiment/channel metric rows from canonical polarization spectrum rows and upserts persistence tables.
 *
 * @param db Shared Prisma client (transaction-capable callers may swap for `tx`).
 * @param experimentId Target experiment UUID.
 * @returns Structured outcome with inserted channel row count or skip reasons when spectra cannot be evaluated.
 */
export async function persistExperimentMetricsTables(
  db: PrismaClient,
  experimentId: string,
): Promise<PersistExperimentMetricsTablesResult> {
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      id: true,
      polarizationid: true,
      normalizationscope: true,
      normalizationranges: true,
    },
  });

  if (!experiment?.polarizationid) {
    return { ok: false, experimentId, reason: "missing_polarization" };
  }

  const rows = await db.spectrumpoints.findMany({
    where: {
      experimentid: experimentId,
      polarizationid: experiment.polarizationid,
    },
    orderBy: { energyev: "asc" },
    select: {
      energyev: true,
      rawabs: true,
      rawabserr: true,
      od: true,
      oderr: true,
      massabsorption: true,
      massabsorptionerr: true,
      beta: true,
      betaerr: true,
    },
  });

  if (rows.length < 2) {
    return { ok: false, experimentId, reason: "no_points" };
  }

  const linkedPub = await db.experimentpublications.findFirst({
    where: { experimentid: experimentId },
    select: { publicationid: true },
  });
  const doiPresent = linkedPub != null;

  const points = prismaSpectrumToSpectrumPoints(rows);
  const ranges: NormalizationRanges = parseStoredNormalizationRanges(
    experiment.normalizationranges,
  );
  const scope: NormalizationScope =
    (experiment.normalizationscope as NormalizationScope | null) ?? "unified";
  const qs = buildQualityScores({ points, ranges, scope, doiPresent });

  const channelPayload = UPLOADED_CHANNELS.map((channel) => {
    const qc = qs.perChannel[channel];
    const contrib = combinePercentsMean([
      qc.pointSpacing != null ? spacingEvToPercent(qc.pointSpacing) : null,
      qc.snr != null ? snrToPercent(qc.snr) : null,
      qc.normalizationTargetDistance != null &&
      Number.isFinite(qc.normalizationTargetDistance)
        ? normalizationMeanDeviationToPercent(qc.normalizationTargetDistance)
        : null,
    ]);

    return {
      experimentid: experimentId,
      channel,
      pointspacingev: qc.pointSpacing,
      snr: qc.snr,
      normalizationtargetdistance: qc.normalizationTargetDistance,
      channelcontributionscore: contrib,
    };
  });

  const aggregateScore = combinePercentsMean(
    channelPayload.map((c) => c.channelcontributionscore),
  );

  const engagement = await db.experimentquality.findUnique({
    where: { experimentid: experimentId },
    select: { favorites: true },
  });

  await db.$transaction([
    db.experimentmetrics.upsert({
      where: { experimentid: experimentId },
      create: {
        experimentid: experimentId,
        favoritecount: engagement?.favorites ?? 0,
        viewcount: 0,
        hasoriginaldatadoi: doiPresent,
        originaldatadoi: null,
        qualityaggregatescore: aggregateScore,
        normalizationrangespresent: qs.normalizationRangesPresent,
        metricscomputedat: new Date(),
        metricsschemaversion: 1,
      },
      update: {
        favoritecount: engagement?.favorites ?? 0,
        hasoriginaldatadoi: doiPresent,
        qualityaggregatescore: aggregateScore,
        normalizationrangespresent: qs.normalizationRangesPresent,
        metricscomputedat: new Date(),
        metricsschemaversion: 1,
      },
    }),
    db.experimentmetricschannel.deleteMany({
      where: { experimentid: experimentId },
    }),
    db.experimentmetricschannel.createMany({
      data: channelPayload,
    }),
  ]);

  return {
    ok: true,
    experimentId,
    channelRows: channelPayload.length,
  };
}
