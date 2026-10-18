/**
 * Loads the anonymous molecule detail row as independent Prisma reads.
 *
 * Does not cache, does not read favorites, and does not resolve slugs.
 * Callers pass a molecule id they have already resolved. A missing molecule
 * yields null.
 */

import { db } from "~/server/db";

/**
 * Anonymous molecule detail row shaped for `toMoleculeView`.
 *
 * `samples` lists every sample of the molecule, including samples with zero
 * experiments. `identifier` is non-null in Prisma and is widened to
 * `string | null` at this boundary. `_count.experiments` is the experiment
 * total for that sample so callers can sum `experimentCount` and set
 * `sampleCount` from `samples.length`.
 */
export interface MoleculePublicDetailRow {
  id: string;
  iupacname: string;
  smiles: string;
  inchi: string;
  chemicalformula: string;
  casnumber: string | null;
  pubchemcid: string | null;
  imageurl: string | null;
  favoritecount: number;
  viewcount: number;
  createdat: Date;
  updatedat: Date;
  createdby: string | null;
  moleculesynonyms: { synonym: string; order: number }[];
  samples: {
    id: string;
    identifier: string | null;
    _count: { experiments: number };
  }[];
  moleculecontributors: {
    id: string;
    userid: string | null;
    contributiontype: string;
    contributedat: Date;
    user: { id: string; name: string | null; image: string | null } | null;
  }[];
  moleculetags: {
    tags: { id: string; name: string; slug: string; color: string | null };
  }[];
}

/**
 * Loads molecule scalars, synonyms, samples, contributors, and tags for
 * `moleculeId` in one `Promise.all` round.
 *
 * The molecule `findUnique` runs beside the relation reads because the id is
 * already known. Experiment totals come from `experiments.groupBy` on
 * `sampleid`, filtered to samples of this molecule, then mapped onto each
 * sample. A sample id missing from that grouping counts as 0. Samples stay
 * ordered by `id` ascending.
 *
 * @param moleculeId Molecule primary key. This function does not accept a
 * slug and does not query `moleculesynonyms` for identity.
 * @returns The detail row, or `null` when no molecule exists for
 * `moleculeId`. Does not throw for a missing row.
 */
export async function loadMoleculePublicDetailRow(
  moleculeId: string,
): Promise<MoleculePublicDetailRow | null> {
  const [molecule, synonyms, samples, experimentCounts, contributors, tags] =
    await Promise.all([
      db.molecules.findUnique({
        where: { id: moleculeId },
        select: {
          id: true,
          iupacname: true,
          smiles: true,
          inchi: true,
          chemicalformula: true,
          casnumber: true,
          pubchemcid: true,
          imageurl: true,
          favoritecount: true,
          viewcount: true,
          createdat: true,
          updatedat: true,
          createdby: true,
        },
      }),
      db.moleculesynonyms.findMany({
        where: { moleculeid: moleculeId },
        orderBy: [{ order: "asc" }, { synonym: "asc" }],
        select: { synonym: true, order: true },
      }),
      db.samples.findMany({
        where: { moleculeid: moleculeId },
        orderBy: { id: "asc" },
        select: { id: true, identifier: true },
      }),
      db.experiments.groupBy({
        by: ["sampleid"],
        where: { samples: { moleculeid: moleculeId } },
        _count: { _all: true },
      }),
      db.moleculecontributors.findMany({
        where: { moleculeid: moleculeId },
        orderBy: { contributedat: "asc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      }),
      db.moleculetags.findMany({
        where: { moleculeid: moleculeId },
        include: {
          tags: { select: { id: true, name: true, slug: true, color: true } },
        },
      }),
    ]);

  if (!molecule) {
    return null;
  }

  const experimentCountBySampleId = new Map<string, number>();
  for (const row of experimentCounts) {
    experimentCountBySampleId.set(row.sampleid, row._count._all);
  }

  return {
    id: molecule.id,
    iupacname: molecule.iupacname,
    smiles: molecule.smiles,
    inchi: molecule.inchi,
    chemicalformula: molecule.chemicalformula,
    casnumber: molecule.casnumber,
    pubchemcid: molecule.pubchemcid,
    imageurl: molecule.imageurl,
    favoritecount: molecule.favoritecount,
    viewcount: molecule.viewcount,
    createdat: molecule.createdat,
    updatedat: molecule.updatedat,
    createdby: molecule.createdby,
    moleculesynonyms: synonyms,
    samples: samples.map((sample) => {
      const identifier: string | null = sample.identifier;
      return {
        id: sample.id,
        identifier,
        _count: {
          experiments: experimentCountBySampleId.get(sample.id) ?? 0,
        },
      };
    }),
    moleculecontributors: contributors.map((row) => ({
      id: row.id,
      userid: row.userid,
      contributiontype: row.contributiontype,
      contributedat: row.contributedat,
      user: row.user
        ? { id: row.user.id, name: row.user.name, image: row.user.image }
        : null,
    })),
    moleculetags: tags.map((row) => ({
      tags: {
        id: row.tags.id,
        name: row.tags.name,
        slug: row.tags.slug,
        color: row.tags.color,
      },
    })),
  };
}
