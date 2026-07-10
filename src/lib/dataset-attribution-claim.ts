/**
 * Dataset attribution claim lifecycle and public display resolution for NEXAFS contributors.
 * Maps stored claim status plus target-user preferences to ORCID-only vs name vs full profile UI.
 */
import { z } from "zod";
import { APP_LINEAGE_ROLE_SLUGS } from "~/lib/app-role-lineage";

export const EXPERIMENT_CONTRIBUTOR_CLAIM_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "unclaimed",
] as const;

export type ExperimentContributorClaimStatus =
  (typeof EXPERIMENT_CONTRIBUTOR_CLAIM_STATUSES)[number];

export const AUTO_ACCEPT_MODES = ["off", "all"] as const;

export type AutoAcceptMode = (typeof AUTO_ACCEPT_MODES)[number];

export const ATTRIBUTION_DISPLAY_MODES = [
  "orcid_only",
  "name_only",
  "name_and_avatar",
] as const;

export type AttributionDisplayMode = (typeof ATTRIBUTION_DISPLAY_MODES)[number];

export const attributionDisplayModeSchema = z.enum(ATTRIBUTION_DISPLAY_MODES);

export const attributionDisplayPreferencesSchema = z.object({
  pending: attributionDisplayModeSchema,
  accepted: attributionDisplayModeSchema,
  unclaimed: attributionDisplayModeSchema,
});

export type AttributionDisplayPreferences = z.infer<
  typeof attributionDisplayPreferencesSchema
>;

export const autoAcceptModeSchema = z.enum(AUTO_ACCEPT_MODES);

export const DEFAULT_ATTRIBUTION_DISPLAY_PREFERENCES: AttributionDisplayPreferences =
  {
    pending: "orcid_only",
    accepted: "name_and_avatar",
    unclaimed: "orcid_only",
  };

const ADMIN_MAINTAINER_SLUGS = new Set<string>([
  APP_LINEAGE_ROLE_SLUGS[0],
  APP_LINEAGE_ROLE_SLUGS[1],
]);

export interface UserAttributionPreferences {
  autoAcceptMode: AutoAcceptMode;
  displayPreferences: AttributionDisplayPreferences;
}

/**
 * Session attribution preferences plus whether administrator/maintainer lineage
 * roles lock pending display to name and avatar on dataset rows.
 */
export interface UserAttributionPreferencesView extends UserAttributionPreferences {
  pendingDisplayManagedByRole: boolean;
  profilePreview: {
    orcid: string;
    name: string | null;
    image: string | null;
  };
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
  avatarPlaceholder: AttributionAvatarPlaceholder;
}

export type AttributionAvatarPlaceholder = "initials" | "person";

export interface AttributionResearcherAvatarProps {
  displayName: string;
  imageUrl: string | null;
  isAtlasProfile: boolean;
  placeholder: AttributionAvatarPlaceholder;
  isOrcidOnlyDisplay: boolean;
}

/**
 * Parses persisted JSON attribution display preferences with schema defaults on invalid input.
 */
export function parseAttributionDisplayPreferences(
  value: unknown,
): AttributionDisplayPreferences {
  const parsed = attributionDisplayPreferencesSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  return { ...DEFAULT_ATTRIBUTION_DISPLAY_PREFERENCES };
}

/**
 * Parses persisted auto-accept mode with fallback to off when unrecognized.
 */
export function parseAutoAcceptMode(value: unknown): AutoAcceptMode {
  const parsed = autoAcceptModeSchema.safeParse(value);
  return parsed.success ? parsed.data : "off";
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
 * Administrators and maintainers show name and avatar on pending attributions by default.
 */
export function defaultAttributionPreferencesForRoleSlugs(
  roleSlugs: readonly string[],
): UserAttributionPreferences {
  const pendingDisplay = userHasAdminOrMaintainerLineageRole(roleSlugs)
    ? "name_and_avatar"
    : "orcid_only";
  return {
    autoAcceptMode: "off",
    displayPreferences: {
      pending: pendingDisplay,
      accepted: "name_and_avatar",
      unclaimed: "orcid_only",
    },
  };
}

/**
 * Applies role-managed pending display lock for administrator and maintainer users.
 */
export function effectiveAttributionDisplayPreferences(
  preferences: AttributionDisplayPreferences,
  roleSlugs: readonly string[],
): AttributionDisplayPreferences {
  if (!userHasAdminOrMaintainerLineageRole(roleSlugs)) {
    return preferences;
  }
  return {
    ...preferences,
    pending: "name_and_avatar",
  };
}

function claimStatusPreferenceKey(
  claimStatus: ExperimentContributorClaimStatus,
): keyof AttributionDisplayPreferences {
  if (claimStatus === "accepted") {
    return "accepted";
  }
  if (claimStatus === "declined" || claimStatus === "unclaimed") {
    return "unclaimed";
  }
  return "pending";
}

function resolveDisplayFromMode(
  mode: AttributionDisplayMode,
  orcid: string,
  trimmedName: string | null,
  storedImageUrl: string | null,
): ResolvedAttributionPublicDisplay {
  if (mode === "orcid_only") {
    return {
      displayLabel: orcid,
      displayName: null,
      imageUrl: null,
      showProfileImage: false,
      isOrcidOnlyLabel: true,
      avatarPlaceholder: "person",
    };
  }

  if (mode === "name_only") {
    const label = trimmedName ?? orcid;
    return {
      displayLabel: label,
      displayName: trimmedName,
      imageUrl: null,
      showProfileImage: false,
      isOrcidOnlyLabel: trimmedName == null,
      avatarPlaceholder: "person",
    };
  }

  const label = trimmedName ?? orcid;
  return {
    displayLabel: label,
    displayName: trimmedName,
    imageUrl: storedImageUrl,
    showProfileImage: Boolean(storedImageUrl?.trim()),
    isOrcidOnlyLabel: trimmedName == null,
    avatarPlaceholder: "initials",
  };
}

/**
 * Maps resolved attribution display to `ResearcherAvatar` props so ORCID-only rows use a blank Person icon instead of initials.
 */
export function attributionResearcherAvatarProps(params: {
  orcid: string;
  resolved: ResolvedAttributionPublicDisplay;
}): AttributionResearcherAvatarProps {
  const orcid = params.orcid.trim();
  if (params.resolved.isOrcidOnlyLabel) {
    return {
      displayName: orcid,
      imageUrl: null,
      isAtlasProfile: false,
      placeholder: "person",
      isOrcidOnlyDisplay: true,
    };
  }
  return {
    displayName: params.resolved.displayLabel,
    imageUrl: params.resolved.showProfileImage
      ? params.resolved.imageUrl
      : null,
    isAtlasProfile: params.resolved.avatarPlaceholder === "initials",
    placeholder: params.resolved.avatarPlaceholder,
    isOrcidOnlyDisplay: false,
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
  const effectivePreferences = effectiveAttributionDisplayPreferences(
    input.targetPreferences.displayPreferences,
    input.targetRoleSlugs,
  );
  const preferenceKey = claimStatusPreferenceKey(input.claimStatus);
  const mode = effectivePreferences[preferenceKey];
  return resolveDisplayFromMode(mode, orcid, trimmedName, input.storedImageUrl);
}

/**
 * Resolves a citation / deposit creator label from claim status and the
 * attributed user's display preferences.
 *
 * When the effective preference for the claim state is `name_only` or
 * `name_and_avatar` and a profile name exists, returns that name. When the
 * preference is `orcid_only`, or the person has no Atlas profile name, returns
 * `ORCID {id}` so Zenodo can stay ORCID-labeled for users who opt out of names.
 *
 * @param input - ORCID, claim status, optional Atlas name, and preference context.
 * @returns Non-empty creator label suitable for BibTeX authors or Zenodo creators.
 */
export function resolveCitationCreatorLabelFromPreferences(input: {
  orcid: string;
  claimStatus: ExperimentContributorClaimStatus | null | undefined;
  userName?: string | null;
  displayPreferences?: AttributionDisplayPreferences | null;
  roleSlugs?: readonly string[];
}): string {
  const orcid = input.orcid.trim();
  const claimParsed = z
    .enum(EXPERIMENT_CONTRIBUTOR_CLAIM_STATUSES)
    .safeParse(input.claimStatus);
  const claimStatus: ExperimentContributorClaimStatus = claimParsed.success
    ? claimParsed.data
    : "pending";
  const displayPreferences =
    input.displayPreferences ?? DEFAULT_ATTRIBUTION_DISPLAY_PREFERENCES;
  const resolved = resolveAttributionPublicDisplay({
    orcid,
    claimStatus,
    storedDisplayName: input.userName ?? null,
    storedImageUrl: null,
    targetPreferences: {
      autoAcceptMode: "off",
      displayPreferences,
    },
    targetRoleSlugs: input.roleSlugs ?? [],
  });
  const name = resolved.displayName?.trim() ?? "";
  if (name.length > 0) {
    return name;
  }
  if (orcid.length > 0) {
    return `ORCID ${orcid}`;
  }
  return "Unknown contributor";
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

/**
 * Human-readable label for an attribution display mode chip or select option.
 */
export function attributionDisplayModeLabel(
  mode: AttributionDisplayMode,
): string {
  switch (mode) {
    case "orcid_only":
      return "ORCID only";
    case "name_only":
      return "Name only";
    case "name_and_avatar":
      return "Name and avatar";
  }
}

/**
 * Human-readable label for auto-accept mode chips and select options.
 */
export function autoAcceptModeLabel(mode: AutoAcceptMode): string {
  switch (mode) {
    case "off":
      return "Off";
    case "all":
      return "All new";
  }
}
