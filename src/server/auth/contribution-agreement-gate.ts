/**
 * Server-side gate for the contribution agreement.
 *
 * Owns the check that a user accepted the current `CONTRIBUTION_AGREEMENT_VERSION`
 * before a contribution write runs. Does not record acceptance (see
 * `users.acceptContributionAgreement`) and does not grandfather older versions.
 */

import { TRPCError } from "@trpc/server";
import { userHasCurrentContributionAgreement } from "~/lib/nexafs-attribution";
import type { PrismaClient } from "~/prisma/client";

/** Exact FORBIDDEN message clients match to open the re-consent flow. */
export const CONTRIBUTION_AGREEMENT_REQUIRED_MESSAGE =
  "CONTRIBUTION_AGREEMENT_REQUIRED";

/** Value of `error.data.appCode` on a rejected contribution write. */
export const CONTRIBUTION_AGREEMENT_REQUIRED_APP_CODE =
  "CONTRIBUTION_AGREEMENT_REQUIRED";

/** Cause attached to the FORBIDDEN error so the tRPC formatter can expose `appCode`. */
export class ContributionAgreementRequiredError extends Error {
  readonly appCode = CONTRIBUTION_AGREEMENT_REQUIRED_APP_CODE;

  constructor() {
    super(CONTRIBUTION_AGREEMENT_REQUIRED_MESSAGE);
    this.name = "ContributionAgreementRequiredError";
  }
}

/**
 * Throws unless the user accepted the current contribution agreement version.
 *
 * @param database - Prisma client.
 * @param userId - ORCID iD of the writing user.
 * @throws {TRPCError} FORBIDDEN with message
 * {@link CONTRIBUTION_AGREEMENT_REQUIRED_MESSAGE} when the user row is missing,
 * has not accepted, or accepted an older version.
 */
export async function assertContributionAgreement(
  database: Pick<PrismaClient, "user">,
  userId: string,
): Promise<void> {
  const user = await database.user.findUnique({
    where: { id: userId },
    select: {
      contributionAgreementAccepted: true,
      contributionAgreementVersion: true,
    },
  });
  if (!user || !userHasCurrentContributionAgreement(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: CONTRIBUTION_AGREEMENT_REQUIRED_MESSAGE,
      cause: new ContributionAgreementRequiredError(),
    });
  }
}
