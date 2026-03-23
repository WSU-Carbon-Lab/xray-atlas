import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type IndexMolecule = {
  name: string;
  synonyms: string[];
  chemical_formula: string;
  description: string;
  SMILES: string;
  InChI: string;
};

type Candidate = {
  name: string;
  commonName: string;
  additionalSynonyms: string[];
  tags: string[];
  casnumber: string | null;
  pubchemcid: string | null;
  chemicalformulaOverride?: string | null;
  iupacnameOverride?: string | null;
};

const ROOT = join(import.meta.dirname, "..");
const INDEX_PATH = join(ROOT, "s3", "MOLECULES", "INDEX.json");

const Y11_IUPAC_OVERRIDE =
  "2,2'-((2Z,2'Z)-((6,12,13-tris(2-ethylhexyl)-3,9-diundecyl-12,13-dihydro-6H-thieno[2'',3'':4',5']thieno[2',3':4,5]pyrrolo[3,2-g]thieno[2',3':4,5]thieno[3,2b][1,2,3] triazolo [4,5-e]indole-2,10-diyl)bis(methanylylidene))bis(5,6-difluoro-3-oxo-2,3-dihydro-1H-indene-2,1-diylidene)) dimalononitrile";

const BACKLOG: Candidate[] = [
  {
    name: "D18",
    commonName: "D18",
    additionalSynonyms: ["PCE18"],
    tags: ["donor", "polymer", "opv"],
    casnumber: "2433725-54-1",
    pubchemcid: null,
  },
  {
    name: "ITIC",
    commonName: "ITIC",
    additionalSynonyms: [],
    tags: ["acceptor", "small-molecule", "opv"],
    casnumber: "1664293-06-4",
    pubchemcid: "126843541",
  },
  {
    name: "N2200",
    commonName: "N2200",
    additionalSynonyms: [
      "PNDI(2OD)2T",
      "PNDI-2T",
      "P(NDI2OD-T2)",
    ],
    tags: ["acceptor", "polymer", "opv"],
    casnumber: "1100243-40-0",
    pubchemcid: "102164850",
    chemicalformulaOverride: "C62H90N2O4S2",
  },
  {
    name: "P3HT",
    commonName: "P3HT",
    additionalSynonyms: [],
    tags: ["donor", "polymer", "opv"],
    casnumber: "104934-50-1",
    pubchemcid: "566849",
  },
  {
    name: "PBDB-T",
    commonName: "PBDB-T",
    additionalSynonyms: ["PCE12", "PBDTBDD"],
    tags: ["donor", "polymer", "opv"],
    casnumber: "1415929-80-4",
    pubchemcid: null,
  },
  {
    name: "PBTTT",
    commonName: "PBTTT",
    additionalSynonyms: ["PBTTT-C12"],
    tags: ["donor", "polymer", "ofet"],
    casnumber: "888491-18-7",
    pubchemcid: "57473786",
  },
  {
    name: "PC61BM",
    commonName: "PC61BM",
    additionalSynonyms: [
      "C60PCBM",
      "C61PCBM",
      "[60]PCBM",
      "3'H-cyclopropa[1,9][5,6]fullerene-C60-Ih-3'-butanoic acid 3'-phenyl methyl ester",
    ],
    tags: ["acceptor", "small-molecule", "opv"],
    casnumber: "160848-21-5",
    pubchemcid: "53384373",
  },
  {
    name: "PC71BM",
    commonName: "PC71BM",
    additionalSynonyms: ["C70 PCBM", "[70]PCBM"],
    tags: ["acceptor", "small-molecule", "opv"],
    casnumber: "609771-63-3",
    pubchemcid: "71777692",
  },
  {
    name: "Y11",
    commonName: "Y11",
    additionalSynonyms: [],
    tags: ["acceptor", "small-molecule", "opv"],
    casnumber: null,
    pubchemcid: null,
    iupacnameOverride: Y11_IUPAC_OVERRIDE,
  },
  {
    name: "Y6",
    commonName: "Y6",
    additionalSynonyms: [
      "BTP-4F",
      "TTPTTI-4F",
      "BTPTT-4F",
      "Y6F",
      "BTP-4F-8",
    ],
    tags: ["acceptor", "small-molecule", "opv"],
    casnumber: "2304444-49-1",
    pubchemcid: "145705715",
  },
];

function normalizeInchi(value: string): string {
  const t = value.trim();
  if (!t) return t;
  if (t.startsWith("InChI=")) return t;
  return `InChI=${t}`;
}

function dedupePreserveOrder(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const t = v.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

async function main() {
  const raw = await readFile(INDEX_PATH, "utf8");
  const parsed = JSON.parse(raw) as { molecules: IndexMolecule[] };

  const indexByName = new Map<string, IndexMolecule>();
  for (const m of parsed.molecules) indexByName.set(m.name, m);

  const allTagSlugs = Array.from(new Set(BACKLOG.flatMap((b) => b.tags)));
  const tagRows = await prisma.tags.findMany({
    where: { slug: { in: allTagSlugs } },
    select: { id: true, slug: true },
  });
  const tagBySlug = new Map(tagRows.map((t) => [t.slug, t.id]));
  const missing = allTagSlugs.filter((s) => !tagBySlug.has(s));
  if (missing.length) {
    throw new Error(`Missing tag rows for slugs: ${missing.join(", ")}`);
  }

  const results: Array<{
    name: string;
    action: "created" | "updated" | "skipped";
    moleculeId: string;
  }> = [];

  for (const candidate of BACKLOG) {
    const indexMolecule = indexByName.get(candidate.name);
    if (!indexMolecule) throw new Error(`Missing INDEX entry for ${candidate.name}`);

    const inchi = normalizeInchi(indexMolecule.InChI);
    const smiles = indexMolecule.SMILES.trim();
    const iupacname = (
      candidate.iupacnameOverride ?? indexMolecule.description
    ).trim();
    const chemicalformula =
      (candidate.chemicalformulaOverride ??
        indexMolecule.chemical_formula).trim();

    const additionalSynonyms = candidate.additionalSynonyms.map((s) => s.trim());
    const allSynonyms = dedupePreserveOrder([candidate.commonName, ...additionalSynonyms]);

    const tagIds = dedupePreserveOrder(candidate.tags).map((slug) => {
      const id = tagBySlug.get(slug);
      if (!id) throw new Error(`Missing tag id for slug ${slug}`);
      return id;
    });

    const existing =
      candidate.pubchemcid !== null
        ? await prisma.molecules.findUnique({
            where: { pubchemcid: candidate.pubchemcid },
            select: { id: true, casnumber: true, pubchemcid: true },
          })
        : candidate.casnumber !== null
          ? await prisma.molecules.findUnique({
              where: { casnumber: candidate.casnumber },
              select: { id: true, casnumber: true, pubchemcid: true },
            })
          : await prisma.molecules.findFirst({
              where: { inchi },
              select: { id: true, casnumber: true, pubchemcid: true },
            });

    if (!existing) {
      const created = await prisma.molecules.create({
        data: {
          iupacname,
          inchi,
          smiles,
          chemicalformula,
          casnumber: candidate.casnumber,
          pubchemcid: candidate.pubchemcid,
          createdby: null,
          moleculesynonyms: {
            create: allSynonyms.map((synonym, order) => ({
              synonym,
              order,
            })),
          },
          ...(tagIds.length
            ? {
                moleculetags: {
                  create: tagIds.map((tagid) => ({ tagid })),
                },
              }
            : {}),
        },
        select: { id: true },
      });
      results.push({
        name: candidate.name,
        action: "created",
        moleculeId: created.id,
      });
      continue;
    }

    const updateData: Record<string, unknown> = {};
    if (existing.casnumber === null && candidate.casnumber !== null) {
      updateData.casnumber = candidate.casnumber;
    }
    if (existing.pubchemcid === null && candidate.pubchemcid !== null) {
      updateData.pubchemcid = candidate.pubchemcid;
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.molecules.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    await prisma.moleculesynonyms.createMany({
      data: allSynonyms.map((synonym, order) => ({
        moleculeid: existing.id,
        synonym,
        order,
      })),
      skipDuplicates: true,
    });

    await prisma.moleculetags.createMany({
      data: tagIds.map((tagid) => ({ moleculeid: existing.id, tagid })),
      skipDuplicates: true,
    });

    results.push({
      name: candidate.name,
      action: Object.keys(updateData).length > 0 ? "updated" : "skipped",
      moleculeId: existing.id,
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

