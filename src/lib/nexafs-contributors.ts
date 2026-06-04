/**
 * Client-safe helpers for NEXAFS experiment contributor rows shown on browse cards and profile surfaces.
 */

import {
  contributorRoleLabel,
  type DataCiteContributorType,
  normalizeStoredContributorRole,
} from "~/lib/datacite-contributor-types";

export type { DataCiteContributorType };

/** @deprecated Use {@link DataCiteContributorType}; legacy owner/collector slugs are normalized on read. */
export type NexafsContributorRole = DataCiteContributorType;

/** Minimal contributor shape shared by browse DTOs and NEXAFS cards. */
export type NexafsContributorPerson = {
  id: string;
  userId: string | null;
  orcid: string;
  name: string | null;
  image: string | null;
  isClaimed: boolean;
  isPublicProfileVisible: boolean;
  roles: DataCiteContributorType[];
};

type ContributorInput = {
  id?: string;
  orcid: string;
  userId?: string | null;
  name?: string | null;
  image?: string | null;
  isClaimed?: boolean;
  isPublicProfileVisible?: boolean;
  roles?: DataCiteContributorType[];
  role?: string;
};

const ROLE_RANK: Record<DataCiteContributorType, number> = {
  DataCurator: 0,
  DataCollector: 1,
  ContactPerson: 2,
  Researcher: 3,
  DataManager: 4,
  Distributor: 5,
  Editor: 6,
  HostingInstitution: 7,
  Producer: 8,
  ProjectLeader: 9,
  ProjectManager: 10,
  ProjectMember: 11,
  RegistrationAgency: 12,
  RegistrationAuthority: 13,
  RelatedPerson: 14,
  ResearchGroup: 15,
  RightsHolder: 16,
  Sponsor: 17,
  Supervisor: 18,
  Translator: 19,
  WorkPackageLeader: 20,
  Other: 21,
};

function mergeRoleList(
  existing: DataCiteContributorType[],
  incoming: DataCiteContributorType[],
): DataCiteContributorType[] {
  const roles = new Set<DataCiteContributorType>([...existing, ...incoming]);
  return [...roles].sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
}

function parseRoleInput(raw: string | undefined): DataCiteContributorType[] {
  if (!raw) return [];
  const normalized = normalizeStoredContributorRole(raw);
  return normalized ? [normalized] : [];
}

function toContributorPerson(row: ContributorInput): NexafsContributorPerson {
  const orcid = row.orcid.trim();
  const roles = mergeRoleList(
    (row.roles ?? []).map((r) => normalizeStoredContributorRole(r)).filter(
      (r): r is DataCiteContributorType => r != null,
    ),
    parseRoleInput(row.role),
  );
  return {
    id: orcid,
    orcid,
    userId: row.userId ?? null,
    name: row.name ?? null,
    image: row.image ?? null,
    isClaimed: row.isClaimed ?? false,
    isPublicProfileVisible: row.isPublicProfileVisible ?? false,
    roles,
  };
}

function pickPreferredRow(
  current: NexafsContributorPerson,
  candidate: NexafsContributorPerson,
): NexafsContributorPerson {
  const roles = mergeRoleList(current.roles, candidate.roles);
  const preferCandidate =
    (candidate.isPublicProfileVisible && !current.isPublicProfileVisible) ||
    (candidate.isPublicProfileVisible === current.isPublicProfileVisible &&
      candidate.name &&
      !current.name);
  const base = preferCandidate ? candidate : current;
  const alternate = preferCandidate ? current : candidate;
  return {
    ...base,
    roles,
    userId: base.userId ?? alternate.userId,
    isClaimed: base.isClaimed || alternate.isClaimed,
    isPublicProfileVisible:
      base.isPublicProfileVisible || alternate.isPublicProfileVisible,
    name: base.name ?? alternate.name,
    image: base.image ?? alternate.image,
    id: base.orcid,
  };
}

/**
 * Collapses duplicate `experiment_contributors` rows that share an ORCID into one person record
 * for avatar stacks and browse labels while preserving all contributor types on `roles`.
 */
export function dedupeNexafsContributorsByOrcid(
  contributors: ContributorInput[],
): NexafsContributorPerson[] {
  const byOrcid = new Map<string, NexafsContributorPerson>();
  for (const row of contributors) {
    const orcid = row.orcid.trim();
    if (!orcid) continue;
    const candidate = toContributorPerson(row);
    const existing = byOrcid.get(orcid);
    if (!existing) {
      byOrcid.set(orcid, candidate);
      continue;
    }
    byOrcid.set(orcid, pickPreferredRow(existing, candidate));
  }
  return [...byOrcid.values()];
}

export { contributorRoleLabel };
