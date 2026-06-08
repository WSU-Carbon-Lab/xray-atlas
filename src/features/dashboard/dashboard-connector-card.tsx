"use client";

import Link from "next/link";
import { Badge } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import type { DashboardConnectorSummary } from "./connectors/types";

type DashboardConnectorCardProps = {
  connector: DashboardConnectorSummary;
  badgeLabel: string | null;
  href?: string;
};

/**
 * Dashboard home card for one instrument connector (workspace link or coming-soon state).
 */
export function DashboardConnectorCard({
  connector,
  badgeLabel,
  href,
}: DashboardConnectorCardProps) {
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-foreground text-sm font-semibold">{connector.label}</p>
        {badgeLabel ? (
          <Badge variant="secondary" size="sm">
            {badgeLabel}
          </Badge>
        ) : null}
      </div>
      <p className="text-muted text-sm leading-snug">{connector.description}</p>
      <span
        className={cn(
          buttonVariants({
            variant: href ? "primary" : "secondary",
            size: "sm",
          }),
          "mt-2 w-fit",
          !href ? "pointer-events-none opacity-70" : "",
        )}
      >
        {href ? "Open workspace" : "Coming soon"}
      </span>
    </>
  );

  if (!href) {
    return (
      <div className="border-border bg-default/20 flex flex-col gap-2 rounded-lg border px-4 py-4">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="border-border bg-default/20 hover:bg-default/40 flex flex-col gap-2 rounded-lg border px-4 py-4 transition-colors"
    >
      {body}
    </Link>
  );
}
