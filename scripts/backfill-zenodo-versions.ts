/**
 * ONE-OFF backfill of `experiment_zenodo_versions` and the Zenodo concept identifiers.
 * Delete this script after it has been run with `--apply`.
 *
 * Run AFTER applying migration `20261018130000_dataset_versioning`.
 * Infisical `dev` is loaded when `DIRECT_URL` or `DATABASE_URL` is absent:
 *   bun scripts/backfill-zenodo-versions.ts            (dry run, prints planned writes)
 *   bun scripts/backfill-zenodo-versions.ts --apply    (performs the writes)
 *
 * For every `experiment_zenodo_deposits` row the script reads (GET only) the Zenodo deposition
 * and the record's versions list, then plans:
 *   - `concept_doi` / `concept_record_id` on the deposit row when missing;
 *   - one `experiment_zenodo_versions` row labelled `1.0.0` for the deposit's current DOI
 *     (status `published`), or status `unrecoverable` when no DOI can be recovered;
 *   - one `legacy-<recordId>` row (status `published`) for every other Zenodo version found.
 * Existing `(experiment_id, version_label)` rows are never modified, so re-runs are safe.
 *
 * Requires `DATABASE_URL` and `ZENODO_ACCESS_TOKEN` (and `ZENODO_USE_SANDBOX` for sandbox).
 */

import "./ensure-infisical-env";
import { db } from "~/server/db";
import {
  createZenodoClient,
  ZenodoApiError,
} from "~/server/zenodo/zenodo-client";
import {
  zenodoAccessToken,
  zenodoBaseUrl,
} from "~/server/zenodo/zenodo-config";

const APPLY = process.argv.includes("--apply");
const BASELINE_LABEL = "1.0.0";

interface ZenodoRecordVersion {
  recordId: string;
  doi: string | null;
  publishedAt: Date | null;
}

interface PlannedVersion {
  versionLabel: string;
  status: "published" | "unrecoverable";
  doi: string | null;
  recordId: string | null;
  depositionId: string | null;
  publishedAt: Date | null;
}

interface RecordHit {
  id?: number | string;
  doi?: string;
  created?: string;
  updated?: string;
  conceptrecid?: string | number;
  conceptdoi?: string;
}

/** Lists every version of a Zenodo record's concept via the public records API (GET only). */
async function listRecordVersions(
  recordId: string,
  token: string,
): Promise<{
  versions: ZenodoRecordVersion[];
  conceptDoi: string | null;
  conceptRecordId: string | null;
}> {
  const url = `${zenodoBaseUrl().replace(/\/$/, "")}/records/${recordId}/versions?size=100&sort=oldest`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ZenodoApiError(
      response.status,
      `Zenodo versions request failed (${response.status})`,
      (await response.text()).slice(0, 500),
    );
  }
  const body = (await response.json()) as { hits?: { hits?: RecordHit[] } };
  const hits = body.hits?.hits ?? [];
  const versions = hits
    .filter((hit) => hit.id !== undefined)
    .map((hit) => ({
      recordId: String(hit.id),
      doi: hit.doi && hit.doi.length > 0 ? hit.doi : null,
      publishedAt: hit.created ? new Date(hit.created) : null,
    }));
  const first = hits[0];
  return {
    versions,
    conceptDoi: first?.conceptdoi ?? null,
    conceptRecordId:
      first?.conceptrecid !== undefined ? String(first.conceptrecid) : null,
  };
}

async function main(): Promise<void> {
  const token = zenodoAccessToken();
  if (!token) {
    throw new Error(
      "ZENODO_ACCESS_TOKEN is required for the Zenodo read calls.",
    );
  }
  const client = createZenodoClient();
  const deposits = await db.experimentzenododeposits.findMany({
    orderBy: { createdat: "asc" },
  });
  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"}: ${deposits.length} deposit row(s) at ${zenodoBaseUrl()}`,
  );

  let planned = 0;
  let unrecoverable = 0;
  for (const deposit of deposits) {
    const experimentId = deposit.experimentid;
    let conceptDoi = deposit.conceptDoi;
    let conceptRecordId = deposit.conceptRecordId;
    const versionRows: PlannedVersion[] = [];
    const recordId =
      deposit.zenodorecordid !== null ? String(deposit.zenodorecordid) : null;
    const depositionId =
      deposit.zenododepositionid !== null
        ? String(deposit.zenododepositionid)
        : null;

    try {
      let others: ZenodoRecordVersion[] = [];
      if (recordId !== null) {
        const listing = await listRecordVersions(recordId, token);
        conceptDoi ??= listing.conceptDoi;
        conceptRecordId ??= listing.conceptRecordId;
        others = listing.versions.filter((v) => v.recordId !== recordId);
      }
      if (conceptRecordId === null && deposit.zenododepositionid !== null) {
        const remote = await client.getDeposition(deposit.zenododepositionid);
        if (remote.conceptrecid !== undefined) {
          conceptRecordId = String(remote.conceptrecid);
        }
      }
      if (deposit.doi) {
        versionRows.push({
          versionLabel: BASELINE_LABEL,
          status: "published",
          doi: deposit.doi,
          recordId,
          depositionId,
          publishedAt: deposit.publishedat,
        });
      } else {
        versionRows.push({
          versionLabel: BASELINE_LABEL,
          status: "unrecoverable",
          doi: null,
          recordId,
          depositionId,
          publishedAt: null,
        });
      }
      for (const other of others) {
        versionRows.push({
          versionLabel: `legacy-${other.recordId}`,
          status: other.doi ? "published" : "unrecoverable",
          doi: other.doi,
          recordId: other.recordId,
          depositionId: null,
          publishedAt: other.publishedAt,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `  ${experimentId}: Zenodo read failed (${message}); marking unrecoverable`,
      );
      versionRows.length = 0;
      versionRows.push({
        versionLabel: BASELINE_LABEL,
        status: "unrecoverable",
        doi: deposit.doi,
        recordId,
        depositionId,
        publishedAt: null,
      });
    }

    for (const row of versionRows) {
      planned += 1;
      if (row.status === "unrecoverable") unrecoverable += 1;
      console.log(
        `  ${experimentId}: version ${row.versionLabel} status=${row.status} doi=${row.doi ?? "-"} record=${row.recordId ?? "-"}`,
      );
    }
    if (
      conceptDoi !== deposit.conceptDoi ||
      conceptRecordId !== deposit.conceptRecordId
    ) {
      console.log(
        `  ${experimentId}: concept doi=${conceptDoi ?? "-"} record=${conceptRecordId ?? "-"}`,
      );
    }

    if (!APPLY) continue;
    await db.$transaction(async (tx) => {
      await tx.experimentzenododeposits.update({
        where: { experimentid: experimentId },
        data: { conceptDoi, conceptRecordId },
      });
      for (const row of versionRows) {
        await tx.experimentZenodoVersion.upsert({
          where: {
            experimentId_versionLabel: {
              experimentId,
              versionLabel: row.versionLabel,
            },
          },
          create: { experimentId, ...row },
          update: {},
        });
      }
    });
  }

  console.log(
    `${APPLY ? "Applied" : "Planned"} ${planned} version row(s), ${unrecoverable} unrecoverable.`,
  );
  if (!APPLY) console.log("Dry run only. Re-run with --apply to write.");
}

try {
  await main();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
