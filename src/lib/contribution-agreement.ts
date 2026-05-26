/** Canonical contribution agreement version persisted on accept and in consent receipts. */
export const CONTRIBUTION_AGREEMENT_VERSION = "2026-05-01" as const;

export type ContributionAgreementVersion =
  typeof CONTRIBUTION_AGREEMENT_VERSION;
