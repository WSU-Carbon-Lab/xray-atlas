import {
  contributorRoleLabel,
  type DataCiteContributorType,
} from "~/lib/datacite-contributor-types";
import { moleculeContributorAttributionRows } from "~/lib/molecule-contribution-types";
import {
  dedupeNexafsContributorsByOrcid,
  type NexafsContributorPerson,
} from "~/lib/nexafs-contributors";
import type { ResearcherAttributionBadgeStatus } from "~/lib/nexafs-attribution";
import {
  normalizeProfileImageUrl,
  type UserWithOrcid,
} from "~/components/ui/avatar";
import type { MoleculeView } from "~/types/molecule";

function moleculeContributorToAvatarUser(
  user: {
    id: string;
    name: string | null;
    image: string | null;
    orcid?: string | null;
  },
  labels: string[],
): UserWithOrcid {
  return {
    id: user.id,
    orcid: user.orcid ?? user.id,
    name: user.name,
    image: normalizeProfileImageUrl(user.image),
    isAtlasProfile: true,
    avatarPlaceholder: "initials",
    tooltipSubtitle: labels.join("; "),
    hoverRoleLabel: labels.join("; "),
  };
}

/**
 * Joins DataCite contributor role codes into a single reader-facing subtitle.
 */
export function contributorRoleLabelsForDisplay(
  roles: ReadonlyArray<DataCiteContributorType>,
): string {
  return roles.map((role) => contributorRoleLabel(role)).join(", ");
}

/**
 * Maps deduped NEXAFS experiment contributors to stacked-avatar user rows for browse cards.
 */
export function nexafsContributorAvatarUsers(
  contributors: Parameters<typeof dedupeNexafsContributorsByOrcid>[0],
): UserWithOrcid[] {
  return dedupeNexafsContributorsByOrcid(contributors).map((contributor) =>
    nexafsPersonToAvatarUser(contributor),
  );
}

function nexafsPersonToAvatarUser(
  contributor: NexafsContributorPerson,
): UserWithOrcid {
  const roleSubtitle = contributorRoleLabelsForDisplay(contributor.roles);
  if (contributor.isPublicProfileVisible) {
    return {
      id: contributor.orcid,
      orcid: contributor.orcid,
      name: contributor.name,
      image: contributor.image,
      isAtlasProfile: true,
      tooltipSubtitle: roleSubtitle,
      hoverRoleLabel: roleSubtitle,
    };
  }
  const badgeStatus: ResearcherAttributionBadgeStatus = contributor.isClaimed
    ? "pending_agreement"
    : "unclaimed";
  return {
    id: contributor.orcid,
    orcid: contributor.orcid,
    name: contributor.orcid,
    image: null,
    isAtlasProfile: false,
    avatarPlaceholder: "person",
    tooltipSubtitle: contributor.isClaimed
      ? "ORCID-only attribution"
      : "Unclaimed on Atlas",
    attributionBadgeStatus: badgeStatus,
    hoverRoleLabel: roleSubtitle,
  };
}

/**
 * Maps molecule contributor rows (or legacy `createdBy`) to stacked-avatar user rows for browse cards.
 */
export function moleculeContributorAvatarUsers(
  molecule: Pick<MoleculeView, "contributors" | "createdBy">,
): UserWithOrcid[] {
  const rows = moleculeContributorAttributionRows(molecule.contributors ?? []);
  if (rows.length > 0) {
    return rows.map(({ user, labels }) =>
      moleculeContributorToAvatarUser(user, labels),
    );
  }
  if (molecule.createdBy) {
    return [
      moleculeContributorToAvatarUser(molecule.createdBy, [
        "Linked molecule to X-ray Atlas",
      ]),
    ];
  }
  return [];
}
