/**
 * Removes `experiment_contributors` rows and `collected_by_user_ids` entries that are not bare ORCID iDs
 * (for example legacy NextAuth user UUIDs stored before the ORCID primary-key migration).
 *
 * Run: `bun scripts/clean-invalid-experiment-contributor-orcids.ts`
 * Dry run: `bun scripts/clean-invalid-experiment-contributor-orcids.ts --dry-run`
 */

import { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import { isValidOrcidUserId } from "~/lib/orcid";

const dryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const contributorRows = await db.experimentcontributors.findMany({
    select: { id: true, orcidid: true, experimentid: true },
  });
  const invalidContributorIds = contributorRows
    .filter((row) => !isValidOrcidUserId(row.orcidid))
    .map((row) => row.id);

  const experiments = await db.experiments.findMany({
    select: { id: true, collectedbyuserids: true },
  });
  const experimentArrayUpdates: Array<{
    id: string;
    collectedbyuserids: string[];
  }> = [];
  for (const experiment of experiments) {
    const filtered = experiment.collectedbyuserids.filter((id) =>
      isValidOrcidUserId(id),
    );
    if (filtered.length !== experiment.collectedbyuserids.length) {
      experimentArrayUpdates.push({
        id: experiment.id,
        collectedbyuserids: filtered,
      });
    }
  }

  console.log(
    `Invalid contributor rows: ${invalidContributorIds.length}; experiments with invalid collected_by_user_ids: ${experimentArrayUpdates.length}`,
  );

  if (dryRun) {
    if (invalidContributorIds.length > 0) {
      console.log(
        "Sample invalid orcid_id values:",
        [
          ...new Set(
            contributorRows
              .filter((row) => !isValidOrcidUserId(row.orcidid))
              .map((row) => row.orcidid),
          ),
        ].slice(0, 10),
      );
    }
    console.log("Dry run only; no writes performed.");
    return;
  }

  await db.$transaction(async (tx) => {
    if (invalidContributorIds.length > 0) {
      await tx.experimentcontributors.deleteMany({
        where: { id: { in: invalidContributorIds } },
      });
    }
    for (const update of experimentArrayUpdates) {
      await tx.experiments.update({
        where: { id: update.id },
        data: { collectedbyuserids: update.collectedbyuserids },
      });
    }
  });

  const remainingInvalid = await db.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM public.experiment_contributors ec
      WHERE ec.orcid_id !~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'
         OR ec.orcid_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `,
  );
  console.log(
    `Done. Remaining invalid experiment_contributors.orcid_id rows: ${remainingInvalid[0]?.count ?? 0n}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
