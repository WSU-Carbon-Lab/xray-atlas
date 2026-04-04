/**
 * Prisma CLI configuration (Prisma 7+): supplies datasource URLs for migrate, db push, and
 * introspection. Loads `.env` then `.env.local` from the project root so local overrides match
 * Next.js; use `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) as in `src/env.js`.
 */
import type { PrismaConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

const rootDir = path.dirname(fileURLToPath(new URL(import.meta.url)));
loadEnv({ path: path.join(rootDir, ".env") });
loadEnv({ path: path.join(rootDir, ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  } as NonNullable<PrismaConfig["datasource"]>,
});
