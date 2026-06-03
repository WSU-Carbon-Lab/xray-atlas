import { z } from "zod";

/**
 * DataCite metadata schema 4.7 `contributorType` controlled values (PascalCase).
 * @see https://datacite-metadata-schema.readthedocs.io/en/4.7/properties/contributor/#a-contributortype
 */
export const DATACITE_CONTRIBUTOR_TYPES = [
  "ContactPerson",
  "DataCollector",
  "DataCurator",
  "DataManager",
  "Distributor",
  "Editor",
  "HostingInstitution",
  "Producer",
  "ProjectLeader",
  "ProjectManager",
  "ProjectMember",
  "RegistrationAgency",
  "RegistrationAuthority",
  "RelatedPerson",
  "Researcher",
  "ResearchGroup",
  "RightsHolder",
  "Sponsor",
  "Supervisor",
  "Translator",
  "WorkPackageLeader",
  "Other",
] as const;

export type DataCiteContributorType = (typeof DATACITE_CONTRIBUTOR_TYPES)[number];

export const dataCiteContributorTypeSchema = z.enum(DATACITE_CONTRIBUTOR_TYPES);

const LEGACY_OWNER_ROLE = "owner";
const LEGACY_COLLECTOR_ROLE = "collector";


export type ContributorRoleOption = {
  contributorType: DataCiteContributorType;
  label: string;
  description: string;
  group: "common" | "all";
};

const CONTRIBUTOR_TYPE_DEFINITIONS: Record<
  DataCiteContributorType,
  { label: string; description: string; group: "common" | "all" }
> = {
  ContactPerson: {
    label: "Contact person",
    description: "Primary contact for questions about the resource.",
    group: "all",
  },
  DataCollector: {
    label: "Data collector",
    description: "Person or institution that collected the measurements.",
    group: "common",
  },
  DataCurator: {
    label: "Data curator (uploader)",
    description: "Person who uploaded or curates this dataset in Atlas.",
    group: "common",
  },
  DataManager: {
    label: "Data manager",
    description: "Person or group managing data storage and lifecycle.",
    group: "all",
  },
  Distributor: {
    label: "Distributor",
    description: "Entity that makes the resource available to the community.",
    group: "all",
  },
  Editor: {
    label: "Editor",
    description: "Person who compiled or edited the resource.",
    group: "all",
  },
  HostingInstitution: {
    label: "Hosting institution",
    description: "Institution hosting, archiving, or operating the resource.",
    group: "all",
  },
  Producer: {
    label: "Producer",
    description: "Person or institution responsible for production.",
    group: "all",
  },
  ProjectLeader: {
    label: "Project leader",
    description: "Leader of the project that produced the resource.",
    group: "all",
  },
  ProjectManager: {
    label: "Project manager",
    description: "Manager of the project that produced the resource.",
    group: "all",
  },
  ProjectMember: {
    label: "Project member",
    description: "Member of the project that produced the resource.",
    group: "all",
  },
  RegistrationAgency: {
    label: "Registration agency",
    description: "Agency that registered the DOI or identifier.",
    group: "all",
  },
  RegistrationAuthority: {
    label: "Registration authority",
    description: "Authority that registered the DOI or identifier.",
    group: "all",
  },
  RelatedPerson: {
    label: "Related person",
    description: "Person with another relationship to the resource.",
    group: "all",
  },
  Researcher: {
    label: "Researcher",
    description: "Scientist who contributed intellectually to the work.",
    group: "common",
  },
  ResearchGroup: {
    label: "Research group",
    description: "Group that contributed to the resource.",
    group: "all",
  },
  RightsHolder: {
    label: "Rights holder",
    description: "Entity holding rights over the resource.",
    group: "all",
  },
  Sponsor: {
    label: "Sponsor",
    description: "Organization that funded or sponsored the work.",
    group: "all",
  },
  Supervisor: {
    label: "Supervisor",
    description: "Supervisor of the work that produced the resource.",
    group: "all",
  },
  Translator: {
    label: "Translator",
    description: "Person who translated the resource.",
    group: "all",
  },
  WorkPackageLeader: {
    label: "Work package leader",
    description: "Leader of a work package within a larger project.",
    group: "all",
  },
  Other: {
    label: "Other",
    description: "Contributor role not covered by another type.",
    group: "all",
  },
};

/**
 * Returns all DataCite contributor types with UI labels and short descriptions.
 */
export function listDataCiteContributorRoleOptions(): ContributorRoleOption[] {
  return DATACITE_CONTRIBUTOR_TYPES.map((contributorType) => {
    const meta = CONTRIBUTOR_TYPE_DEFINITIONS[contributorType];
    return {
      contributorType,
      label: meta.label,
      description: meta.description,
      group: meta.group,
    };
  });
}

/**
 * Maps a stored `experiment_contributors.role` value to a DataCite contributorType.
 */
export function normalizeStoredContributorRole(
  raw: string,
): DataCiteContributorType | null {
  const trimmed = raw.trim();
  if (trimmed === LEGACY_OWNER_ROLE) {
    return "DataCurator";
  }
  if (trimmed === LEGACY_COLLECTOR_ROLE) {
    return "DataCollector";
  }
  const parsed = dataCiteContributorTypeSchema.safeParse(trimmed);
  return parsed.success ? parsed.data : null;
}

/**
 * Returns whether `role` represents the dataset uploader (DataCurator or legacy owner).
 */
export function isUploaderContributorRole(role: string): boolean {
  const normalized = normalizeStoredContributorRole(role);
  return normalized === "DataCurator";
}

/**
 * Returns whether `role` represents beamtime data collection (DataCollector or legacy collector).
 */
export function isCollectorContributorRole(role: string): boolean {
  const normalized = normalizeStoredContributorRole(role);
  return normalized === "DataCollector";
}

/**
 * Returns a reader-facing label for a stored or DataCite contributor role.
 */
export function contributorRoleLabel(role: string): string {
  const normalized = normalizeStoredContributorRole(role);
  if (normalized) {
    return CONTRIBUTOR_TYPE_DEFINITIONS[normalized].label;
  }
  return role;
}

/**
 * Coerces API or legacy role input to a DataCite contributorType for persistence.
 */
export function coerceContributorRoleInput(
  role: string,
): DataCiteContributorType | null {
  return normalizeStoredContributorRole(role);
}

/**
 * Returns legacy slug for profile stats when only owner/collector semantics apply.
 */
export function legacyProfileContributionSlug(
  role: string,
): "creator" | "collector" | null {
  const normalized = normalizeStoredContributorRole(role);
  if (normalized === "DataCurator") return "creator";
  if (normalized === "DataCollector") return "collector";
  return null;
}
