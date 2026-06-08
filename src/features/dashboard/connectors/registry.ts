import type { DashboardConnectorDefinition, DashboardConnectorReadiness } from "./types";

/** URL slug for the ALS Beamline 5.3.2.2 STXM instrument workspace. */
export const ALS_5322_INSTRUMENT_SLUG = "als-5322";

/** Reader-facing label for the ALS 5.3.2.2 workspace. */
export const ALS_5322_INSTRUMENT_LABEL = "ALS Beamline 5.3.2.2 STXM";

const ALS_FACILITY_LABEL = "Advanced Light Source";

const CONNECTOR_DEFINITIONS: readonly DashboardConnectorDefinition[] = [
  {
    slug: ALS_5322_INSTRUMENT_SLUG,
    label: ALS_5322_INSTRUMENT_LABEL,
    description:
      "Browse local beamtime folders, extract NEXAFS line-scan spectra, and define sample and izero regions in-browser.",
    facilityLabel: ALS_FACILITY_LABEL,
    readiness: "beta",
    loadWorkspace: () =>
      import(
        "~/features/dashboard/instrument-workspace/stxm-als-5322-workspace"
      ).then((module) => ({ default: module.StxmAls5322Workspace })),
  },
  {
    slug: "als-5321",
    label: "ALS — Beamline 5.3.2.1 (STXM)",
    description:
      "Next-generation STXM beamline workspace for local folder processing and in-browser spectra reduction.",
    facilityLabel: ALS_FACILITY_LABEL,
    readiness: "not_ready",
    loadWorkspace: async () => {
      throw new Error("ALS 5.3.2.1 workspace is not available yet.");
    },
  },
  {
    slug: "als-731",
    label: "ALS — Beamline 7.3.1 (STXM)",
    description: "STXM spectroscopy workspace for ALS Beamline 7.3.1 beamtime folders.",
    facilityLabel: ALS_FACILITY_LABEL,
    readiness: "not_ready",
    loadWorkspace: async () => {
      throw new Error("ALS 7.3.1 workspace is not available yet.");
    },
  },
] as const;

const CONNECTOR_BY_SLUG = new Map(
  CONNECTOR_DEFINITIONS.map((entry) => [entry.slug, entry]),
);

/**
 * Returns the connector definition for `slug`, or `undefined` when unregistered.
 */
export function resolveDashboardConnector(
  slug: string,
): DashboardConnectorDefinition | undefined {
  return CONNECTOR_BY_SLUG.get(slug.trim());
}

/**
 * Lists every registered connector in stable registration order.
 */
export function listDashboardConnectors(): readonly DashboardConnectorDefinition[] {
  return CONNECTOR_DEFINITIONS;
}

/**
 * Returns instrument slugs that may be persisted on `dashboardSessions.create`.
 */
export function allowedDashboardInstrumentSlugs(): readonly string[] {
  return CONNECTOR_DEFINITIONS.filter(
    (entry) => entry.readiness === "beta" || entry.readiness === "ready",
  ).map((entry) => entry.slug);
}

/**
 * Returns true when `slug` identifies a connector allowed to create server sessions.
 */
export function isAllowedDashboardInstrumentSlug(slug: string): boolean {
  const entry = resolveDashboardConnector(slug);
  return entry?.readiness === "beta" || entry?.readiness === "ready";
}

/**
 * Returns true when `slug` resolves to a workspace route that should render (beta or ready).
 */
export function isDashboardWorkspaceAccessible(slug: string): boolean {
  const entry = resolveDashboardConnector(slug);
  return entry?.readiness === "beta" || entry?.readiness === "ready";
}

/**
 * Builds the instrument workspace href for `slug`, optionally resuming `sessionId`.
 */
export function dashboardInstrumentWorkspaceHref(
  slug: string,
  sessionId?: string | null,
): string {
  const base = `/dashboard/instruments/${encodeURIComponent(slug)}`;
  if (!sessionId) {
    return base;
  }
  const params = new URLSearchParams({ session: sessionId });
  return `${base}?${params.toString()}`;
}

/**
 * Returns the reader-facing label for `slug`, or a title-cased fallback from the slug.
 */
export function dashboardConnectorLabel(slug: string): string {
  const entry = resolveDashboardConnector(slug);
  if (entry) {
    return entry.label;
  }
  return slug;
}

/** Human-readable badge text for connector readiness, or null when no badge applies. */
export function dashboardConnectorReadinessBadge(
  readiness: DashboardConnectorReadiness,
): string | null {
  switch (readiness) {
    case "beta":
      return "Beta";
    case "not_ready":
      return "Coming soon";
    case "ready":
      return null;
    default:
      return null;
  }
}
