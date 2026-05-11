/**
 * Exports sorted spectrumpoints (energyEv, beta) as JSON for ad-hoc tooling.
 *
 * KK validation tests use a committed **CSV** SSOT under `src/features/kk-calc/__fixtures__/`
 * (DB export with energy_eV, beta, delta); prefer refreshing that CSV when parity checks need new data.
 *
 * Requires `DATABASE_URL` in the environment (pooled Postgres URL). Does not print secrets.
 *
 * Usage:
 *   DATABASE_URL=... bun scripts/export-kk-calc-fixture.ts --experiment <uuid> --out <path.json>
 */

import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

interface Row {
  energyev: number;
  beta: number | null;
  polarizationid: string | null;
}

function parseArgs(argv: string[]): {
  experimentId: string;
  outPath: string;
} {
  let experimentId = "";
  let outPath = "";
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--experiment" && argv[i + 1]) {
      experimentId = argv[++i]!;
    } else if (a === "--out" && argv[i + 1]) {
      outPath = argv[++i]!;
    }
  }
  if (!experimentId || !outPath) {
    throw new Error(
      "Usage: bun scripts/export-kk-calc-fixture.ts --experiment <uuid> --out <path.json>",
    );
  }
  return { experimentId, outPath };
}

async function main(): Promise<void> {
  const { experimentId, outPath } = parseArgs(process.argv);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const res = await client.query<Row>(
    `SELECT "energyev", "beta", "polarizationid"
     FROM "public"."spectrumpoints"
     WHERE "experimentid" = $1::uuid
       AND "beta" IS NOT NULL
     ORDER BY "polarizationid" NULLS LAST, "energyev" ASC`,
    [experimentId],
  );
  await client.end();

  if (res.rows.length === 0) {
    throw new Error("No spectrumpoints with finite beta for this experiment");
  }

  const byPol = new Map<string | null, Row[]>();
  for (const row of res.rows) {
    if (row.beta === null || !Number.isFinite(row.beta)) continue;
    const k = row.polarizationid;
    const list = byPol.get(k) ?? [];
    list.push(row);
    byPol.set(k, list);
  }

  let chosen: Row[] = [];
  let chosenPol: string | null = null;
  for (const [pol, rows] of byPol) {
    if (rows.length > chosen.length) {
      chosen = rows;
      chosenPol = pol;
    }
  }

  const energyEv = chosen.map((r) => r.energyev);
  const beta = chosen.map((r) => {
    if (r.beta === null || !Number.isFinite(r.beta)) {
      throw new Error("Internal: row without finite beta in chosen trace");
    }
    return r.beta;
  });

  const payload = {
    experimentId,
    polarizationId: chosenPol,
    energyEv,
    beta,
    _regenerate: `DATABASE_URL=... bun scripts/export-kk-calc-fixture.ts --experiment ${experimentId} --out ${outPath}`,
  };

  const absOut = path.isAbsolute(outPath)
    ? outPath
    : path.join(process.cwd(), outPath);
  await writeFile(absOut, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${energyEv.length} points (polarizationId=${JSON.stringify(chosenPol)}) to ${absOut}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
