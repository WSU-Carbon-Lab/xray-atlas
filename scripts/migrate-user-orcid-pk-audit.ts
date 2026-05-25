/**
 * Read-only audit before `20260522120000_user_orcid_primary_key`: reports users without ORCID,
 * duplicate ORCID values, and row counts for FK backfill planning.
 *
 * Run: `bun run db:audit-orcid-pk`
 */
import { db } from "~/server/db";

async function main() {
  const missingOrcid = await db.$queryRaw<
    Array<{ id: string; name: string | null; email: string | null }>
  >`
    SELECT id, name, email
    FROM next_auth."user"
    WHERE orcid IS NULL OR TRIM(orcid) = ''
    ORDER BY name NULLS LAST
  `;

  const duplicateOrcid = await db.$queryRaw<
    Array<{ orcid: string; count: bigint }>
  >`
    SELECT orcid, COUNT(*)::bigint AS count
    FROM next_auth."user"
    WHERE orcid IS NOT NULL AND TRIM(orcid) <> ''
    GROUP BY orcid
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  const totalUsers = await db.user.count();

  console.log("ORCID primary-key migration audit");
  console.log("=================================");
  console.log(`Total users: ${totalUsers}`);
  console.log(`Users missing orcid: ${missingOrcid.length}`);
  if (missingOrcid.length > 0) {
    console.log("\nMissing ORCID (must link ORCID OAuth or delete before migration):");
    for (const row of missingOrcid) {
      console.log(`  - ${row.id}  name=${row.name ?? "(none)"}  email=${row.email ?? "(none)"}`);
    }
  }

  console.log(`\nDuplicate orcid values: ${duplicateOrcid.length}`);
  if (duplicateOrcid.length > 0) {
    console.log("\nDuplicates (must merge or fix before migration):");
    for (const row of duplicateOrcid) {
      console.log(`  - ${row.orcid}  count=${row.count}`);
    }
  }

  if (missingOrcid.length === 0 && duplicateOrcid.length === 0) {
    console.log("\nPre-check PASSED: safe to apply migration 20260522120000_user_orcid_primary_key.");
  } else {
    console.log("\nPre-check FAILED: resolve issues above before applying migration.");
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
