/**
 * Dataset attribution claim lifecycle and public display resolution for NEXAFS contributors.
 * Maps stored claim status plus target-user preferences to ORCID-only vs name vs full profile UI.
 */
import { APP_LINEAGE_ROLE_SLUGS } from "~/lib/app-role-lineage";

export const EXPERIMENT_CONTRIBUTOR_CLAIM_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "unclaimed",
] as const;

export type ExperimentContributorClaimStatus =
  (typeof EXPERIMENT_CONTRIBUTOR_CLAIM_STATUSES)[number];

const ADMIN_MAINTAINER_SLUGS = new Set<string>([
  APP_LINEAGE_ROLE_SLUGS[0],
  APP_LINEAGE_ROLE_SLUGS[1],
]);

export interface UserAttributionPreferences {
  showNameOnPendingAttributions: boolean;
  autoAcceptAttributions: boolean;
}

export interface AttributionPublicDisplayInput {
  orcid: string;
  claimStatus: ExperimentContributorClaimStatus;
  storedDisplayName: string | null;
  storedImageUrl: string | null;
  targetPreferences: UserAttributionPreferences;
  targetRoleSlugs: readonly string[];
}

export interface ResolvedAttributionPublicDisplay {
  displayLabel: string;
  displayName: string | null;
  imageUrl: string | null;
  showProfileImage: boolean;
  isOrcidOnlyLabel: boolean;
}

/**
 * Reports whether the user holds administrator or maintainer lineage roles.
 */
export function userHasAdminOrMaintainerLineageRole(
  roleSlugs: readonly string[],
): boolean {
  return roleSlugs.some((slug) => ADMIN_MAINTAINER_SLUGS.has(slug));
}

/**
 * Resolves default attribution preferences for a new Atlas user row.
 * Administrators and maintainers show names on pending attributions by default.
 */
export function defaultAttributionPreferencesForRoleSlugs(
  roleSlugs: readonly string[],
): UserAttributionPreferences {
  const showNameOnPending = userHasAdminOrMaintainerLineageRole(roleSlugs);
  return {
    showNameOnPendingAttributions: showNameOnPending,
    autoAcceptAttributions: false,
  };
}

/**
 * Resolves browse and avatar display fields from claim status and target-user preferences.
 */
export function resolveAttributionPublicDisplay(
  input: AttributionPublicDisplayInput,
): ResolvedAttributionPublicDisplay {
  const orcid = input.orcid.trim();
  const trimmedName = input.storedDisplayName?.trim() ?? null;

  if (
    input.claimStatus === "declined" ||
    input.claimStatus === "unclaimed"
  ) {
    return {
      displayLabel: orcid,
      displayName: null,
      imageUrl: null,
      showProfileImage: false,
      isOrcidOnlyLabel: true,
    };
  }

  if (input.claimStatus === "accepted") {
    const name = trimmedName ?? orcid;
    return {
      displayLabel: name,
      displayName: trimmedName,
      imageUrl: input.storedImageUrl,
      showProfileImage: Boolean(input.storedImageUrl?.trim()),
      isOrcidOnlyLabel: trimmedName == null,
    };
  }

  const isAdminOrMaintainer = userHasAdminOrMaintainerLineageRole(
    input.targetRoleSlugs,
  );
  if (isAdminOrMaintainer) {
    const name = trimmedName ?? orcid;
    return {
      displayLabel: name,
      displayName: trimmedName,
      imageUrl: input.storedImageUrl,
      showProfileImage: Boolean(input.storedImageUrl?.trim()),
      isOrcidOnlyLabel: trimmedName == null,
    };
  }

  if (input.targetPreferences.showNameOnPendingAttributions && trimmedName) {
    return {
      displayLabel: trimmedName,
      displayName: trimmedName,
      imageUrl: null,
      showProfileImage: false,
      isOrcidOnlyLabel: false,
    };
  }

  return {
    displayLabel: orcid,
    displayName: null,
    imageUrl: null,
    showProfileImage: false,
    isOrcidOnlyLabel: true,
  };
}

/**
 * Maps claim workflow mutations to persisted contributor flags kept for legacy browse SQL.
 */
export function contributorFlagsForClaimStatus(
  claimStatus: ExperimentContributorClaimStatus,
  userId: string | null,
): {
  isclaimed: boolean;
  ispublicprofilevisible: boolean;
  userid: string | null;
  detachedat: Date | null;
  claimedat: Date | null;
} {
  const now = new Date();
  switch (claimStatus) {
    case "accepted":
      return {
        isclaimed: true,
        ispublicprofilevisible: true,
        userid: userId,
        detachedat: null,
        claimedat: now,
      };
    case "declined":
      return {
        isclaimed: false,
        ispublicprofilevisible: false,
        userid: userId,
        detachedat: null,
        claimedat: null,
      };
    case "unclaimed":
      return {
        isclaimed: false,
        ispublicprofilevisible: false,
        userid: userId,
        detachedat: now,
        claimedat: null,
      };
    case "pending":
    default:
      return {
        isclaimed: false,
        ispublicprofilevisible: false,
        userid: userId,
        detachedat: null,
        claimedat: null,
      };
  }
}

/**
 * Returns whether a contributor row counts as pending acceptance for the attributed ORCID.
 */
export function isPendingAttributionForOrcid(params: {
  orcid: string;
  sessionOrcid: string;
  claimStatus: ExperimentContributorClaimStatus;
}): boolean {
  return (
    params.orcid.trim() === params.sessionOrcid.trim() &&
    params.claimStatus === "pending"
  );
}
