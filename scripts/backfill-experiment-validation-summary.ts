/**
 * Backfills `experiments.validation_summary` and `experiments.quality_scores` for rows where the summary is missing,
 * using the canonical polarization spectrum and stored normalization ranges. Enables Bench-line ingest verification on browse cards for legacy rows.
 *
 * Run: `bun scripts/backfill-experiment-validation-summary.ts`
 *
 * Requires `DATABASE_URL` (same wiring as `~/server/db` via `~/env`).
 */

import { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import { parseStoredNormalizationRanges } from "~/lib/nexafs-normalization-ranges";
import {
  buildQualityScores,
  buildValidationSummary,
  type NormalizationRanges,
  type NormalizationScope,
} from "~/server/nexafs/normalizationMetadata";
import type { SpectrumPoint } from "~/components/plots/types";

async function main(): Promise<void> {
  let updated = 0;
  let cursor: string | undefined;

  for (;;) {
    const batch = await db.experiments.findMany({
      where: {
        validationsummary: { equals: Prisma.DbNull },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      take: 75,
      orderBy: { id: "asc" },
      select: {
        id: true,
        polarizationid: true,
        normalizationscope: true,
        normalizationranges: true,
      },
    });

    if (batch.length === 0) break;

    cursor = batch[batch.length - 1]!.id;

    const doiRows = await db.experimentpublications.groupBy({
      by: ["experimentid"],
      where: {
        experimentid: { in: batch.map((e) => e.id) },
      },
    });
    const doiExperimentIds = new Set(doiRows.map((r) => r.experimentid));

    for (const exp of batch) {
      const rows = await db.spectrumpoints.findMany({
        where: {
          experimentid: exp.id,
          polarizationid: exp.polarizationid,
        },
        orderBy: { energyev: "asc" },
        select: {
          energyev: true,
          rawabs: true,
          od: true,
          massabsorption: true,
          beta: true,
        },
      });

      const points: SpectrumPoint[] = rows.map((p) => ({
        energy: p.energyev,
        absorption: p.rawabs,
        od: p.od ?? undefined,
        massabsorption: p.massabsorption ?? undefined,
        beta: p.beta ?? undefined,
      }));

      const ranges: NormalizationRanges = parseStoredNormalizationRanges(
        exp.normalizationranges,
      );
      const scope: NormalizationScope =
        (exp.normalizationscope as NormalizationScope | null) ?? "unified";

      const validationSummary = buildValidationSummary({
        points,
        ranges,
        scope,
        override: { bypass: false },
      });

      const qualityScores = buildQualityScores({
        points,
        ranges,
        scope,
        doiPresent: doiExperimentIds.has(exp.id),
      });

      await db.experiments.update({
        where: { id: exp.id },
        data: {
          validationsummary:
            validationSummary as unknown as Prisma.InputJsonValue,
          qualityscores: qualityScores as unknown as Prisma.InputJsonValue,
        },
      });
      updated += 1;
    }

    console.log(`batch committed cursor=${cursor} cumulative_updated=${updated}`);
  }

  console.log(JSON.stringify({ ok: true, updated }));
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
