"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { DashboardConnectorReadinessBadge } from "~/features/dashboard/dashboard-connector-readiness-badge";
import type { DashboardConnectorReadiness } from "~/features/dashboard/connectors/types";

type InstrumentWorkspaceShellProps = {
  instrumentLabel: string;
  readiness: DashboardConnectorReadiness;
  children?: ReactNode;
};

/**
 * Shared header chrome for dashboard instrument workspaces (back link, icon, readiness badge).
 */
export function InstrumentWorkspaceShell({
  instrumentLabel,
  readiness,
  children,
}: InstrumentWorkspaceShellProps) {
  return (
    <header className="flex flex-col gap-3">
      <Link
        href="/dashboard"
        className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Dashboard
      </Link>
      <div className="flex items-start gap-3">
        <span
          className="text-accent bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
          aria-hidden
        >
          <FlaskConical className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted text-sm">{instrumentLabel}</p>
            <DashboardConnectorReadinessBadge readiness={readiness} />
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {instrumentLabel}
          </h1>
        </div>
      </div>
      {children}
    </header>
  );
}
