/**
 * Runs `prisma migrate deploy` after validating `DIRECT_URL` for Supabase-friendly direct connections.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvAndAssertDirectUrlForMigrate } from "./check-direct-url-for-prisma-migrate";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

try {
  loadEnvAndAssertDirectUrlForMigrate(rootDir);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const result = spawnSync("bunx", ["prisma", "migrate", "deploy"], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
