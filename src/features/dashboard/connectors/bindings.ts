import type { DashboardConnectorReadiness } from "./types";

/** URL slug for the ALS Beamline 5.3.2.2 STXM instrument workspace. */
export const ALS_5322_INSTRUMENT_SLUG = "als-5322";

/** Fallback reader-facing label when the Atlas instrument row is unavailable. */
export const ALS_5322_INSTRUMENT_LABEL = "ALS Beamline 5.3.2.2 STXM";

/**
 * Criteria that bind one persisted Atlas `instruments` row to a dashboard workspace slug.
 *
 * Matching is case-insensitive on facility name and uses {@link instrumentNamePattern}
 * against the instrument `name` column.
 */
export type DashboardInstrumentBindingMatch = {
  /** Exact facility `name` from `facilities`. */
  facilityName: string;
  /** Applied to `instruments.name` after trim. */
  instrumentNamePattern: RegExp;
};

/**
 * Registry overlay for one dashboard connector: slug, readiness, copy, and DB match rule.
 *
 * Matched instrument rows supply {@link DashboardConnectorCardDto.facilityLabel} and
 * {@link DashboardConnectorCardDto.instrumentLabel}; binding defaults fill unmatched slots.
 */
export type DashboardConnectorBinding = {
  slug: string;
  match: DashboardInstrumentBindingMatch;
  description: string;
  /** Default instrument label when no Atlas `instruments` row matches. */
  fallbackLabel: string;
  readiness: DashboardConnectorReadiness;
};

const ALS_FACILITY_NAME = "Advanced Light Source";

/** URL slug for the ALS Beamline 11.0.1.2 instrument workspace placeholder. */
export const ALS_11012_INSTRUMENT_SLUG = "als-11012";

const CONNECTOR_BINDINGS: readonly DashboardConnectorBinding[] = [
  {
    slug: ALS_5322_INSTRUMENT_SLUG,
    match: {
      facilityName: ALS_FACILITY_NAME,
      instrumentNamePattern: /5\.3\.2\.2/i,
    },
    fallbackLabel: "Beamline 5.3.2.2",
    description:
      "Browse local beamtime folders, extract NEXAFS line-scan spectra, and define sample and izero regions in-browser.",
    readiness: "beta",
  },
  {
    slug: ALS_11012_INSTRUMENT_SLUG,
    match: {
      facilityName: ALS_FACILITY_NAME,
      instrumentNamePattern: /11\.0\.1\.2/i,
    },
    fallbackLabel: "Beamline 11.0.1.2",
    description:
      "Spectroscopy workspace for ALS Beamline 11.0.1.2 local beamtime folders.",
    readiness: "not_ready",
  },
] as const;

const BINDING_BY_SLUG = new Map(
  CONNECTOR_BINDINGS.map((entry) => [entry.slug, entry]),
);

/**
 * Returns every connector binding in stable registration order.
 */
export function listDashboardConnectorBindings(): readonly DashboardConnectorBinding[] {
  return CONNECTOR_BINDINGS;
}

/**
 * Returns the binding for `slug`, or `undefined` when unregistered.
 */
export function resolveDashboardConnectorBinding(
  slug: string,
): DashboardConnectorBinding | undefined {
  return BINDING_BY_SLUG.get(slug.trim());
}

/**
 * Returns the first binding whose facility and instrument name pattern match `instrumentName`
 * and `facilityName`, or `undefined` when no rule applies.
 */
function facilityNamesMatch(expected: string, actual: string): boolean {
  return (
    expected.trim().localeCompare(actual.trim(), undefined, {
      sensitivity: "accent",
    }) === 0
  );
}

export function matchInstrumentToDashboardBinding(
  instrumentName: string,
  facilityName: string,
): DashboardConnectorBinding | undefined {
  const normalizedName = instrumentName.trim();
  const normalizedFacility = facilityName.trim();
  if (!normalizedName || !normalizedFacility) {
    return undefined;
  }

  for (const binding of CONNECTOR_BINDINGS) {
    if (!facilityNamesMatch(binding.match.facilityName, normalizedFacility)) {
      continue;
    }
    if (binding.match.instrumentNamePattern.test(normalizedName)) {
      return binding;
    }
  }

  return undefined;
}

/**
 * Returns instrument slugs that may be persisted on `dashboardSessions.create`.
 */
export function allowedDashboardInstrumentSlugs(): readonly string[] {
  return CONNECTOR_BINDINGS.filter(
    (entry) => entry.readiness === "beta" || entry.readiness === "ready",
  ).map((entry) => entry.slug);
}

/**
 * Returns true when `slug` identifies a connector allowed to create server sessions.
 */
export function isAllowedDashboardInstrumentSlug(slug: string): boolean {
  const entry = resolveDashboardConnectorBinding(slug);
  return entry?.readiness === "beta" || entry?.readiness === "ready";
}

/**
 * Returns true when `slug` resolves to a workspace route that should render (beta or ready).
 */
export function isDashboardWorkspaceAccessible(slug: string): boolean {
  const entry = resolveDashboardConnectorBinding(slug);
  return entry?.readiness === "beta" || entry?.readiness === "ready";
}
