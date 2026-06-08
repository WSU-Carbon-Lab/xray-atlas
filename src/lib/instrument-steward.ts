import type { UserWithOrcid } from "~/components/ui/avatar";
import type { DashboardConnectorReadiness } from "~/features/dashboard/connectors/types";

/** Public beamline scientist steward surfaced on facility instrument cards. */
export type InstrumentStewardPublic = {
  instrumentId: string;
  userId: string;
  name: string | null;
  image: string | null;
  assignedAt: string;
  claimIssueUrl: string | null;
  notes: string | null;
};

/** View-model inputs for {@link resolveInstrumentConnectorSectionView}. */
export type InstrumentConnectorSectionViewInput = {
  readiness: DashboardConnectorReadiness;
  workspaceSlug: string | undefined;
  stewards: InstrumentStewardPublic[];
};

/** Resolved visibility flags for the facility instrument connector claim section. */
export type InstrumentConnectorSectionView = {
  showWorkspaceLink: boolean;
  showSteward: boolean;
  showClaimBeamline: boolean;
  showRequestConnector: boolean;
  showNoWorkspaceNarrative: boolean;
  hasWorkspace: boolean;
};

/** Session inputs for {@link canAddBeamlineScientist}. */
export type CanAddBeamlineScientistInput = {
  sessionUserId: string | null | undefined;
  canManageUsers: boolean;
  stewards: InstrumentStewardPublic[];
};

/**
 * Derives which blocks render in {@link InstrumentConnectorClaimSection}.
 *
 * Connector requests render only when no dashboard workspace is bound (`not_ready`).
 * Claim beamline stays available for affiliation verification in every readiness state.
 */
export function resolveInstrumentConnectorSectionView(
  input: InstrumentConnectorSectionViewInput,
): InstrumentConnectorSectionView {
  const hasWorkspace =
    input.readiness === "beta" || input.readiness === "ready";
  const hasWorkspaceHref = hasWorkspace && Boolean(input.workspaceSlug);

  return {
    showWorkspaceLink: hasWorkspaceHref,
    showSteward: input.stewards.length > 0,
    showClaimBeamline: true,
    showRequestConnector: input.readiness === "not_ready",
    showNoWorkspaceNarrative: !hasWorkspace,
    hasWorkspace,
  };
}

/**
 * Resolves whether the signed-in viewer may add beamline scientists via the attribution row.
 *
 * Returns true for user administrators and for users already listed as stewards on the instrument.
 */
export function canAddBeamlineScientist(
  input: CanAddBeamlineScientistInput,
): boolean {
  if (input.canManageUsers) {
    return true;
  }
  const sessionUserId = input.sessionUserId?.trim() ?? "";
  if (sessionUserId.length === 0) {
    return false;
  }
  return input.stewards.some((row) => row.userId === sessionUserId);
}

/**
 * Builds the public profile path for a steward ORCID user id.
 */
export function instrumentStewardProfileHref(userId: string): string {
  return `/users/${encodeURIComponent(userId)}`;
}

function normalizeStewardImageUrl(
  image: string | null | undefined,
): string | null {
  const trimmed = image?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function stewardToAvatarUser(steward: InstrumentStewardPublic): UserWithOrcid {
  const trimmedName = steward.name?.trim() ?? "";
  const stewardHasAtlasProfile = trimmedName.length > 0;
  const displayName =
    trimmedName.length > 0 ? trimmedName : steward.userId;

  return {
    id: steward.userId,
    orcid: steward.userId,
    name: displayName,
    image: normalizeStewardImageUrl(steward.image),
    isAtlasProfile: stewardHasAtlasProfile,
    avatarPlaceholder: stewardHasAtlasProfile ? "initials" : "person",
    hoverRoleLabel: "Beamline scientist",
    tooltipSubtitle: "Beamline scientist",
    avatarStackKey: steward.userId,
  };
}

/**
 * Maps assigned beamline stewards to stacked {@link AvatarGroup} users for facility instrument cards.
 *
 * Deduplicates by `userId` and preserves first-seen order for stable avatar stacking.
 */
/** Search hit fields used to build an optimistic steward row before the mutation resolves. */
export type InstrumentStewardSearchHit = {
  orcid: string;
  displayName: string;
  imageUrl: string | null;
  hasAtlasProfile: boolean;
};

/**
 * Builds a provisional steward DTO for optimistic facility cache updates after picker selection.
 */
export function buildOptimisticInstrumentSteward(
  instrumentId: string,
  hit: InstrumentStewardSearchHit,
): InstrumentStewardPublic {
  return {
    instrumentId,
    userId: hit.orcid,
    name: hit.hasAtlasProfile ? hit.displayName : null,
    image: hit.imageUrl,
    assignedAt: new Date().toISOString(),
    claimIssueUrl: null,
    notes: null,
  };
}

/**
 * Merges one steward into a facility-scoped stewards map without duplicating `userId` rows.
 */
export function mergeInstrumentStewardIntoFacilityMap(
  stewardsByInstrumentId: Record<string, InstrumentStewardPublic[]>,
  steward: InstrumentStewardPublic,
): Record<string, InstrumentStewardPublic[]> {
  const bucket = stewardsByInstrumentId[steward.instrumentId] ?? [];
  if (bucket.some((row) => row.userId === steward.userId)) {
    return stewardsByInstrumentId;
  }
  return {
    ...stewardsByInstrumentId,
    [steward.instrumentId]: [...bucket, steward],
  };
}

/**
 * Merges multiple stewards into a facility-scoped map, skipping duplicate `userId` rows per instrument.
 */
export function mergeInstrumentStewardsIntoFacilityMap(
  stewardsByInstrumentId: Record<string, InstrumentStewardPublic[]>,
  stewards: InstrumentStewardPublic[],
): Record<string, InstrumentStewardPublic[]> {
  return stewards.reduce(
    (map, steward) => mergeInstrumentStewardIntoFacilityMap(map, steward),
    stewardsByInstrumentId,
  );
}

/**
 * Toggles a search hit in a pending beamline-scientist selection list keyed by ORCID.
 */
export function toggleInstrumentStewardSearchHitSelection(
  pending: InstrumentStewardSearchHit[],
  hit: InstrumentStewardSearchHit,
): InstrumentStewardSearchHit[] {
  const existingIndex = pending.findIndex((row) => row.orcid === hit.orcid);
  if (existingIndex >= 0) {
    return pending.filter((row) => row.orcid !== hit.orcid);
  }
  return [...pending, hit];
}

/**
 * Returns whether an ORCID is already present in a pending steward selection list.
 */
export function isInstrumentStewardSearchHitSelected(
  pending: InstrumentStewardSearchHit[],
  orcid: string,
): boolean {
  return pending.some((row) => row.orcid === orcid);
}

/**
 * Maps pending steward search hits to stacked avatar users for compact picker previews.
 */
export function instrumentStewardSearchHitsForAvatarDisplay(
  hits: InstrumentStewardSearchHit[],
): UserWithOrcid[] {
  const seen = new Set<string>();
  const users: UserWithOrcid[] = [];
  for (const hit of hits) {
    if (seen.has(hit.orcid)) {
      continue;
    }
    seen.add(hit.orcid);
    users.push({
      id: hit.orcid,
      orcid: hit.orcid,
      name: hit.displayName,
      image: hit.imageUrl,
      isAtlasProfile: hit.hasAtlasProfile,
      avatarPlaceholder: hit.hasAtlasProfile ? "initials" : "person",
      hoverRoleLabel: "Beamline scientist",
      tooltipSubtitle: "Pending add",
      avatarStackKey: hit.orcid,
    });
  }
  return users;
}

export function instrumentStewardsForAvatarDisplay(
  stewards: InstrumentStewardPublic[] | null | undefined,
): UserWithOrcid[] {
  if (!stewards || stewards.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const users: UserWithOrcid[] = [];
  for (const steward of stewards) {
    if (seen.has(steward.userId)) {
      continue;
    }
    seen.add(steward.userId);
    users.push(stewardToAvatarUser(steward));
  }
  return users;
}
