/**
 * Runs `db-migrate-check` then `prisma migrate deploy` using `DIRECT_URL` from `prisma.config.ts`.
 *
 * Backend sync checklist (Supabase + Prisma):
 * 1. Use `DIRECT_URL` (session pooler :5432 or db.*.supabase.co), never transaction pooler :6543 or pgbouncer=true.
 * 2. After Supabase SQL Editor or MCP DDL, run `scripts/supabase/grant-public-prisma-ownership.sql` and
 *    `scripts/supabase/grant-next-auth-prisma-permissions.sql` so the `prisma` role owns objects it must ALTER (42501).
 * 3. If a migration fails mid-chain, repair SQL/ownership then `bunx prisma migrate resolve --applied|--rolled-back <name>`.
 * 4. When renaming or dropping columns, update migration SQL and app raw SQL together; grep for dropped names before merge.
 * 5. Before merge: `bunx prisma migrate diff` (migrations vs schema) and `bunx prisma generate`; do not commit unreviewed `prisma db pull` output.
 *
 * Run: `bun scripts/db-migrate-run.ts`
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command: string, args: string[]): number {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

function main(): void {
  if (run("bun", ["scripts/db-migrate-check.ts"]) !== 0) {
    process.exit(1);
  }
  const status = run("bunx", ["prisma", "migrate", "deploy"]);
  process.exit(status);
}

main();
