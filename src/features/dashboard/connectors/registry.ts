import type { DashboardConnectorDefinition } from "./types";
import {
  ALS_5322_INSTRUMENT_LABEL,
  ALS_5322_INSTRUMENT_SLUG,
  allowedDashboardInstrumentSlugs,
  isAllowedDashboardInstrumentSlug,
  isDashboardWorkspaceAccessible,
  listDashboardConnectorBindings,
  resolveDashboardConnectorBinding,
} from "./bindings";

export { ALS_5322_INSTRUMENT_LABEL, ALS_5322_INSTRUMENT_SLUG };
export {
  allowedDashboardInstrumentSlugs,
  isAllowedDashboardInstrumentSlug,
  isDashboardWorkspaceAccessible,
};

const WORKSPACE_LOADERS: Readonly<
  Record<string, DashboardConnectorDefinition["loadWorkspace"]>
> = {
  [ALS_5322_INSTRUMENT_SLUG]: () =>
    import(
      "~/features/dashboard/instrument-workspace/stxm-als-5322-workspace"
    ).then((module) => ({ default: module.StxmAls5322Workspace })),
  "als-11012": async () => {
    throw new Error("ALS 11.0.1.2 workspace is not available yet.");
  },
};

/**
 * Returns the connector definition for `slug`, or `undefined` when unregistered.
 *
 * Labels on the definition use binding fallback text; dashboard home cards should
 * prefer {@link listDashboardConnectorsFromDb} for authoritative instrument names.
 */
export function resolveDashboardConnector(
  slug: string,
): DashboardConnectorDefinition | undefined {
  const binding = resolveDashboardConnectorBinding(slug);
  if (!binding) {
    return undefined;
  }

  const loadWorkspace = WORKSPACE_LOADERS[binding.slug];
  if (!loadWorkspace) {
    return undefined;
  }

  return {
    slug: binding.slug,
    instrumentLabel: binding.fallbackLabel,
    facilityLabel: binding.match.facilityName,
    description: binding.description,
    readiness: binding.readiness,
    loadWorkspace,
  };
}

/**
 * Returns the reader-facing label for `slug`, or a title-cased fallback from the slug.
 */
export function dashboardConnectorLabel(slug: string): string {
  const entry = resolveDashboardConnectorBinding(slug);
  if (entry) {
    return entry.fallbackLabel;
  }
  return slug;
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
 * Builds the public Atlas facility instrument record href for `instrumentId` under
 * `facilityId`, scrolling to the instrument card on the facility detail page.
 */
export function dashboardInstrumentBrowseHref(
  facilityId: string,
  instrumentId: string,
): string {
  return `/facilities/${encodeURIComponent(facilityId)}#instrument-${encodeURIComponent(instrumentId)}`;
}

/** Human-readable badge text for connector readiness, or null when no badge applies. */
export function dashboardConnectorReadinessBadge(
  readiness: DashboardConnectorDefinition["readiness"],
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

/**
 * @deprecated Use {@link listDashboardConnectorsFromDb} via `instruments.listDashboardConnectors`.
 * Returns binding fallbacks only; does not reflect persisted instrument names.
 */
export function listDashboardConnectors(): readonly DashboardConnectorDefinition[] {
  return listDashboardConnectorBindings()
    .map((binding) => resolveDashboardConnector(binding.slug))
    .filter((entry): entry is DashboardConnectorDefinition => entry !== undefined);
}
