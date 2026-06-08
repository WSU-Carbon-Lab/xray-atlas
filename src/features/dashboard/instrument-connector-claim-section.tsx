"use client";

import Link from "next/link";
import { Badge } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import {
  buildBeamlineClaimIssueUrl,
  buildInstrumentConnectorRequestIssueUrl,
} from "~/lib/github-beamline-issues";
import {
  instrumentStewardProfileHref,
  resolveInstrumentConnectorSectionView,
  type InstrumentStewardPublic,
} from "~/lib/instrument-steward";
import { matchInstrumentToDashboardBinding } from "./connectors/bindings";
import {
  dashboardConnectorReadinessBadge,
  dashboardInstrumentWorkspaceHref,
} from "./connectors/registry";
import type { DashboardConnectorReadiness } from "./connectors/types";

type InstrumentConnectorClaimSectionProps = {
  facilityName: string;
  instrumentName: string;
  steward?: InstrumentStewardPublic | null;
};

function resolveInstrumentConnectorState(
  facilityName: string,
  instrumentName: string,
): {
  readiness: DashboardConnectorReadiness;
  workspaceSlug: string | undefined;
  badgeLabel: string | null;
} {
  const binding = matchInstrumentToDashboardBinding(instrumentName, facilityName);
  const readiness = binding?.readiness ?? "not_ready";

  return {
    readiness,
    workspaceSlug: binding?.slug,
    badgeLabel: dashboardConnectorReadinessBadge(readiness),
  };
}

/**
 * Facility instrument card section for beamline scientists to claim a beamline and request
 * a dashboard connector. Claim and connector request actions remain visible when a steward
 * is assigned or a beta workspace exists.
 */
export function InstrumentConnectorClaimSection({
  facilityName,
  instrumentName,
  steward = null,
}: InstrumentConnectorClaimSectionProps) {
  const { readiness, workspaceSlug, badgeLabel } = resolveInstrumentConnectorState(
    facilityName,
    instrumentName,
  );
  const sectionView = resolveInstrumentConnectorSectionView({
    readiness,
    workspaceSlug,
    steward,
  });
  const claimIssueUrl = buildBeamlineClaimIssueUrl({
    facilityName,
    instrumentName,
  });
  const connectorIssueUrl = buildInstrumentConnectorRequestIssueUrl({
    facilityName,
    instrumentName,
    preferredSlug: workspaceSlug,
    technique: readiness !== "not_ready" ? "STXM" : undefined,
  });
  const workspaceHref =
    sectionView.showWorkspaceLink && workspaceSlug
      ? dashboardInstrumentWorkspaceHref(workspaceSlug)
      : undefined;
  const stewardLabel = steward?.name?.trim() || steward?.userId;

  return (
    <section
      className="border-border bg-surface/60 mt-1 rounded-lg border px-3 py-3"
      aria-label={`Dashboard connector status for ${instrumentName}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-foreground text-sm font-medium">Dashboard workspace</p>
        {badgeLabel ? (
          <Badge variant="secondary" size="sm">
            {badgeLabel}
          </Badge>
        ) : null}
      </div>

      {sectionView.showSteward && steward ? (
        <p className="text-muted mt-2 text-sm leading-snug">
          Beamline scientist:{" "}
          <Link
            href={instrumentStewardProfileHref(steward.userId)}
            className="text-accent hover:text-accent-dark font-medium underline-offset-2 hover:underline"
          >
            {stewardLabel}
          </Link>
        </p>
      ) : null}

      {sectionView.showWorkspaceLink && workspaceHref ? (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-muted text-sm leading-snug">
            Browser-side analysis software is available for this instrument on the
            contributor dashboard.
          </p>
          <Link
            href={workspaceHref}
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "w-fit")}
            aria-label={`Open dashboard workspace for ${instrumentName}`}
          >
            Open workspace
          </Link>
        </div>
      ) : null}

      {sectionView.showNoWorkspaceNarrative ? (
        <p className="text-muted mt-2 text-sm leading-snug">
          {sectionView.showSteward
            ? "Maintainers may still need additional claim verification or connector details from beamline staff."
            : "No dashboard workspace is available yet. Beamline scientists can claim this beamline, then submit processing details so maintainers can build a connector."}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-3">
        {sectionView.showNoWorkspaceNarrative ? (
          <ol className="text-muted list-decimal space-y-1 ps-5 text-sm leading-snug">
            <li>Submit a claim issue so maintainers can verify your affiliation.</li>
            <li>
              After approval, open a connector request with example data, processing code,
              and a processed CSV derived from your as-is files.
            </li>
          </ol>
        ) : (
          <p className="text-muted text-sm leading-snug">
            Claim verification and connector requests stay open for additional beamline
            staff or updated processing details.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <a
            href={claimIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            aria-label={`Claim ${instrumentName} beamline on GitHub`}
          >
            Claim beamline
          </a>
          <a
            href={connectorIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            aria-label={`Request dashboard connector for ${instrumentName} on GitHub`}
          >
            Request connector
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Resolves the GitHub connector-request issue URL for a dashboard home card.
 */
export function instrumentConnectorRequestHrefForCard(
  facilityLabel: string,
  instrumentLabel: string,
  slug: string,
  readiness: DashboardConnectorReadiness,
): string | undefined {
  if (readiness !== "not_ready") {
    return undefined;
  }

  return buildInstrumentConnectorRequestIssueUrl({
    facilityName: facilityLabel,
    instrumentName: instrumentLabel,
    preferredSlug: slug,
  });
}
