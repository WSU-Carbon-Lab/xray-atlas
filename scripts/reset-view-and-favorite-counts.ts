/**
 * Manual reset of view and favorite engagement metrics (destructive).
 *
 * Zeros aggregate counters, deletes per-user favorite rows, and clears molecule
 * view history. Experiment browse favorite badges read `experiment_quality.favorites`;
 * molecule browse uses `molecules.favorite_count` / `view_count` plus junction tables.
 *
 * Run: `bun scripts/reset-view-and-favorite-counts.ts`
 * Dry run: `bun scripts/reset-view-and-favorite-counts.ts --dry-run`
 *
 * Do not run against production unless operators intend to wipe engagement history.
 */

import { db } from "~/server/db";

const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const [
    moleculeViewRows,
    moleculeFavoriteRows,
    experimentFavoriteRows,
    moleculeCount,
    experimentMetricsCount,
    experimentQualityCount,
  ] = await Promise.all([
    db.moleculeviews.count(),
    db.moleculefavorites.count(),
    db.experimentfavorites.count(),
    db.molecules.count(),
    db.experimentmetrics.count(),
    db.experimentquality.count(),
  ]);

  console.log("Engagement reset (views + favorites)");
  console.log(`  molecule_views rows: ${moleculeViewRows}`);
  console.log(`  molecule_favorites rows: ${moleculeFavoriteRows}`);
  console.log(`  experiment_favorites rows: ${experimentFavoriteRows}`);
  console.log(`  molecules (zero view_count, favorite_count): ${moleculeCount}`);
  console.log(
    `  experiment_metrics (zero view_count, favorite_count): ${experimentMetricsCount}`,
  );
  console.log(
    `  experiment_quality (zero favorites): ${experimentQualityCount}`,
  );

  if (dryRun) {
    console.log("Dry run only; no writes performed.");
    return;
  }

  await db.$transaction([
    db.moleculeviews.deleteMany({}),
    db.moleculefavorites.deleteMany({}),
    db.experimentfavorites.deleteMany({}),
    db.molecules.updateMany({
      data: { viewcount: 0, favoritecount: 0 },
    }),
    db.experimentmetrics.updateMany({
      data: { viewcount: 0, favoritecount: 0 },
    }),
    db.experimentquality.updateMany({
      data: { favorites: 0 },
    }),
  ]);

  console.log("Done. All listed counters and junction rows were reset.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
