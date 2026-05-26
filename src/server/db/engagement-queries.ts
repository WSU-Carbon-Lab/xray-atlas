import type { Prisma } from "~/prisma/client";
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

export async function upsertMoleculeContributor(
  prisma: Pick<typeof db, "moleculecontributors">,
  moleculeId: string,
  userId: string,
  contributionType: "creator" | "editor" | "contributor",
): Promise<void> {
  const existing = await prisma.moleculecontributors.findFirst({
    where: moleculeUserLink(moleculeId, userId),
    select: { id: true },
  });
  if (existing) {
    await prisma.moleculecontributors.update({
      where: { id: existing.id },
      data: { contributiontype: contributionType },
    });
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
