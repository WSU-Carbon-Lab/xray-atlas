/**
 * Backfills `experiments.kk_delta_metadata` for rows that already have finite `spectrumpoints.delta`
 * but no provenance JSON (for example after adding the column on an existing database).
 *
 * Run: `bun scripts/backfill-experiment-kk-delta-metadata.ts`
 *
 * Requires `DATABASE_URL` (same wiring as `~/server/db` via `~/env`).
 */

import { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import {
  buildKkDeltaMetadata,
  kkDeltaMetadataToJson,
} from "~/server/nexafs/kkDeltaMetadata";

async function main(): Promise<void> {
  const backfilledAt = new Date();
  let updated = 0;
  let cursor: string | undefined;

  for (;;) {
    const batch = await db.experiments.findMany({
      where: {
        kkdeltametadata: { equals: Prisma.DbNull },
        ...(cursor ? { id: { gt: cursor } } : {}),
        spectrumpoints: {
          some: {
            delta: { not: null },
          },
        },
      },
      take: 50,
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (batch.length === 0) {
      break;
    }

    cursor = batch[batch.length - 1]!.id;

    const metadata = buildKkDeltaMetadata({
      source: "kk_browser_recalculate",
      calculatedAt: backfilledAt,
      calculatedByUserId: null,
    });
    const metadataJson = kkDeltaMetadataToJson(metadata);

    for (const exp of batch) {
      const hasFiniteDelta = await db.spectrumpoints.findFirst({
        where: {
          experimentid: exp.id,
          delta: { not: null },
        },
        select: { id: true },
      });
      if (!hasFiniteDelta) {
        continue;
      }

      await db.experiments.update({
        where: { id: exp.id },
        data: {
          kkdeltametadata: metadataJson,
          updatedat: backfilledAt,
        },
      });
      updated += 1;
    }

    console.log(
      `batch committed cursor=${cursor} cumulative_updated=${updated} calculatedAt=${backfilledAt.toISOString()}`,
    );
  }

  console.log(
    JSON.stringify({
      ok: true,
      updated,
      calculatedAt: backfilledAt.toISOString(),
    }),
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
