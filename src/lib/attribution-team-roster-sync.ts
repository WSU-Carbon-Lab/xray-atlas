import type { DataCiteContributorType } from "~/lib/datacite-contributor-types";

/**
 * Draft roster row used when composing team membership before persistence.
 */
export type AttributionTeamMemberDraft = {
  orcid: string;
  contributorType: DataCiteContributorType;
  displayName: string | null;
};

/** Mutually exclusive team purpose labels stored on `attribution_team.group_type`. */
export const ATTRIBUTION_TEAM_GROUP_TYPES = ["beamtime", "working"] as const;

/** Beamtime vs working group classification for saved attribution teams. */
export type AttributionTeamGroupType = (typeof ATTRIBUTION_TEAM_GROUP_TYPES)[number];

/** DataCite types reserved for the PI dedicated slot (legacy teams may still store `ProjectLeader`). */
const PI_SLOT_CONTRIBUTOR_TYPES = ["Supervisor", "ProjectLeader"] as const;

/** DataCite types reserved for the experiment-lead slot (legacy teams may still store `Researcher`). */
const EXPERIMENT_LEAD_SLOT_CONTRIBUTOR_TYPES = [
  "ProjectLeader",
  "Researcher",
] as const;

function isPiSlotContributorType(
  contributorType: DataCiteContributorType,
): boolean {
  return (PI_SLOT_CONTRIBUTOR_TYPES as readonly string[]).includes(
    contributorType,
  );
}

function isExperimentLeadSlotContributorType(
  contributorType: DataCiteContributorType,
): boolean {
  return (EXPERIMENT_LEAD_SLOT_CONTRIBUTOR_TYPES as readonly string[]).includes(
    contributorType,
  );
}

/**
 * Builds a deduped roster from general members plus PI and experiment-lead slot assignments.
 *
 * The PI slot exclusively owns `Supervisor` (at most one per team). Legacy rosters may still
 * list `ProjectLeader` on the PI ORCID until the team is saved again. The experiment-lead slot
 * exclusively owns `ProjectLeader` for the designated ORCID; legacy rosters may still list
 * `Researcher` on that ORCID until the team is saved again.
 */
export function buildAttributionTeamRosterFromSlots(params: {
  members: AttributionTeamMemberDraft[];
  piOrcid: string | null;
  experimentLeadOrcid: string | null;
}): AttributionTeamMemberDraft[] {
  const piOrcid = normalizeOrcid(params.piOrcid);
  const experimentLeadOrcid = normalizeOrcid(params.experimentLeadOrcid);
  const displayNameByOrcid = new Map<string, string | null>();

  for (const member of params.members) {
    const orcid = normalizeOrcid(member.orcid);
    if (!orcid) continue;
    if (!displayNameByOrcid.has(orcid)) {
      displayNameByOrcid.set(orcid, member.displayName);
    }
  }

  const withoutSlotRoles = params.members
    .map((member) => ({
      ...member,
      orcid: normalizeOrcid(member.orcid),
    }))
    .filter((member) => member.orcid.length > 0)
    .filter((member) => !isPiSlotContributorType(member.contributorType))
    .filter((member) => {
      if (!experimentLeadOrcid) return true;
      if (member.orcid !== experimentLeadOrcid) return true;
      return !isExperimentLeadSlotContributorType(member.contributorType);
    });

  const roster = dedupeMemberDrafts(withoutSlotRoles);

  if (piOrcid) {
    roster.push({
      orcid: piOrcid,
      contributorType: "Supervisor",
      displayName: displayNameByOrcid.get(piOrcid) ?? null,
    });
  }

  if (experimentLeadOrcid) {
    roster.push({
      orcid: experimentLeadOrcid,
      contributorType: "ProjectLeader",
      displayName: displayNameByOrcid.get(experimentLeadOrcid) ?? null,
    });
  }

  return dedupeMemberDrafts(roster);
}

/**
 * Returns roster rows suitable for the general-members editor (excludes slot-owned roles).
 */
export function filterGeneralTeamMembersForEditor(params: {
  members: AttributionTeamMemberDraft[];
  piOrcid: string | null;
  experimentLeadOrcid: string | null;
}): AttributionTeamMemberDraft[] {
  const piOrcid = normalizeOrcid(params.piOrcid);
  const experimentLeadOrcid = normalizeOrcid(params.experimentLeadOrcid);

  return params.members.filter((member) => {
    const orcid = normalizeOrcid(member.orcid);
    if (isPiSlotContributorType(member.contributorType) && orcid === piOrcid) {
      return false;
    }
    if (
      isExperimentLeadSlotContributorType(member.contributorType) &&
      orcid === experimentLeadOrcid
    ) {
      return false;
    }
    return true;
  });
}

function normalizeOrcid(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function dedupeMemberDrafts(
  members: AttributionTeamMemberDraft[],
): AttributionTeamMemberDraft[] {
  const byKey = new Map<string, AttributionTeamMemberDraft>();
  for (const member of members) {
    const orcid = normalizeOrcid(member.orcid);
    if (!orcid) continue;
    const key = `${orcid}:${member.contributorType}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...member, orcid });
      continue;
    }
    byKey.set(key, {
      ...existing,
      displayName: existing.displayName ?? member.displayName,
    });
  }
  return [...byKey.values()];
}
