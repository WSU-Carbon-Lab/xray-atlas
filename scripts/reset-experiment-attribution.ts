/**
 * One-time attribution reset: clears `experiment_contributors`, sets every experiment uploader
 * to `ATLAS_LEGACY_UPLOADER_ORCID`, clears `collected_by_user_ids`, and inserts a single owner row.
 *
 * Run: `bun scripts/reset-experiment-attribution.ts`
 * Dry run: `bun scripts/reset-experiment-attribution.ts --dry-run`
 *
 * Prefer `prisma migrate deploy` when the migration
 * `20260528160000_reset_experiment_attribution_uploader` is available; this script mirrors that SQL
 * for manual repair or environments where migrate deploy is blocked on the pooler.
 */

import { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import { ATLAS_LEGACY_UPLOADER_ORCID } from "~/server/nexafs/experimentContributorRoles";

const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const experimentCount = await db.experiments.count();
  const contributorCount = await db.experimentcontributors.count();

  console.log(
    `Experiments: ${experimentCount}, experiment_contributors rows: ${contributorCount}`,
  );
  console.log(`Uploader ORCID: ${ATLAS_LEGACY_UPLOADER_ORCID}`);
  if (dryRun) {
    console.log("Dry run only; no writes performed.");
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.experimentcontributors.deleteMany({});
    await tx.experiments.updateMany({
      data: {
        createdby: ATLAS_LEGACY_UPLOADER_ORCID,
        collectedbyuserids: [],
      },
    });
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO public.experiment_contributors (
          experiment_id,
          orcid_id,
          user_id,
          role,
          is_claimed,
          is_public_profile_visible,
          claimed_at
        )
        SELECT
          e.id,
          ${ATLAS_LEGACY_UPLOADER_ORCID},
          ${ATLAS_LEGACY_UPLOADER_ORCID},
          'DataCurator',
          true,
          true,
          COALESCE(e.createdat, CURRENT_TIMESTAMP)
        FROM public.experiments e
        ON CONFLICT (experiment_id, orcid_id, role) DO NOTHING
      `,
    );
  });

  const afterContributors = await db.experimentcontributors.count();
  console.log(`Done. experiment_contributors rows: ${afterContributors}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
