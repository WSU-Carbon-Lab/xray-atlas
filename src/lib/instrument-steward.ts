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
  steward: InstrumentStewardPublic | null | undefined;
};

/** Resolved visibility flags for the facility instrument connector claim section. */
export type InstrumentConnectorSectionView = {
  showWorkspaceLink: boolean;
  showSteward: boolean;
  showClaimActions: boolean;
  showNoWorkspaceNarrative: boolean;
};

/**
 * Derives which blocks render in {@link InstrumentConnectorClaimSection}.
 *
 * Claim and connector request actions stay visible even when a steward is assigned or a
 * beta workspace exists.
 */
export function resolveInstrumentConnectorSectionView(
  input: InstrumentConnectorSectionViewInput,
): InstrumentConnectorSectionView {
  const hasWorkspace =
    input.readiness === "beta" || input.readiness === "ready";
  const hasWorkspaceHref = hasWorkspace && Boolean(input.workspaceSlug);

  return {
    showWorkspaceLink: hasWorkspaceHref,
    showSteward: Boolean(input.steward),
    showClaimActions: true,
    showNoWorkspaceNarrative: !hasWorkspace,
  };
}

/**
 * Builds the public profile path for a steward ORCID user id.
 */
export function instrumentStewardProfileHref(userId: string): string {
  return `/users/${encodeURIComponent(userId)}`;
}
