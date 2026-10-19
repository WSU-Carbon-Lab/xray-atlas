/**
 * Runs a Prisma CLI command, loading Infisical `dev` only when `DIRECT_URL`
 * is absent.
 *
 * Vercel installs dependencies with `bun install`, which runs `postinstall`.
 * That environment already has `DIRECT_URL` from the Infisical sync and does
 * not have the Infisical CLI. A local shell without `DIRECT_URL` re-execs the
 * same Prisma arguments under `infisical run --env=dev`.
 *
 * Arguments after the script name are the Prisma CLI arguments, for example
 * `generate` or `migrate status`. The process exits with the Prisma status.
 */

import { spawnSync } from "node:child_process";

/**
 * Runs `prisma` with `args`, prefixing Infisical `dev` when `DIRECT_URL` is unset.
 *
 * @param args - Prisma CLI arguments, such as `["generate"]`. Must be non-empty.
 * @returns The Prisma process status code. `1` when the child reports no status.
 * @throws When `args` is empty, or when Infisical must run and the CLI cannot be started.
 */
function runPrisma(args: readonly string[]): number {
  if (args.length === 0) {
    throw new Error(
      "Pass Prisma CLI arguments, for example: bun scripts/prisma-with-infisical.ts generate",
    );
  }
  const command = process.env.DIRECT_URL ? "prisma" : "infisical";
  const commandArgs = process.env.DIRECT_URL
    ? [...args]
    : ["run", "--env=dev", "--", "prisma", ...args];
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    throw new Error(
      `Failed to start ${command}: ${result.error.message}. Set DIRECT_URL, or install the Infisical CLI and run \`infisical login\`.`,
    );
  }
  return result.status ?? 1;
}

process.exit(runPrisma(process.argv.slice(2)));
