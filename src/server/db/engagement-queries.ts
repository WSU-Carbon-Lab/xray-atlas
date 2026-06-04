import type { Prisma } from "~/prisma/client";
import type { MoleculeContributionType } from "~/lib/molecule-contribution-types";
import type { db } from "~/server/db";

type Db = typeof db | Prisma.TransactionClient;

const moleculeUserLink = (moleculeId: string, userId: string) => ({
  moleculeid: moleculeId,
  userid: userId,
});

const experimentUserLink = (experimentId: string, userId: string) => ({
  experimentid: experimentId,
  userid: userId,
});

export async function findMoleculeContributor(
  prisma: Db,
  moleculeId: string,
  userId: string,
) {
  return prisma.moleculecontributors.findFirst({
    where: moleculeUserLink(moleculeId, userId),
  });
}

/**
 * Inserts a molecule contributor row for `contributionType` when missing.
 *
 * Allows one `linked` and one `edited` row per `(molecule, user)`; repeated calls are idempotent.
 *
 * @param prisma Prisma client or transaction.
 * @param moleculeId Target molecule id.
 * @param userId Contributor ORCID user id.
 * @param contributionType Canonical role (`linked` or `edited`).
 */
export async function upsertMoleculeContributor(
  prisma: Pick<typeof db, "moleculecontributors">,
  moleculeId: string,
  userId: string,
  contributionType: MoleculeContributionType,
): Promise<void> {
  const existing = await prisma.moleculecontributors.findFirst({
    where: {
      moleculeid: moleculeId,
      userid: userId,
      contributiontype: contributionType,
    },
    select: { id: true },
  });
  if (existing) {
    return;
  }
  await prisma.moleculecontributors.create({
    data: {
      moleculeid: moleculeId,
      userid: userId,
      contributiontype: contributionType,
    },
  });
}

export async function findMoleculeFavorite(
  prisma: Db,
  moleculeId: string,
  userId: string,
) {
  return prisma.moleculefavorites.findFirst({
    where: moleculeUserLink(moleculeId, userId),
  });
}

export async function deleteMoleculeFavorite(
  prisma: Db,
  moleculeId: string,
  userId: string,
) {
  const existing = await findMoleculeFavorite(prisma, moleculeId, userId);
  if (!existing) return false;
  await prisma.moleculefavorites.delete({ where: { id: existing.id } });
  return true;
}

export async function findExperimentFavorite(
  prisma: Db,
  experimentId: string,
  userId: string,
) {
  return prisma.experimentfavorites.findFirst({
    where: experimentUserLink(experimentId, userId),
  });
}

export async function deleteExperimentFavorite(
  prisma: Db,
  experimentId: string,
  userId: string,
) {
  const existing = await findExperimentFavorite(prisma, experimentId, userId);
  if (!existing) return false;
  await prisma.experimentfavorites.delete({ where: { id: existing.id } });
  return true;
}
