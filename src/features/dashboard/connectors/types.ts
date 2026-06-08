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
 * Dashboard home card fields shared by API DTOs and connector registry fallbacks.
 */
export type DashboardConnectorSummary = {
  slug: string;
  label: string;
  description: string;
  facilityLabel?: string;
  readiness: DashboardConnectorReadiness;
};

/**
 * Registry entry describing one dashboard instrument connector.
 */
export type DashboardConnectorDefinition = DashboardConnectorSummary & {
  /**
   * Lazy loader for the workspace page component.
   *
   * Only invoked for `beta` and `ready` connectors when the dynamic route mounts.
   */
  loadWorkspace: () => Promise<{ default: ComponentType }>;
};
