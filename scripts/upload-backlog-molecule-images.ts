import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { uploadMoleculeImage } from "../src/server/storage";

const prisma = new PrismaClient();

type IndexMolecule = {
  name: string;
  InChI: string;
};

type Candidate = {
  name: string;
  casnumber: string | null;
  pubchemcid: string | null;
};

const ROOT = join(import.meta.dirname, "..");
const INDEX_PATH = join(ROOT, "s3", "MOLECULES", "INDEX.json");
const MOLECULES_DIR = join(ROOT, "s3", "MOLECULES");

const BACKLOG: Candidate[] = [
  { name: "D18", casnumber: "2433725-54-1", pubchemcid: null },
  { name: "ITIC", casnumber: "1664293-06-4", pubchemcid: "126843541" },
  { name: "N2200", casnumber: "1100243-40-0", pubchemcid: "102164850" },
  { name: "P3HT", casnumber: "104934-50-1", pubchemcid: "566849" },
  { name: "PBDB-T", casnumber: "1415929-80-4", pubchemcid: null },
  { name: "PBTTT", casnumber: "888491-18-7", pubchemcid: "57473786" },
  {
    name: "PC61BM",
    casnumber: "160848-21-5",
    pubchemcid: "53384373",
  },
  {
    name: "PC71BM",
    casnumber: "609771-63-3",
    pubchemcid: "71777692",
  },
  { name: "Y11", casnumber: null, pubchemcid: null },
  { name: "Y6", casnumber: "2304444-49-1", pubchemcid: "145705715" },
];

function normalizeInchi(value: string): string {
  const t = value.trim();
  if (t.startsWith("InChI=")) return t;
  return `InChI=${t}`;
}

async function main(): Promise<void> {
  const raw = await readFile(INDEX_PATH, "utf8");
  const parsed = JSON.parse(raw) as { molecules: IndexMolecule[] };
  const indexByName = new Map<string, IndexMolecule>();
  for (const m of parsed.molecules) indexByName.set(m.name, m);

  const operations: Array<{
    name: string;
    moleculeId: string;
    imageurl: string;
  }> = [];

  for (const candidate of BACKLOG) {
    const indexMolecule = indexByName.get(candidate.name);
    if (!indexMolecule) throw new Error(`Missing INDEX entry for ${candidate.name}`);

    const inchi = normalizeInchi(indexMolecule.InChI);

    const existing =
      candidate.pubchemcid !== null
        ? await prisma.molecules.findUnique({
            where: { pubchemcid: candidate.pubchemcid },
            select: { id: true, imageurl: true },
          })
        : candidate.casnumber !== null
          ? await prisma.molecules.findUnique({
              where: { casnumber: candidate.casnumber },
              select: { id: true, imageurl: true },
            })
          : await prisma.molecules.findFirst({
              where: { inchi },
              select: { id: true, imageurl: true },
            });

    if (!existing) throw new Error(`Molecule not found for ${candidate.name}`);

    const svgPath = join(MOLECULES_DIR, candidate.name, "IMG.svg");
    const imageBuffer = await readFile(svgPath);

    const publicUrl = await uploadMoleculeImage(
      existing.id,
      imageBuffer,
      "image/svg+xml",
    );

    await prisma.molecules.update({
      where: { id: existing.id },
      data: { imageurl: publicUrl },
    });

    operations.push({
      name: candidate.name,
      moleculeId: existing.id,
      imageurl: publicUrl,
    });
  }

  console.log(JSON.stringify(operations, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

