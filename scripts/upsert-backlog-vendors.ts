import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BACKLOG_VENDORS = [
  {
    name: "1-Material",
    url: "https://www.1-material.com/",
  },
  {
    name: "Sigma-Aldrich",
    url: "https://www.sigmaaldrich.com/",
  },
  {
    name: "Nano-C, Inc.",
    url: "https://www.nano-c.com/",
  },
  {
    name: "Wei You Group",
    url: "https://you.chem.unc.edu/",
  },
] as const;

async function main() {
  for (const { name, url } of BACKLOG_VENDORS) {
    await prisma.vendors.upsert({
      where: { name },
      create: { name, url },
      update: { url },
    });
  }
  const rows = await prisma.vendors.findMany({
    where: { name: { in: BACKLOG_VENDORS.map((v) => v.name) } },
    select: { id: true, name: true, url: true },
    orderBy: { name: "asc" },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
