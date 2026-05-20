import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~/prisma/client";

import { env } from "~/env";

/**
 * Builds a Prisma 7 client backed by the `pg` driver via `@prisma/adapter-pg`, using the pooled
 * `DATABASE_URL` from validated env (Supabase pooler). Prisma CLI migrations use `DIRECT_URL`
 * via `prisma.config.ts` `datasource.url` (not the pooler transaction port).
 */
const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
