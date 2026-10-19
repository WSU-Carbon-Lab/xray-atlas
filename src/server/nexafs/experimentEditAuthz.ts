import { TRPCError } from "@trpc/server";
import { isUploaderContributorRole } from "~/lib/datacite-contributor-types";
import type { PrismaClient } from "~/prisma/client";
import { hasPrivilegedRole } from "~/server/auth/privileged-role";

type ContributorEditRow = {
  orcidid: string;
  role: string;
  detachedat: Date | null;
  claimstatus: string;
};

/**
 * Single edit gate for experiment-scoped data (spectrum points, normalization, KK delta, aux files,
 * DOI, sample aux on linked samples). Admits `userId` when any of the following holds:
 * a non-detached `experiment_contributors` row for that ORCID has `claim_status` `accepted`
 * (any role); the user holds a privileged role; or the experiment has no uploader (`owner`) row
 * and `createdby` equals `userId` (legacy fallback). Pending, declined, and unclaimed rows grant
 * no edit rights. Molecule contributors carry no dataset edit rights.
 *
 * @param db Shared Prisma client.
 * @param userId Authenticated user id (bare ORCID iD), or null when unauthenticated.
 * @param experimentId Target experiment primary key.
 * @returns True when the user may edit the experiment; false for unknown experiments.
 */
export async function userMayEditExperiment(
  db: PrismaClient,
  userId: string | null,
  experimentId: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  if (await hasPrivilegedRole(db, userId)) {
    return true;
  }

  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: { createdby: true },
  });
  if (!experiment) {
    return false;
  }

  const contributors = await db.experimentcontributors.findMany({
    where: { experimentid: experimentId },
    select: {
      orcidid: true,
      role: true,
      detachedat: true,
      claimstatus: true,
    },
  });

  if (contributorMayEdit(userId, contributors)) {
    return true;
  }

  const hasUploaderRow = contributors.some((row) =>
    isUploaderContributorRole(row.role),
  );
  if (!hasUploaderRow && experiment.createdby === userId) {
    return true;
  }

  return false;
}

/**
 * Throws `FORBIDDEN` when {@link userMayEditExperiment} is false for the given experiment.
 */
export async function assertUserMayEditExperiment(
  db: PrismaClient,
  userId: string | null,
  experimentId: string,
): Promise<void> {
  const allowed = await userMayEditExperiment(db, userId, experimentId);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to edit this experiment",
    });
  }
}

/**
 * Returns whether `userId` may edit sample-scoped aux data when any experiment on the sample passes
 * {@link userMayEditExperiment}.
 */
export async function userMayEditSample(
  db: PrismaClient,
  userId: string | null,
  sampleId: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  if (await hasPrivilegedRole(db, userId)) {
    return true;
  }

  const experimentIds = await db.experiments.findMany({
    where: { sampleid: sampleId },
    select: { id: true },
  });

  for (const { id } of experimentIds) {
    if (await userMayEditExperiment(db, userId, id)) {
      return true;
    }
  }

  return false;
}

/**
 * Throws `FORBIDDEN` when {@link userMayEditSample} is false for the given sample.
 */
export async function assertUserMayEditSample(
  db: PrismaClient,
  userId: string | null,
  sampleId: string,
): Promise<void> {
  const allowed = await userMayEditSample(db, userId, sampleId);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to edit this sample",
    });
  }
}

function contributorMayEdit(
  userId: string,
  contributors: ContributorEditRow[],
): boolean {
  return contributors.some(
    (row) =>
      row.orcidid === userId &&
      row.claimstatus === "accepted" &&
      row.detachedat == null,
  );
}
