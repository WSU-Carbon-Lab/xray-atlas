/**
 * Sanity-checks `DIRECT_URL` before `prisma migrate deploy` against common Supabase misconfiguration
 * (using the transaction pooler port 6543 for migrations), which often appears as a hung CLI.
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Loads `.env` and `.env.local` from `rootDir`, then validates `DIRECT_URL` for `prisma migrate deploy`.
 *
 * @param rootDir - Repository root containing `.env` / `.env.local`.
 * @throws Error When `DIRECT_URL` is unset or uses transaction pooler port `6543`.
 */
export function loadEnvAndAssertDirectUrlForMigrate(
  rootDir: string = defaultRootDir,
): void {
  config({ path: path.join(rootDir, ".env") });
  config({ path: path.join(rootDir, ".env.local") });

  const direct = process.env.DIRECT_URL?.trim() ?? "";

  if (!direct) {
    throw new Error(
      "DIRECT_URL is not set. Add it to .env or .env.local (see .env.example).",
    );
  }

  if (direct.includes(":6543")) {
    throw new Error(
      "DIRECT_URL must not use port 6543 (transaction pooler). Use the direct URI from Supabase (host db.<project-ref>.supabase.co, port 5432). See .env.example.",
    );
  }

  if (direct.includes("pooler.supabase.com")) {
    console.warn(
      "DIRECT_URL still points at pooler.supabase.com. If migrate deploy stalls, switch to db.<project-ref>.supabase.co from Supabase Settings > Database > URI.",
    );
  }

  console.log("DIRECT_URL looks OK for prisma migrate (quick check passed).");
}

if (import.meta.main) {
  try {
    loadEnvAndAssertDirectUrlForMigrate(defaultRootDir);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
