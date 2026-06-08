"use client";

import Link from "next/link";
import { Badge } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import type { DashboardConnectorSummary } from "./connectors/types";

type DashboardConnectorCardProps = {
  connector: DashboardConnectorSummary;
  badgeLabel: string | null;
  workspaceHref?: string;
  instrumentHref?: string;
};

/**
 * Dashboard home card for one instrument connector with workspace and Atlas record actions.
 */
export function DashboardConnectorCard({
  connector,
  badgeLabel,
  workspaceHref,
  instrumentHref,
}: DashboardConnectorCardProps) {
  const facilityInstrumentLabel = `${connector.facilityLabel}, ${connector.instrumentLabel}`;

  return (
    <div className="border-border bg-default/20 flex flex-col gap-2 rounded-lg border px-4 py-4">
      <div className="flex flex-col gap-1">
        <p className="text-muted text-xs leading-snug">{connector.facilityLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-foreground text-sm font-semibold">
            {connector.instrumentLabel}
          </p>
          {badgeLabel ? (
            <Badge variant="secondary" size="sm">
              {badgeLabel}
            </Badge>
          ) : null}
        </div>
      </div>
      <p className="text-muted text-sm leading-snug">{connector.description}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {workspaceHref ? (
          <Link
            href={workspaceHref}
            className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            aria-label={`Open ${facilityInstrumentLabel} analysis workspace`}
          >
            Open workspace
          </Link>
        ) : null}
        {instrumentHref ? (
          <Link
            href={instrumentHref}
            className={cn(
              buttonVariants({
                variant: workspaceHref ? "secondary" : "primary",
                size: "sm",
              }),
            )}
            aria-label={`View ${facilityInstrumentLabel} instrument record`}
          >
            View instrument
          </Link>
        ) : null}
      </div>
    </div>
  );
}
