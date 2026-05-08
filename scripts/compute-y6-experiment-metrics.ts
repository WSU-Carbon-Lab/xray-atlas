/**
 * Upserts `experiment_metrics` / `experiment_metrics_channel` for every experiment attached to molecule Y6
 * (synonym or IUPAC case-insensitive match) using {@link ~/server/nexafs/persistExperimentMetricsTables.ts}.
 *
 * Run: `bun scripts/compute-y6-experiment-metrics.ts`
 */

import { db } from "~/server/db";
import { persistExperimentMetricsTables } from "~/server/nexafs/persistExperimentMetricsTables";

async function main(): Promise<void> {
  const molecule = await db.molecules.findFirst({
    where: {
      OR: [
        {
          moleculesynonyms: {
            some: { synonym: { equals: "Y6", mode: "insensitive" } },
          },
        },
        { iupacname: { equals: "Y6", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (!molecule) {
    console.error("Molecule Y6 not found (synonym or IUPAC).");
    process.exitCode = 1;
    return;
  }

  const experiments = await db.experiments.findMany({
    where: { samples: { moleculeid: molecule.id } },
    select: { id: true },
    orderBy: { createdat: "desc" },
  });

  const rows: Array<{
    experiment_id: string;
    status: string;
    aggregate_percent: string;
    channels: string;
  }> = [];

  for (const exp of experiments) {
    const result = await persistExperimentMetricsTables(db, exp.id);
    if (!result.ok) {
      rows.push({
        experiment_id: exp.id,
        status: `skipped:${result.reason}`,
        aggregate_percent: "",
        channels: "",
      });
      continue;
    }

    const header = await db.experimentmetrics.findUnique({
      where: { experimentid: exp.id },
      select: { qualityaggregatescore: true },
    });

    const agg = header?.qualityaggregatescore;
    rows.push({
      experiment_id: exp.id,
      status: "ok",
      aggregate_percent:
        agg != null && Number.isFinite(agg) ? `${agg.toFixed(1)}` : "",
      channels: String(result.channelRows),
    });
  }

  console.log(
    JSON.stringify(
      {
        moleculeId: molecule.id,
        experimentCount: experiments.length,
        rows,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
