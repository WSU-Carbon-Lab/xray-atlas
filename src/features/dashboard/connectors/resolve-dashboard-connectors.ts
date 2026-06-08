import type { PrismaClient } from "~/prisma/client";
import {
  listDashboardConnectorBindings,
  matchInstrumentToDashboardBinding,
  resolveDashboardConnectorBinding,
} from "./bindings";
import type { DashboardConnectorReadiness } from "./types";

/**
 * Dashboard home card payload merged from a matched Atlas instrument row and connector binding.
 */
export type DashboardConnectorCardDto = {
  /** Workspace URL slug under `/dashboard/instruments/[slug]`. */
  slug: string;
  /** Persisted `instruments.id` for the matched row. */
  instrumentId: string;
  /** Reader-facing label from `instruments.name`. */
  label: string;
  /** Short description from the connector binding overlay. */
  description: string;
  /** Facility display name from `facilities.name`. */
  facilityLabel: string;
  readiness: DashboardConnectorReadiness;
};

/**
 * Lists dashboard connector cards by matching persisted instruments to registry bindings.
 *
 * Only instruments with an active binding rule appear; readiness and descriptions come from
 * the binding overlay while labels and facilities come from the database.
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

  const cards: DashboardConnectorCardDto[] = [];

  for (const instrument of instruments) {
    const binding = matchInstrumentToDashboardBinding(
      instrument.name,
      instrument.facilities.name,
    );
    if (!binding) {
      continue;
    }

    cards.push({
      slug: binding.slug,
      instrumentId: instrument.id,
      label: instrument.name,
      description: binding.description,
      facilityLabel: instrument.facilities.name,
      readiness: binding.readiness,
    });
  }

  return cards;
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
