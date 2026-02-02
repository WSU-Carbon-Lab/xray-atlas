import type { MoleculeView, MoleculeViewCreatedBy } from "~/types/molecule";

type SynonymRow = { synonym: string; order: number };
type ContributorRow = {
  id: string;
  userid: string;
  contributiontype: string;
  contributedat: Date;
  user: { id: string; name: string | null; image: string | null };
};
type TagRow = { id: string; name: string; slug: string; color: string | null };

interface BaseMoleculeRow {
  id: string;
  iupacname: string;
  smiles: string;
  inchi: string;
  chemicalformula: string;
  casnumber: string | null;
  pubchemcid: string | null;
  imageurl: string | null;
  favoritecount: number;
  viewcount?: number;
  createdat?: Date;
  updatedat?: Date;
  moleculesynonyms: SynonymRow[];
}

type SampleRow = {
  id: string;
  identifier: string | null;
  preparationdate: Date | null;
};

interface FullMoleculeRow extends BaseMoleculeRow {
  moleculecontributors?: ContributorRow[];
  moleculetags?: { tags: TagRow }[];
  samples?: SampleRow[];
}

function primaryName(row: BaseMoleculeRow): string {
  const sorted = [...row.moleculesynonyms].sort(
    (a, b) => a.order - b.order || a.synonym.localeCompare(b.synonym),
  );
  const primary = sorted.find((s) => s.order === 0);
  return primary?.synonym ?? sorted[0]?.synonym ?? row.iupacname;
}

function commonNames(row: BaseMoleculeRow): string[] {
  const sorted = [...row.moleculesynonyms].sort(
    (a, b) => a.order - b.order || a.synonym.localeCompare(b.synonym),
  );
  return sorted.map((s) => s.synonym).filter(Boolean);
}

export function toMoleculeView(
  row: FullMoleculeRow,
  options: { userHasFavorited: boolean },
): MoleculeView {
  const name = primaryName(row);
  const synonymList = commonNames(row);
  const createdBy = creatorFromContributors(row.moleculecontributors);

  return {
    name,
    iupacName: row.iupacname,
    commonName: synonymList.length > 0 ? synonymList : undefined,
    chemicalFormula: row.chemicalformula,
    SMILES: row.smiles,
    InChI: row.inchi,
    pubChemCid: row.pubchemcid ?? undefined,
    casNumber: row.casnumber ?? undefined,
    imageUrl: row.imageurl ?? undefined,
    id: row.id,
    favoriteCount: row.favoritecount,
    userHasFavorited: options.userHasFavorited,
    createdBy: createdBy ?? undefined,
    contributors: row.moleculecontributors?.map((c) => ({
      id: c.id,
      userId: c.userid,
      contributionType: c.contributiontype,
      contributedAt: c.contributedat,
      user: c.user,
    })),
    tags: row.moleculetags?.map((mt) => mt.tags),
    viewCount: row.viewcount,
    sampleCount: Array.isArray(row.samples) ? row.samples.length : undefined,
    samples: row.samples?.map((s) => ({
      id: s.id,
      identifier: s.identifier,
      preparationdate: s.preparationdate,
    })),
    createdAt: row.createdat,
    updatedAt: row.updatedat,
  };
}

function creatorFromContributors(
  contributors?: ContributorRow[],
): MoleculeViewCreatedBy | null {
  if (!contributors?.length) return null;
  const creator = contributors.find(
    (c) => c.contributiontype.toLowerCase() === "creator",
  );
  if (!creator) return null;
  return {
    id: creator.user.id,
    name: creator.user.name,
    image: creator.user.image,
  };
}
