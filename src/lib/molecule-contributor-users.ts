import type { MoleculeViewContributor } from "~/types/molecule";

type ContributorUser = NonNullable<MoleculeViewContributor["user"]>;

/**
 * Returns distinct Atlas users from molecule contributor rows, preserving first-seen order.
 *
 * @param contributors Molecule view contributor rows (may include multiple roles per user).
 */
export function moleculeContributorUsers(
  contributors: MoleculeViewContributor[] | undefined,
): ContributorUser[] {
  const seen = new Set<string>();
  const users: ContributorUser[] = [];
  for (const contributor of contributors ?? []) {
    const user = contributor.user;
    if (!user || seen.has(user.id)) continue;
    seen.add(user.id);
    users.push(user);
  }
  return users;
}
