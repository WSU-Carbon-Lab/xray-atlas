/**
 * Canonical molecule contributor roles stored in `molecule_contributors.contribution_type`.
 *
 * Each user may have at most one row per role per molecule (`linked` and `edited` independently).
 * Legacy values (`creator`, `editor`, `contributor`) are normalized on read only.
 */
export const MOLECULE_CONTRIBUTION_TYPES = ["linked", "edited"] as const;

export type MoleculeContributionType =
  (typeof MOLECULE_CONTRIBUTION_TYPES)[number];

const LEGACY_LINKED = new Set(["creator", "contributor", "linked"]);
const LEGACY_EDITED = new Set(["editor", "edited"]);

/**
 * Maps a stored or legacy `contribution_type` string to a canonical molecule contribution role.
 *
 * @param raw Value from the database or API input before validation.
 * @returns `linked`, `edited`, or null when the value is unrecognized.
 */
export function normalizeMoleculeContributionType(
  raw: string,
): MoleculeContributionType | null {
  const lower = raw.trim().toLowerCase();
  if (LEGACY_EDITED.has(lower)) {
    return "edited";
  }
  if (LEGACY_LINKED.has(lower)) {
    return "linked";
  }
  return null;
}

/**
 * Returns prescriptive reader-facing copy for a molecule contribution role.
 *
 * @param type Canonical contribution role.
 */
export function moleculeContributionTypeLabel(
  type: MoleculeContributionType,
): string {
  switch (type) {
    case "linked":
      return "Linked molecule to X-ray Atlas";
    case "edited":
      return "Edited molecule";
  }
}

/**
 * Derives profile contribution badges for a user on a molecule from owner metadata and stored rows.
 *
 * @param args.userId Profile ORCID user id being summarized.
 * @param args.createdby Molecule `createdby` owner id, when set.
 * @param args.contributorTypes Raw `contribution_type` values for rows belonging to `userId`.
 * @returns Ordered subset of `linked` and/or `edited` applicable to the profile user.
 */
export function profileMoleculeContributionsFromRows(args: {
  userId: string;
  createdby: string | null;
  contributorTypes: string[];
}): MoleculeContributionType[] {
  const roles = new Set<MoleculeContributionType>();
  for (const raw of args.contributorTypes) {
    const normalized = normalizeMoleculeContributionType(raw);
    if (normalized) {
      roles.add(normalized);
    }
  }
  if (args.createdby === args.userId) {
    roles.add("linked");
  }
  return MOLECULE_CONTRIBUTION_TYPES.filter((role) => roles.has(role));
}

/**
 * Groups contributor rows by user and attaches prescriptive role labels for display.
 *
 * @param rows Molecule view contributor rows (may include legacy `contributionType` values).
 * @returns One entry per distinct user with deduplicated labels in canonical order.
 */
export function moleculeContributorAttributionRows(
  rows: ReadonlyArray<{
    contributionType: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      orcid?: string | null;
    } | null;
  }>,
): Array<{
  user: {
    id: string;
    name: string | null;
    image: string | null;
    orcid?: string | null;
  };
  labels: string[];
}> {
  const byUserId = new Map<
    string,
    {
      user: NonNullable<(typeof rows)[number]["user"]>;
      roles: Set<MoleculeContributionType>;
    }
  >();

  for (const row of rows) {
    if (!row.user) continue;
    const normalized = normalizeMoleculeContributionType(row.contributionType);
    if (!normalized) continue;
    const existing = byUserId.get(row.user.id);
    if (existing) {
      existing.roles.add(normalized);
      continue;
    }
    byUserId.set(row.user.id, {
      user: row.user,
      roles: new Set([normalized]),
    });
  }

  return [...byUserId.values()].map(({ user, roles }) => ({
    user,
    labels: MOLECULE_CONTRIBUTION_TYPES.filter((role) => roles.has(role)).map(
      moleculeContributionTypeLabel,
    ),
  }));
}
