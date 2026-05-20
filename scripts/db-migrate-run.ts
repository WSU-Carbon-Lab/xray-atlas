/**
 * Runs `db-migrate-check` then `prisma migrate deploy` using `DIRECT_URL` from `prisma.config.ts`.
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
