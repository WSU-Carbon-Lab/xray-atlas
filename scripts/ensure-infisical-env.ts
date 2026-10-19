/**
 * Loads the Infisical `dev` environment into the current Bun process when database
 * URLs are absent.
 *
 * Import this module before any module that reads `DIRECT_URL` or `DATABASE_URL`.
 * Its evaluation re-execs `bun <this script>` under `infisical run --env=dev` once,
 * then exits. A process that already has both URLs (including the re-exec, or
 * `infisical run` typed by hand) continues. Prisma CLI entrypoints are not Bun
 * scripts; those package.json scripts wrap `infisical run` themselves.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const INFISICAL_ATTEMPTED = "XRAY_ATLAS_INFISICAL";

/**
 * Re-execs the current script under Infisical `dev` when `DIRECT_URL` or
 * `DATABASE_URL` is missing.
 *
 * Exits the process with the Infisical status when a re-exec is required.
 * Returns when both URLs are already set. Throws when Infisical was already
 * attempted and a URL is still missing, or when the script path cannot be read
 * from `process.argv`.
 */
export function ensureInfisicalDevEnv(): void {
  if (process.env.DIRECT_URL && process.env.DATABASE_URL) {
    return;
  }
  if (process.env[INFISICAL_ATTEMPTED] === "1") {
    throw new Error(
      "DIRECT_URL and DATABASE_URL are still missing after Infisical dev injection.",
    );
  }
  const scriptPath = process.argv[1];
  if (!scriptPath) {
    throw new Error("Cannot re-exec under Infisical without a script path.");
  }
  const result = spawnSync(
    "infisical",
    [
      "run",
      "--env=dev",
      "--",
      "bun",
      path.resolve(scriptPath),
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
      env: { ...process.env, [INFISICAL_ATTEMPTED]: "1" },
    },
  );
  if (result.error) {
    throw new Error(
      `Failed to start Infisical: ${result.error.message}. Run \`infisical login\` and retry.`,
    );
  }
  process.exit(result.status ?? 1);
}

ensureInfisicalDevEnv();
