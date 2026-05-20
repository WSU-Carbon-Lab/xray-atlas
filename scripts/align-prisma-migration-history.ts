/**
 * Reconciles `_prisma_migrations` with `prisma/migrations/` when Supabase applied early
 * migrations outside this repo folder layout. Uses `DIRECT_URL` (see `prisma.config.ts`).
 *
 * Run: `bun scripts/align-prisma-migration-history.ts`
 */

import { readdirSync } from "node:fs";
import path from "node:path";
import { config as loadEnvFile } from "dotenv";
import pg from "pg";

function loadEnv(): void {
  const root = path.resolve(import.meta.dir, "..");
  loadEnvFile({ path: path.join(root, ".env") });
  loadEnvFile({ path: path.join(root, ".env.local") });
}

function localMigrationNames(): string[] {
  const dir = path.join(import.meta.dir, "..", "prisma", "migrations");
  return readdirSync(dir).filter((name) => name !== "migration_lock.toml");
}

async function main(): Promise<void> {
  loadEnv();
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    throw new Error("DIRECT_URL is required");
  }

  const local = localMigrationNames();
  const client = new pg.Client({
    connectionString: directUrl,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 60_000,
  });
  await client.connect();

  const dedupe = await client.query(`
    DELETE FROM "_prisma_migrations" a
    USING "_prisma_migrations" b
    WHERE a.migration_name = b.migration_name
      AND a.ctid < b.ctid
  `);

  const removed = await client.query(
    `
    DELETE FROM "_prisma_migrations"
    WHERE migration_name <> ALL($1::text[])
    RETURNING migration_name
  `,
    [local],
  );

  await client.end();

  console.log(
    JSON.stringify({
      ok: true,
      localMigrationCount: local.length,
      duplicateRowsRemoved: dedupe.rowCount ?? 0,
      orphanRowsRemoved: removed.rowCount ?? 0,
      orphanNames: removed.rows.map((r) => r.migration_name as string),
      next: [
        "bunx prisma migrate resolve --applied <name>  # for each migration already in schema",
        "bunx prisma migrate deploy",
        "bunx prisma migrate status",
      ],
    }),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
