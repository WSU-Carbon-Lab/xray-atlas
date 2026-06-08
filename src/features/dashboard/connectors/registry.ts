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
  "als-5321": async () => {
    throw new Error("ALS 5.3.2.1 workspace is not available yet.");
  },
  "als-731": async () => {
    throw new Error("ALS 7.3.1 workspace is not available yet.");
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
    label: binding.fallbackLabel,
    description: binding.description,
    facilityLabel: binding.match.facilityName,
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
