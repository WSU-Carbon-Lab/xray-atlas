import type { PrismaClient } from "~/prisma/client";
import {
  listDashboardConnectorBindings,
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
  /** Persisted `instruments.id` when a binding matches a database row. */
  instrumentId?: string;
  /** Reader-facing facility name from the database or binding default. */
  facilityLabel: string;
  /** Reader-facing instrument name from the database or binding default. */
  instrumentLabel: string;
  /** Short description from the connector binding overlay. */
  description: string;
  readiness: DashboardConnectorReadiness;
};

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

/**
 * Lists every registered dashboard connector binding, enriched with matched Atlas instrument
 * rows when present.
 *
 * Unmatched bindings still appear as coming-soon cards using binding default facility and
 * instrument labels. Results sort beta/ready connectors first, then not_ready alphabetically
 * by facility and instrument name.
 */
export async function listDashboardConnectorsFromDb(
  db: PrismaClient,
): Promise<DashboardConnectorCardDto[]> {
  const bindings = listDashboardConnectorBindings();
  const facilityNames = [
    ...new Set(bindings.map((binding) => binding.match.facilityName)),
  ];

  const instruments = await db.instruments.findMany({
    where: {
      facilities: {
        name: { in: facilityNames },
      },
    },
    include: {
      facilities: {
        select: { name: true },
      },
    },
    orderBy: [{ facilities: { name: "asc" } }, { name: "asc" }],
  });

  const matchedInstrumentBySlug = new Map<
    string,
    (typeof instruments)[number]
  >();

  for (const instrument of instruments) {
    const binding = matchInstrumentToDashboardBinding(
      instrument.name,
      instrument.facilities.name,
    );
    if (!binding) {
      continue;
    }
    matchedInstrumentBySlug.set(binding.slug, instrument);
  }

  const cards = bindings.map((binding) => {
    const matched = matchedInstrumentBySlug.get(binding.slug);
    return {
      slug: binding.slug,
      instrumentId: matched?.id,
      facilityLabel: matched?.facilities.name ?? binding.match.facilityName,
      instrumentLabel: matched?.name ?? binding.fallbackLabel,
      description: binding.description,
      readiness: binding.readiness,
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
