import { PrismaClient } from "@prisma/client";
import type { ExperimentType } from "@prisma/client";

const prisma = new PrismaClient();

const KIND_ROWS: Array<{
  token: string;
  label: string;
  experimenttype: ExperimentType;
}> = [
  { token: "TEY", label: "Total Electron Yield", experimenttype: "TOTAL_ELECTRON_YIELD" },
  { token: "PEY", label: "Partial Electron Yield", experimenttype: "PARTIAL_ELECTRON_YIELD" },
  { token: "FY", label: "Fluorescent Yield", experimenttype: "FLUORESCENT_YIELD" },
  { token: "TRANS", label: "Transmission", experimenttype: "TRANSMISSION" },
];

async function main() {
  for (const row of KIND_ROWS) {
    await prisma.nexafsexperimentkinds.upsert({
      where: { experimenttype: row.experimenttype },
      create: {
        token: row.token,
        label: row.label,
        experimenttype: row.experimenttype,
      },
      update: {
        token: row.token,
        label: row.label,
      },
    });
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

