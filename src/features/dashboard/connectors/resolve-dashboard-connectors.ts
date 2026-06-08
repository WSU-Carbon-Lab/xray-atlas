import type { PrismaClient } from "~/prisma/client";
import { canonicalFacilitySlugFromName } from "~/lib/facility-slug";
import {
  matchInstrumentToDashboardBinding,
  resolveDashboardConnectorBinding,
} from "./bindings";
import type { DashboardConnectorReadiness } from "./types";

/**
 * Dashboard home card payload merged from a connector binding and optional Atlas instrument row.
 */
export type DashboardConnectorCardDto = {
  /** Workspace URL slug under `/dashboard/instruments/[slug]`. */
  slug: string;
  /** Persisted `instruments.id` for the Atlas instrument row backing this card. */
  instrumentId?: string;
  /** Persisted `facilities.id` for the parent facility of the instrument row. */
  facilityId?: string;
  /** Canonical `/facilities/[slug]` segment derived from the facility name. */
  facilitySlug?: string;
  /** Reader-facing facility name from the database or binding default. */
  facilityLabel: string;
  /** Reader-facing instrument name from the database or binding default. */
  instrumentLabel: string;
  /** Short description from the connector binding overlay. */
  description: string;
  readiness: DashboardConnectorReadiness;
};

const UNMATCHED_INSTRUMENT_DESCRIPTION =
  "Spectroscopy analysis workspace for this instrument is not available yet.";

function readinessSortRank(readiness: DashboardConnectorReadiness): number {
  switch (readiness) {
    case "ready":
      return 0;
    case "beta":
      return 1;
    case "not_ready":
      return 2;
    default:
      return 3;
  }
}

function connectorCatalogSortKey(card: DashboardConnectorCardDto): string {
  return `${card.facilityLabel}\0${card.instrumentLabel}`;
}

/** Default page size for the dashboard analysis-instruments grid (three columns). */
export const DASHBOARD_CONNECTORS_DEFAULT_PAGE_SIZE = 9;

/** Paginated payload returned by {@link listDashboardConnectorsFromDb}. */
export type DashboardConnectorsPage = {
  items: DashboardConnectorCardDto[];
  total: number;
  hasMore: boolean;
};

/**
 * Slices a sorted connector catalog to `limit` items starting at `offset`.
 *
 * @param cards - Full catalog sorted by readiness, then facility and instrument name.
 * @param params.limit - Maximum items per page; must be at least one.
 * @param params.offset - Zero-based start index; values beyond `cards.length` yield an empty page.
 */
export function paginateDashboardConnectors(
  cards: readonly DashboardConnectorCardDto[],
  params: { limit: number; offset: number },
): DashboardConnectorsPage {
  const limit = Math.max(1, params.limit);
  const offset = Math.max(0, params.offset);
  const items = cards.slice(offset, offset + limit);
  const total = cards.length;

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  };
}

async function buildSortedDashboardConnectorCards(
  db: PrismaClient,
): Promise<DashboardConnectorCardDto[]> {
  const instruments = await db.instruments.findMany({
    include: {
      facilities: {
        select: { name: true },
      },
    },
    orderBy: [{ facilities: { name: "asc" } }, { name: "asc" }],
  });

  const cards = instruments.map((instrument) => {
    const binding = matchInstrumentToDashboardBinding(
      instrument.name,
      instrument.facilities.name,
    );
    const readiness = binding?.readiness ?? "not_ready";

    return {
      slug: binding?.slug ?? instrument.id,
      instrumentId: instrument.id,
      facilityId: instrument.facilityid,
      facilitySlug: canonicalFacilitySlugFromName(instrument.facilities.name),
      facilityLabel: instrument.facilities.name,
      instrumentLabel: instrument.name,
      description: binding?.description ?? UNMATCHED_INSTRUMENT_DESCRIPTION,
      readiness,
    };
  });

  return [...cards].sort((left, right) => {
    const readinessDiff =
      readinessSortRank(left.readiness) - readinessSortRank(right.readiness);
    if (readinessDiff !== 0) {
      return readinessDiff;
    }
    return connectorCatalogSortKey(left).localeCompare(
      connectorCatalogSortKey(right),
    );
  });
}

/**
 * Lists one dashboard card per persisted Atlas instrument, enriched with connector binding
 * overlays when a match rule applies.
 *
 * Cards always use database facility and instrument names. Bindings supply workspace slug,
 * description, and readiness for implemented connectors; unmatched instruments render as
 * coming soon. Results sort beta/ready connectors first, then not_ready alphabetically by
 * facility and instrument name, then slice with `pagination` for the dashboard home grid.
 */
export async function listDashboardConnectorsFromDb(
  db: PrismaClient,
  pagination: { limit: number; offset: number },
): Promise<DashboardConnectorsPage> {
  const cards = await buildSortedDashboardConnectorCards(db);
  return paginateDashboardConnectors(cards, pagination);
}

/**
 * Resolves the reader-facing instrument label for `slug` from the database when a binding
 * and matching instrument row exist; otherwise returns the binding fallback label.
 */
export async function resolveDashboardConnectorLabelFromDb(
  db: PrismaClient,
  slug: string,
): Promise<string | null> {
  const binding = resolveDashboardConnectorBinding(slug);
  if (!binding) {
    return null;
  }

  const rows = await db.instruments.findMany({
    where: {
      facilities: {
        name: binding.match.facilityName,
      },
    },
    select: { name: true },
    orderBy: { name: "asc" },
  });

  const matched = rows.find((row) =>
    binding.match.instrumentNamePattern.test(row.name.trim()),
  );

  return matched?.name ?? binding.fallbackLabel;
}
