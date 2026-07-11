/**
 * Repairs published Zenodo deposits whose description still embeds localhost
 * (or other loopback) X-ray Atlas URLs, or legacy `/browse?nexafsExperiment=`
 * links instead of molecule deep links.
 *
 * Specialized one-off ops script (not CI). Prefer `bun run zenodo:apply` for
 * general citation drift; use this for localhost / deep-link URL repair only.
 *
 * Zenodo only allows metadata updates on unpublished drafts. For published
 * records this script:
 * 1. POST `/deposit/depositions/{id}/actions/edit` (unlock)
 * 2. PUT rebuilt metadata from the Atlas experiment snapshot
 *    (`/molecules/{slug}?nexafsExperiment={id}` on the public origin)
 * 3. POST `/deposit/depositions/{id}/actions/publish` (re-register DataCite;
 *    the DOI string is unchanged)
 *
 * Run:
 *   bun run zenodo:repair-localhost
 *   bun scripts/repair-zenodo-localhost-urls.ts
 *   bun scripts/repair-zenodo-localhost-urls.ts --dry-run
 *   bun scripts/repair-zenodo-localhost-urls.ts --limit=20
 *
 * Requires `DATABASE_URL` and `ZENODO_ACCESS_TOKEN`.
 * Public origin: brand `site.url` unless `ATLAS_PUBLIC_SITE_URL` is set
 * (must not be localhost).
 */

import { db } from "~/server/db";
import {
  buildZenodoDepositMetadata,
  createZenodoClient,
  descriptionContainsLoopbackAtlasUrl,
  descriptionNeedsAtlasExperimentUrlRepair,
  getAtlasPublicSiteOrigin,
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

function hasDryRunFlag(): boolean {
  return process.argv.includes("--dry-run");
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

  const dryRun = hasDryRunFlag();
  const limit = parsePositiveIntFlag("--limit", 50);
  const delayMs = parsePositiveIntFlag("--delay-ms", 1500);
  const publicOrigin = getAtlasPublicSiteOrigin();

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
    `[zenodo-repair-urls] scanning ${deposits.length} published deposit(s) (origin=${publicOrigin}, dryRun=${dryRun}, limit=${limit}, delayMs=${delayMs})`,
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
      const description =
        typeof deposition.metadata?.description === "string"
          ? deposition.metadata.description
          : "";

      if (!descriptionNeedsAtlasExperimentUrlRepair(description)) {
        skipped += 1;
        continue;
      }

      needingRepair += 1;
      const snapshot = await loadZenodoMetadataSnapshot(db, row.experimentid);
      if (!snapshot) {
        failed += 1;
        console.error("[zenodo-repair-urls] missing experiment snapshot", {
          experimentId: row.experimentid,
          depositionId,
        });
        continue;
      }

      const metadata = buildZenodoDepositMetadata(snapshot);
      if (descriptionNeedsAtlasExperimentUrlRepair(metadata.description)) {
        failed += 1;
        console.error(
          "[zenodo-repair-urls] rebuilt description still needs URL repair",
          {
            experimentId: row.experimentid,
            depositionId,
            atlasExperimentUrl: snapshot.atlasExperimentUrl,
          },
        );
        continue;
      }

      console.info("[zenodo-repair-urls] repair candidate", {
        experimentId: row.experimentid,
        depositionId,
        doi: row.doi,
        hadLoopback: descriptionContainsLoopbackAtlasUrl(description),
        from: /https?:\/\/[^"'<\s]+\/(?:browse(?:\/nexafs)?\?nexafsExperiment=[0-9a-fA-F-]{36}|molecules\/[^?\s"'<>]+\?nexafsExperiment=[0-9a-fA-F-]{36})/i.exec(
          description,
        )?.[0],
        to: snapshot.atlasExperimentUrl,
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
      console.info("[zenodo-repair-urls] repaired", {
        experimentId: row.experimentid,
        depositionId,
        doi: row.doi,
      });
    } catch (error) {
      failed += 1;
      console.error("[zenodo-repair-urls] failed", {
        experimentId: row.experimentid,
        depositionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.info("[zenodo-repair-urls] done", {
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
    console.error("[zenodo-repair-urls] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
