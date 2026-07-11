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

export type DataCiteContributorType =
  (typeof DATACITE_CONTRIBUTOR_TYPES)[number];

export const dataCiteContributorTypeSchema = z.enum(DATACITE_CONTRIBUTOR_TYPES);

const LEGACY_OWNER_ROLE = "owner";
const LEGACY_COLLECTOR_ROLE = "collector";

/**
 * Picker sections for attribution role Select/ListBox UIs.
 *
 * - **primary**: Required-at-upload or beamtime/PI roles contributors pick most often.
 * - **common**: Other institution, project, or contact roles used occasionally.
 * - **extended**: Full DataCite 4.7 set for advanced export metadata (rarely needed in-app).
 */
export type ContributorRolePickerTier = "primary" | "common" | "extended";

/** Display order for tier sections in role pickers. */
export const CONTRIBUTOR_ROLE_PICKER_TIER_ORDER: readonly ContributorRolePickerTier[] =
  ["primary", "common", "extended"] as const;

/** Section headings shown above each tier in the contribute attribution role list. */
export const CONTRIBUTOR_ROLE_TIER_SECTION_LABELS: Record<
  ContributorRolePickerTier,
  string
> = {
  primary: "Recommended",
  common: "Other roles",
  extended: "Advanced DataCite types",
};

export type ContributorRoleOption = {
  contributorType: DataCiteContributorType;
  label: string;
  description: string;
  tier: ContributorRolePickerTier;
  /** Short qualifier shown beside the label (for example PI wording). */
  subtitle?: string;
};

const CONTRIBUTOR_TYPE_DEFINITIONS: Record<
  DataCiteContributorType,
  {
    label: string;
    description: string;
    tier: ContributorRolePickerTier;
    subtitle?: string;
  }
> = {
  ContactPerson: {
    label: "Contact person",
    description:
      "Point of contact for questions about this dataset or submission.",
    tier: "common",
  },
  DataCollector: {
    label: "Data collector",
    description:
      "Measured or recorded the spectra during beamtime (beamline operator, student, or collaborator).",
    tier: "primary",
  },
  DataCurator: {
    label: "Data curator (uploader)",
    description:
      "Uploaded or maintains this dataset in X-ray Atlas. Only one curator per dataset.",
    tier: "primary",
  },
  DataManager: {
    label: "Data manager",
    description:
      "Manages storage, versioning, or lifecycle of the dataset files.",
    tier: "common",
  },
  Distributor: {
    label: "Distributor",
    description:
      "Makes the resource available to the community (repository or portal).",
    tier: "extended",
  },
  Editor: {
    label: "Editor",
    description: "Compiled or edited descriptive metadata about the resource.",
    tier: "extended",
  },
  HostingInstitution: {
    label: "Hosting institution",
    description:
      "Facility or institution that hosts, archives, or operates the data service.",
    tier: "common",
  },
  Producer: {
    label: "Producer",
    description:
      "Organization or person that produced the underlying measurement campaign.",
    tier: "common",
  },
  ProjectLeader: {
    label: "Lead experimenter",
    description:
      "Lead scientist responsible for experiment design, execution, or interpretation.",
    tier: "primary",
  },
  ProjectManager: {
    label: "Project manager",
    description:
      "Coordinates logistics, reporting, or delivery for the project.",
    tier: "common",
  },
  ProjectMember: {
    label: "Project member",
    description: "Member of the research team beyond collector or PI roles.",
    tier: "common",
  },
  RegistrationAgency: {
    label: "Registration agency",
    description: "Agency that registered the DOI or persistent identifier.",
    tier: "extended",
  },
  RegistrationAuthority: {
    label: "Registration authority",
    description: "Authority that registered the DOI or persistent identifier.",
    tier: "extended",
  },
  RelatedPerson: {
    label: "Related person",
    description:
      "Person with another relationship not covered by a specific type.",
    tier: "extended",
  },
  Researcher: {
    label: "Researcher",
    subtitle: "Co-investigator",
    description:
      "Contributed intellectually to the experiment, sample, or spectral interpretation.",
    tier: "primary",
  },
  ResearchGroup: {
    label: "Research group",
    description: "Named lab or group credited collectively on the resource.",
    tier: "common",
  },
  RightsHolder: {
    label: "Rights holder",
    description: "Entity holding legal or usage rights over the resource.",
    tier: "extended",
  },
  Sponsor: {
    label: "Sponsor",
    description: "Funding agency or sponsor organization for the work.",
    tier: "common",
  },
  Supervisor: {
    label: "Supervisor",
    description:
      "Supervisor accountable for the beamtime, project, or group that funded the work.",
    tier: "primary",
  },
  Translator: {
    label: "Translator",
    description:
      "Translated descriptive text or documentation for the resource.",
    tier: "extended",
  },
  WorkPackageLeader: {
    label: "Work package leader",
    description: "Leads a work package within a larger collaborative program.",
    tier: "common",
  },
  Other: {
    label: "Other",
    description:
      "Contributor role not covered elsewhere; use only when no DataCite type fits.",
    tier: "extended",
  },
};

export type ContributorRoleOptionsByTier<T extends ContributorRoleOption> = {
  tier: ContributorRolePickerTier;
  sectionLabel: string;
  options: T[];
};

/**
 * Partitions role options into ordered picker sections (primary, common, extended).
 */
export function groupContributorRoleOptionsByTier<
  T extends ContributorRoleOption,
>(options: readonly T[]): ContributorRoleOptionsByTier<T>[] {
  return CONTRIBUTOR_ROLE_PICKER_TIER_ORDER.map((tier) => ({
    tier,
    sectionLabel: CONTRIBUTOR_ROLE_TIER_SECTION_LABELS[tier],
    options: options.filter((option) => option.tier === tier),
  })).filter((section) => section.options.length > 0);
}

/**
 * Returns all DataCite contributor types with UI labels, descriptions, and picker tiers.
 */
export function listDataCiteContributorRoleOptions(): ContributorRoleOption[] {
  return DATACITE_CONTRIBUTOR_TYPES.map((contributorType) => {
    const meta = CONTRIBUTOR_TYPE_DEFINITIONS[contributorType];
    return {
      contributorType,
      label: meta.label,
      description: meta.description,
      tier: meta.tier,
      ...(meta.subtitle ? { subtitle: meta.subtitle } : {}),
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
 * Citation / Zenodo author sort key for one person's contributor roles.
 *
 * Order contract:
 * 1. Lead experimentalist (`ProjectLeader`) first
 * 2. Curator / uploader (`DataCurator`) second
 * 3. Other roles in a middle band
 * 4. PI / supervisor (`Supervisor`) always last
 *
 * @param roles - Raw or DataCite role strings for one person.
 * @returns Ascending sort key (lower sorts earlier).
 */
export function contributorCitationSortKey(roles: readonly string[]): number {
  const normalized = roles
    .map((role) => normalizeStoredContributorRole(role))
    .filter((role): role is DataCiteContributorType => role != null);

  if (normalized.includes("Supervisor")) {
    return 1_000_000;
  }
  if (normalized.includes("ProjectLeader")) {
    return 0;
  }
  if (normalized.includes("DataCurator")) {
    return 1;
  }
  if (normalized.includes("DataCollector")) {
    return 2;
  }
  if (normalized.includes("Researcher")) {
    return 3;
  }
  return 50;
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
