"use client";

import { Badge } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import Link from "next/link";
import {
  buildBeamlineClaimIssueUrl,
  buildInstrumentConnectorRequestIssueUrl,
} from "~/lib/github-beamline-issues";
import {
  resolveInstrumentConnectorSectionView,
  type InstrumentStewardPublic,
} from "~/lib/instrument-steward";
import { matchInstrumentToDashboardBinding } from "./connectors/bindings";
import {
  dashboardConnectorReadinessBadge,
  dashboardInstrumentWorkspaceHref,
} from "./connectors/registry";
import type { DashboardConnectorReadiness } from "./connectors/types";
import { InstrumentBeamlineScientistAttributionRow } from "~/features/facilities/instrument-beamline-scientist-attribution-row";

type InstrumentConnectorClaimSectionProps = {
  facilityId: string;
  facilityName: string;
  instrumentId: string;
  instrumentName: string;
  stewards?: InstrumentStewardPublic[];
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
 * Facility instrument card section for beamline scientists to claim a beamline and, when no
 * workspace exists yet, request a dashboard connector.
 */
export function InstrumentConnectorClaimSection({
  facilityId,
  facilityName,
  instrumentId,
  instrumentName,
  stewards = [],
}: InstrumentConnectorClaimSectionProps) {
  const { readiness, workspaceSlug, badgeLabel } = resolveInstrumentConnectorState(
    facilityName,
    instrumentName,
  );
  const sectionView = resolveInstrumentConnectorSectionView({
    readiness,
    workspaceSlug,
    stewards,
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

      {sectionView.showNoWorkspaceNarrative ? (
        <ol className="text-muted mt-3 list-decimal space-y-1 ps-5 text-sm leading-snug">
          <li>Submit a claim issue so maintainers can verify your affiliation.</li>
          <li>
            After approval, open a connector request with example data, processing code,
            and a processed CSV derived from your as-is files.
          </li>
        </ol>
      ) : null}

      {sectionView.hasWorkspace && !sectionView.showSteward ? (
        <p className="text-muted mt-3 text-sm leading-snug">
          No beamline scientist listed on Atlas yet.
        </p>
      ) : null}

      {sectionView.hasWorkspace ? (
        <p className="text-muted mt-3 text-sm leading-snug">
          Beamline staff can submit a claim issue to verify affiliation with this
          instrument.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {sectionView.showRequestConnector ? (
            <a
              href={connectorIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              aria-label={`Request dashboard connector for ${instrumentName} on GitHub`}
            >
              Request connector
            </a>
          ) : null}
        </div>
        {sectionView.showClaimBeamline ? (
          <InstrumentBeamlineScientistAttributionRow
            facilityId={facilityId}
            instrumentId={instrumentId}
            instrumentName={instrumentName}
            stewards={stewards}
            claimIssueUrl={claimIssueUrl}
          />
        ) : null}
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
