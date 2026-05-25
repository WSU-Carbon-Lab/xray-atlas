/**
 * Validates `DIRECT_URL` before Prisma CLI migrations (Prisma 7 uses `datasource.url`
 * from `prisma.config.ts`, which must not be the transaction pooler on port 6543).
 *
 * Run: `bun scripts/db-migrate-check.ts`
 */

import { config as loadEnvFile } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(): void {
  loadEnvFile({ path: path.join(repoRoot, ".env") });
  loadEnvFile({ path: path.join(repoRoot, ".env.local") });
}

function validateDirectUrl(raw: string): string[] {
  const issues: string[] = [];
  let parsed: URL;
  try {
    parsed = new URL(raw.replace(/^postgresql:/, "postgres:"));
  } catch {
    return ["DIRECT_URL is not a valid PostgreSQL connection URL"];
  }

  const port = parsed.port || "5432";
  if (port === "6543") {
    issues.push(
      "DIRECT_URL uses port 6543 (Supabase transaction pooler). Use the direct host (db.<project-ref>.supabase.co:5432) or session pooler on 5432.",
    );
  }
  if (parsed.searchParams.get("pgbouncer") === "true") {
    issues.push(
      "DIRECT_URL must not include pgbouncer=true; that belongs on DATABASE_URL only.",
    );
  }
  if (
    parsed.hostname.endsWith(".supabase.com") &&
    !parsed.hostname.includes(".pooler.")
  ) {
    issues.push(
      `DIRECT_URL host "${parsed.hostname}" does not resolve. Supabase migrate hosts are db.<project-ref>.supabase.co:5432 (direct) or aws-*-<region>.pooler.supabase.com:5432 (session pooler), not *.supabase.com without "pooler".`,
    );
  }
  return issues;
}

function main(): void {
  loadEnv();
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error("DIRECT_URL is not set");
    process.exit(1);
  }
  const issues = validateDirectUrl(directUrl);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, message: "DIRECT_URL is suitable for prisma migrate" }));
}

main();
