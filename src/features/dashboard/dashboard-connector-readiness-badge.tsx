"use client";

import { Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { dashboardConnectorReadinessBadge } from "./connectors/registry";
import type { DashboardConnectorReadiness } from "./connectors/types";

type DashboardConnectorReadinessBadgeProps = {
  label?: string | null;
  readiness?: DashboardConnectorReadiness;
  className?: string;
};

/**
 * Inline readiness label for dashboard connectors (`Beta`, `Coming soon`).
 * Uses Chip instead of Badge so the label stays in document flow and is not
 * absolutely positioned inside overflow-clipped facility instrument cards.
 */
export function DashboardConnectorReadinessBadge({
  label,
  readiness,
  className,
}: DashboardConnectorReadinessBadgeProps) {
  const resolvedLabel =
    label ?? (readiness !== undefined ? dashboardConnectorReadinessBadge(readiness) : null);

  if (!resolvedLabel) {
    return null;
  }

  return (
    <Chip
      size="sm"
      variant="secondary"
      color={resolvedLabel === "Beta" ? "warning" : "default"}
      className={cn("h-6 shrink-0 px-2 text-xs font-medium", className)}
    >
      <Chip.Label>{resolvedLabel}</Chip.Label>
    </Chip>
  );
}
