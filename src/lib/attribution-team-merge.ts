import type { DataCiteContributorType } from "~/lib/datacite-contributor-types";
import { isUploaderContributorRole } from "~/lib/datacite-contributor-types";
import {
  dedupeDatasetAttributions,
  defaultUploaderAttribution,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";

/**
 * One roster member with resolved Atlas profile metadata for attribution merge.
 */
export type AttributionTeamMemberForMerge = {
  orcid: string;
  contributorType: DataCiteContributorType;
  displayName: string | null;
  userId: string | null;
  isClaimed: boolean;
  hasContributionAgreement: boolean;
  imageUrl: string | null;
};

/**
 * Merges preset team members into existing dataset attributions without replacing unrelated rows.
 *
 * The session uploader is always credited as {@link DataCiteContributorType} `DataCurator`.
 * When the uploader appears on the team roster, their team role is upgraded to `DataCurator`.
 * When the uploader is absent from the team, they are appended as `DataCurator`.
 * Non-uploader team rows with `DataCurator` are skipped so only one curator remains.
 */
export function mergeTeamMembersIntoDatasetAttributions(params: {
  currentAttributions: DatasetAttributionEntry[];
  teamMembers: AttributionTeamMemberForMerge[];
  uploaderOrcid: string;
  uploaderDisplayName: string | null;
  uploaderImageUrl: string | null;
  uploaderHasContributionAgreement: boolean;
}): DatasetAttributionEntry[] {
  const uploaderOrcid = params.uploaderOrcid.trim();
  const teamEntries = teamMembersToAttributionEntries({
    teamMembers: params.teamMembers,
    uploaderOrcid,
  });

  const merged = dedupeDatasetAttributions([
    ...params.currentAttributions,
    ...teamEntries,
  ]);

  const uploaderHasCuratorRole = merged.some(
    (row) =>
      row.orcid.trim() === uploaderOrcid &&
      isUploaderContributorRole(row.role),
  );

  if (!uploaderHasCuratorRole) {
    return dedupeDatasetAttributions([
      ...merged,
      defaultUploaderAttribution({
        orcid: uploaderOrcid,
        displayName: params.uploaderDisplayName,
        imageUrl: params.uploaderImageUrl,
        hasContributionAgreement: params.uploaderHasContributionAgreement,
      }),
    ]);
  }

  return merged;
}

function teamMembersToAttributionEntries(params: {
  teamMembers: AttributionTeamMemberForMerge[];
  uploaderOrcid: string;
}): DatasetAttributionEntry[] {
  const entries: DatasetAttributionEntry[] = [];

  for (const member of params.teamMembers) {
    const orcid = member.orcid.trim();
    if (orcid.length === 0) continue;

    if (orcid === params.uploaderOrcid) {
      entries.push(teamMemberToEntry(member, "DataCurator"));
      continue;
    }

    if (member.contributorType === "DataCurator") {
      continue;
    }

    entries.push(teamMemberToEntry(member, member.contributorType));
  }

  return entries;
}

function teamMemberToEntry(
  member: AttributionTeamMemberForMerge,
  role: DataCiteContributorType,
): DatasetAttributionEntry {
  const orcid = member.orcid.trim();
  return {
    clientId: crypto.randomUUID(),
    orcid,
    role,
    displayName: member.displayName,
    userId: member.isClaimed ? (member.userId ?? orcid) : null,
    isClaimed: member.isClaimed,
    hasContributionAgreement: member.hasContributionAgreement,
    imageUrl: member.imageUrl,
  };
}
