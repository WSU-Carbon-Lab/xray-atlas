import { CONTRIBUTION_AGREEMENT_VERSION } from "~/lib/contribution-agreement";
import {
  coerceContributorRoleInput,
  contributorRoleLabel,
  dataCiteContributorTypeSchema,
  isCollectorContributorRole,
  isUploaderContributorRole,
  groupContributorRoleOptionsByTier,
  listDataCiteContributorRoleOptions,
  type ContributorRoleOption,
  type ContributorRolePickerTier,
  type DataCiteContributorType,
} from "~/lib/datacite-contributor-types";
import {
  dedupeNexafsContributorsByOrcid,
  type DataCiteContributorType as ContributorType,
} from "~/lib/nexafs-contributors";
import { isValidOrcidUserId } from "~/lib/orcid";

export type {
  ContributorRoleOption,
  ContributorRolePickerTier,
  DataCiteContributorType,
};

export { groupContributorRoleOptionsByTier };

/**
 * CSS selector for portaled HeroUI overlays nested inside attribution popover menus.
 * Pass to `PopoverMenu.ignoreOutsidePointerDownSelector` so ComboBox/Select clicks do not dismiss the parent menu.
 */
export const ATTRIBUTION_NESTED_OVERLAY_SELECTOR =
  "[data-attribution-nested-overlay]";

export type ResearcherAttributionBadgeStatus =
  | "unclaimed"
  | "pending_agreement"
  | "agreed";

export type DataCiteRequiredRoleSlug =
  | "uploaded_by"
  | "collected_by"
  | "processed_by";

export type DatasetAttributionEntry = {
  clientId: string;
  orcid: string;
  role: DataCiteContributorType;
  displayName: string | null;
  userId: string | null;
  isClaimed: boolean;
  hasContributionAgreement: boolean;
  imageUrl: string | null;
};

export type AttributionRoleOption = ContributorRoleOption & {
  requiredRoleSlug?: DataCiteRequiredRoleSlug;
  requiredAtUpload?: boolean;
};

/**
 * Returns selectable attribution roles with DataCite labels for the contribute UI.
 */
export function listAttributionRoleOptions(): AttributionRoleOption[] {
  return listDataCiteContributorRoleOptions().map((option) => {
    const extra: Pick<
      AttributionRoleOption,
      "requiredRoleSlug" | "requiredAtUpload"
    > =
      option.contributorType === "DataCurator"
        ? { requiredRoleSlug: "uploaded_by", requiredAtUpload: true }
        : option.contributorType === "DataCollector"
          ? { requiredRoleSlug: "collected_by", requiredAtUpload: false }
          : {};
    return { ...option, ...extra };
  });
}

/**
 * Builds the default uploader attribution row for a signed-in contributor.
 */
export function defaultUploaderAttribution(params: {
  orcid: string;
  displayName: string | null;
  imageUrl?: string | null;
  hasContributionAgreement?: boolean;
}): DatasetAttributionEntry {
  return {
    clientId: crypto.randomUUID(),
    orcid: params.orcid,
    role: "DataCurator",
    displayName: params.displayName,
    userId: params.orcid,
    isClaimed: true,
    hasContributionAgreement: params.hasContributionAgreement ?? false,
    imageUrl: params.imageUrl?.trim() ?? null,
  };
}

/**
 * Collapses duplicate `(orcid, role)` pairs while preserving the first display metadata.
 */
export function dedupeDatasetAttributions(
  rows: DatasetAttributionEntry[],
): DatasetAttributionEntry[] {
  const byKey = new Map<string, DatasetAttributionEntry>();
  for (const row of rows) {
    const orcid = row.orcid.trim();
    if (!orcid || !isValidOrcidUserId(orcid)) continue;
    const role =
      coerceContributorRoleInput(row.role) ??
      dataCiteContributorTypeSchema.parse(row.role);
    const key = `${orcid}:${role}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...row, orcid, role });
      continue;
    }
    byKey.set(key, {
      ...existing,
      displayName: existing.displayName ?? row.displayName,
      userId: existing.userId ?? row.userId,
      isClaimed: existing.isClaimed || row.isClaimed,
      hasContributionAgreement:
        existing.hasContributionAgreement || row.hasContributionAgreement,
      imageUrl: existing.imageUrl ?? row.imageUrl,
    });
  }
  return [...byKey.values()];
}

/**
 * Drops attribution rows whose `orcid` is not a valid bare ORCID iD (including legacy user UUIDs).
 */
export function filterValidOrcidAttributions(
  rows: DatasetAttributionEntry[],
): DatasetAttributionEntry[] {
  return rows
    .filter((row) => isValidOrcidUserId(row.orcid))
    .map((row) => {
      const role = coerceContributorRoleInput(row.role);
      if (!role) return null;
      return { ...row, role };
    })
    .filter((row): row is DatasetAttributionEntry => row != null);
}

/**
 * Lists collector ORCIDs from valid attribution rows for optional `collected_by_user_ids` sync.
 */
export function collectorOrcidsFromAttributions(
  rows: DatasetAttributionEntry[],
): string[] {
  return [
    ...new Set(
      filterValidOrcidAttributions(rows)
        .filter((row) => isCollectorContributorRole(row.role))
        .map((row) => row.orcid.trim()),
    ),
  ];
}

export type AttributionAvatarDisplay = {
  orcid: string;
  profileUserId: string;
  displayName: string;
  image: string | null;
  isClaimed: boolean;
  /** When true, the Atlas user accepted the current contribution agreement version. */
  hasContributionAgreement: boolean;
  roles: ContributorType[];
  /** Stable React key for stacked avatars; defaults to ORCID when omitted. */
  stackKey: string;
};

/**
 * Returns whether an Atlas user row has accepted the current contribution agreement.
 */
export function userHasCurrentContributionAgreement(user: {
  contributionAgreementAccepted: boolean;
  contributionAgreementVersion: string | null;
}): boolean {
  return (
    user.contributionAgreementAccepted &&
    user.contributionAgreementVersion === CONTRIBUTION_AGREEMENT_VERSION
  );
}

/**
 * Maps claim and contribution-agreement state to the contribute Researchers badge color.
 */
export function researcherAttributionBadgeStatus(params: {
  isClaimed: boolean;
  hasContributionAgreement: boolean;
}): ResearcherAttributionBadgeStatus {
  if (!params.isClaimed) {
    return "unclaimed";
  }
  if (!params.hasContributionAgreement) {
    return "pending_agreement";
  }
  return "agreed";
}

/**
 * Builds the avatar-stack key for one `(orcid, role)` attribution row.
 */
export function attributionAvatarStackKey(
  orcid: string,
  role: DataCiteContributorType,
): string {
  return `${orcid.trim()}:${role}`;
}

/**
 * Maps each valid attribution row to one avatar record for contribute and edit UIs.
 */
export function datasetAttributionRowsForAvatarDisplay(
  rows: DatasetAttributionEntry[],
): AttributionAvatarDisplay[] {
  return filterValidOrcidAttributions(rows).map((row) => {
    const orcid = row.orcid.trim();
    const role =
      coerceContributorRoleInput(row.role) ??
      dataCiteContributorTypeSchema.parse(row.role);
    return {
      orcid,
      profileUserId: row.isClaimed ? (row.userId ?? orcid) : "",
      displayName:
        row.displayName ?? (row.isClaimed ? "Researcher" : orcid),
      image: row.imageUrl,
      isClaimed: row.isClaimed,
      hasContributionAgreement: row.hasContributionAgreement,
      roles: [role],
      stackKey: attributionAvatarStackKey(orcid, role),
    };
  });
}

/**
 * Collapses valid attribution rows to one avatar record per ORCID for compact UI stacks.
 */
export function datasetAttributionsForAvatarDisplay(
  rows: DatasetAttributionEntry[],
): AttributionAvatarDisplay[] {
  const hasAgreementByOrcid = new Map<string, boolean>();
  for (const row of filterValidOrcidAttributions(rows)) {
    const key = row.orcid.trim();
    hasAgreementByOrcid.set(
      key,
      (hasAgreementByOrcid.get(key) ?? false) || row.hasContributionAgreement,
    );
  }
  return dedupeNexafsContributorsByOrcid(
    filterValidOrcidAttributions(rows).map((row) => ({
      orcid: row.orcid.trim(),
      userId: row.isClaimed ? (row.userId ?? row.orcid) : null,
      name: row.displayName,
      image: row.imageUrl,
      isClaimed: row.isClaimed,
      isPublicProfileVisible: row.isClaimed,
      role: row.role,
    })),
  ).map((person) => ({
    orcid: person.orcid,
    profileUserId: person.isClaimed ? person.orcid : "",
    displayName:
      person.name ?? (person.isClaimed ? "Researcher" : person.orcid),
    image: person.image,
    isClaimed: person.isClaimed,
    hasContributionAgreement: hasAgreementByOrcid.get(person.orcid) ?? false,
    roles: person.roles,
    stackKey: person.orcid,
  }));
}

/**
 * Merges server-resolved Atlas profile fields into avatar display rows for the contribute UI.
 */
export function enrichAttributionAvatarDisplays(
  displays: AttributionAvatarDisplay[],
  profilesByOrcid: ReadonlyMap<
    string,
    {
      displayName: string | null;
      imageUrl: string | null;
      hasAtlasProfile: boolean;
      hasContributionAgreement: boolean;
    }
  >,
): AttributionAvatarDisplay[] {
  return displays.map((display) => {
    const profile = profilesByOrcid.get(display.orcid.trim());
    if (!profile) {
      return display;
    }
    const isClaimed = display.isClaimed || profile.hasAtlasProfile;
    const profileUserId = display.profileUserId.trim();
    const profileDisplayName = profile.displayName?.trim() ?? null;
    return {
      ...display,
      isClaimed,
      profileUserId: isClaimed
        ? profileUserId.length > 0
          ? profileUserId
          : display.orcid
        : display.profileUserId,
      displayName:
        display.displayName ??
        profileDisplayName ??
        (isClaimed ? "Researcher" : display.orcid),
      image: display.image ?? profile.imageUrl,
      hasContributionAgreement: profile.hasContributionAgreement,
    };
  });
}

/**
 * Stored experiment contributor row returned by `experiments.listAttributions`.
 */
export type ExperimentAttributionContributorDto = {
  id: string;
  orcid: string;
  role: DataCiteContributorType;
  userId: string | null;
  displayName: string | null;
  image: string | null;
  isClaimed: boolean;
  isPublicProfileVisible: boolean;
  hasContributionAgreement: boolean;
};

/**
 * Maps `experiments.listAttributions` rows into contribute-style attribution entries for edit UIs.
 */
export function datasetAttributionsFromContributorDtos(
  rows: ExperimentAttributionContributorDto[],
): DatasetAttributionEntry[] {
  return rows.map((row) => ({
    clientId: row.id,
    orcid: row.orcid,
    role: row.role,
    displayName: row.displayName,
    userId: row.userId,
    isClaimed: row.isClaimed,
    hasContributionAgreement: row.hasContributionAgreement,
    imageUrl: row.image,
  }));
}

/**
 * Builds the `experiments.setAttributions` payload from local attribution editor state.
 */
export function datasetAttributionsToSetAttributionInput(
  rows: DatasetAttributionEntry[],
): Array<{ orcid: string; role: DataCiteContributorType }> {
  return filterValidOrcidAttributions(rows).map((row) => ({
    orcid: row.orcid.trim(),
    role: row.role,
  }));
}

/**
 * Returns whether two attribution lists match after validation and deduplication.
 */
export function datasetAttributionsEqual(
  left: DatasetAttributionEntry[],
  right: DatasetAttributionEntry[],
): boolean {
  const normalize = (rows: DatasetAttributionEntry[]) =>
    dedupeDatasetAttributions(filterValidOrcidAttributions(rows))
      .map((row) => `${row.orcid.trim()}:${row.role}`)
      .sort()
      .join("|");
  return normalize(left) === normalize(right);
}

export { contributorRoleLabel, isUploaderContributorRole };
