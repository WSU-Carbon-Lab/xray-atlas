/**
 * Repairs published Zenodo deposits whose titles still use informal `@` facility
 * markers (or other pre-formal title shapes) by rebuilding metadata from the
 * Atlas experiment snapshot.
 *
 * New mints already use {@link buildNexafsDatasetCitationTitle} via
 * `buildZenodoDepositMetadata`. This script refreshes already-published records:
 * 1. POST `/deposit/depositions/{id}/actions/edit` (unlock)
 * 2. PUT rebuilt metadata (formal title, no `@`)
 * 3. POST `/deposit/depositions/{id}/actions/publish` (DOI string unchanged)
 *
 * Run:
 *   bun scripts/repair-zenodo-dataset-titles.ts
 *   bun scripts/repair-zenodo-dataset-titles.ts --dry-run
 *   bun scripts/repair-zenodo-dataset-titles.ts --limit=20
 *
 * Without flags, only deposits whose Zenodo title differs from the rebuilt
 * formal title are updated (covers informal `@` titles and other legacy shapes).
 *
 * Requires `DATABASE_URL` and `ZENODO_ACCESS_TOKEN`.
 */

import { db } from "~/server/db";
import {
  buildZenodoDepositMetadata,
  createZenodoClient,
  isZenodoMintingEnabled,
  loadZenodoMetadataSnapshot,
} from "~/server/zenodo";

function parsePositiveIntFlag(name: string, fallback: number): number {
  const flag = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return fallback;
  const value = Number(flag.slice(name.length + 1));
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`Invalid ${name} value`);
  }
  return Math.floor(value);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(): Promise<void> {
  if (!isZenodoMintingEnabled()) {
    console.error(
      "Zenodo minting disabled: set ZENODO_ACCESS_TOKEN before repairing deposits.",
    );
    process.exitCode = 1;
    return;
  }

  const dryRun = hasFlag("--dry-run");
  const limit = parsePositiveIntFlag("--limit", 50);
  const delayMs = parsePositiveIntFlag("--delay-ms", 1500);

  const deposits = await db.experimentzenododeposits.findMany({
    where: {
      state: "published",
      zenododepositionid: { not: null },
    },
    orderBy: [{ publishedat: "asc" }, { experimentid: "asc" }],
    take: limit,
    select: {
      experimentid: true,
      zenododepositionid: true,
      doi: true,
      recordurl: true,
    },
  });

  console.info(
    `[zenodo-repair-titles] scanning ${deposits.length} published deposit(s) (dryRun=${dryRun}, limit=${limit}, delayMs=${delayMs})`,
  );

  const client = createZenodoClient({ maxRetries: 6, requestTimeoutMs: 90_000 });
  let scanned = 0;
  let needingRepair = 0;
  let repaired = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of deposits) {
    scanned += 1;
    const depositionId = row.zenododepositionid;
    if (depositionId == null) {
      skipped += 1;
      continue;
    }

    if (scanned > 1 && delayMs > 0) {
      await sleep(delayMs);
    }

    try {
      const deposition = await client.getDeposition(depositionId);
      const currentTitle =
        typeof deposition.metadata?.title === "string"
          ? deposition.metadata.title
          : "";

      const snapshot = await loadZenodoMetadataSnapshot(db, row.experimentid);
      if (!snapshot) {
        failed += 1;
        console.error("[zenodo-repair-titles] missing experiment snapshot", {
          experimentId: row.experimentid,
          depositionId,
        });
        continue;
      }

      const metadata = buildZenodoDepositMetadata(snapshot);
      if (currentTitle.trim() === metadata.title.trim()) {
        skipped += 1;
        continue;
      }

      needingRepair += 1;
      console.info("[zenodo-repair-titles] repair candidate", {
        experimentId: row.experimentid,
        depositionId,
        doi: row.doi,
        from: currentTitle,
        to: metadata.title,
        dryRun,
      });

      if (dryRun) {
        continue;
      }

      if (deposition.submitted) {
        await client.editDeposition(depositionId);
      }
      await client.updateDepositionMetadata(depositionId, metadata);
      await client.publishDeposition(depositionId);
      repaired += 1;
      console.info("[zenodo-repair-titles] repaired", {
        experimentId: row.experimentid,
        depositionId,
        doi: row.doi,
        title: metadata.title,
      });
    } catch (error) {
      failed += 1;
      console.error("[zenodo-repair-titles] failed", {
        experimentId: row.experimentid,
        depositionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.info("[zenodo-repair-titles] done", {
    scanned,
    needingRepair,
    repaired,
    skipped,
    failed,
    dryRun,
  });

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error("[zenodo-repair-titles] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
