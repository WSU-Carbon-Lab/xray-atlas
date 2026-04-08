/**
 * Assigns the `administrator` app role to users matched by `ADMIN_BOOTSTRAP_EMAILS` or
 * `ADMIN_BOOTSTRAP_ORCIDS` (comma-separated). Requires migrations that create `app_role` /
 * `user_app_role` and a row with slug `administrator`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "~/prisma/client";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

config({ path: path.join(rootDir, ".env") });
config({ path: path.join(rootDir, ".env.local") });

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

function splitList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const emails = splitList(process.env.ADMIN_BOOTSTRAP_EMAILS).map((e) =>
  e.toLowerCase(),
);
const orcids = splitList(process.env.ADMIN_BOOTSTRAP_ORCIDS);

if (emails.length === 0 && orcids.length === 0) {
  console.log(
    "Set ADMIN_BOOTSTRAP_EMAILS and/or ADMIN_BOOTSTRAP_ORCIDS (comma-separated); nothing to do.",
  );
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const adminRole = await prisma.appRole.findUnique({
    where: { slug: "administrator" },
  });
  if (!adminRole) {
    console.error(
      "administrator role not found. Apply Prisma migrations before running this script.",
    );
    process.exit(1);
  }

  const administratorRoleId = adminRole.id;
  const linkedUserIds = new Set<string>();
  const missing: string[] = [];

  async function linkAdministrator(userId: string): Promise<void> {
    await prisma.userAppRole.upsert({
      where: {
        userId_roleId: { userId, roleId: administratorRoleId },
      },
      create: { userId, roleId: administratorRoleId },
      update: {},
    });
    linkedUserIds.add(userId);
  }

  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user) {
      missing.push(`email:${email}`);
      continue;
    }
    await linkAdministrator(user.id);
  }

  for (const orcid of orcids) {
    const user = await prisma.user.findFirst({
      where: { orcid: { equals: orcid, mode: "insensitive" } },
    });
    if (!user) {
      missing.push(`orcid:${orcid}`);
      continue;
    }
    await linkAdministrator(user.id);
  }

  console.log(
    `Linked administrator role for ${linkedUserIds.size} distinct user(s).`,
  );
  if (missing.length > 0) {
    console.warn("No user row for:", missing.join(", "));
  }
} finally {
  await prisma.$disconnect();
}
