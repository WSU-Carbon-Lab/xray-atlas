import type { ComponentType } from "react";

/**
 * Connector availability for dashboard instrument workspaces.
 *
 * - `ready`: production-ready; workspace route is fully supported.
 * - `beta`: functional workspace with ongoing iteration; shown with a Beta badge.
 * - `not_ready`: listed on the dashboard home page only; workspace route returns not found.
 */
export type DashboardConnectorReadiness = "beta" | "ready" | "not_ready";

/**
 * Registry entry describing one dashboard instrument connector.
 */
export type DashboardConnectorDefinition = {
  /** URL slug under `/dashboard/instruments/[slug]`. */
  slug: string;
  /** Reader-facing instrument label. */
  label: string;
  /** Short description for dashboard home cards. */
  description: string;
  /** Optional facility grouping label (for example "Advanced Light Source"). */
  facilityLabel?: string;
  readiness: DashboardConnectorReadiness;
  /**
   * Lazy loader for the workspace page component.
   *
   * Only invoked for `beta` and `ready` connectors when the dynamic route mounts.
   */
  loadWorkspace: () => Promise<{ default: ComponentType }>;
};
