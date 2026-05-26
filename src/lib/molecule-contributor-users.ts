import type { MoleculeViewContributor } from "~/types/molecule";

type ContributorUser = NonNullable<MoleculeViewContributor["user"]>;

export function moleculeContributorUsers(
  contributors: MoleculeViewContributor[] | undefined,
): ContributorUser[] {
  return (contributors ?? [])
    .map((contributor) => contributor.user)
    .filter((user): user is ContributorUser => user != null);
}
