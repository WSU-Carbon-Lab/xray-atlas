"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Pagination, Spinner } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import {
  Clock,
  FlaskConical,
  LayoutDashboard,
  LineChart,
  Users,
} from "lucide-react";
import { selectRecentWorkspaceSessions } from "~/lib/dashboard-processing-session";
import { trpc } from "~/trpc/client";
import {
  dashboardConnectorReadinessBadge,
  dashboardInstrumentBrowseHref,
  dashboardInstrumentWorkspaceHref,
} from "./connectors/registry";
import { DASHBOARD_CONNECTORS_DEFAULT_PAGE_SIZE } from "./connectors/resolve-dashboard-connectors";
import { DashboardRecentSessionRow } from "./dashboard-recent-session-row";
import { DashboardConnectorCard } from "./dashboard-connector-card";
import { instrumentConnectorRequestHrefForCard } from "./instrument-connector-claim-section";

type DashboardSectionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: ReactNode;
};

function DashboardSection({
  title,
  description,
  icon,
  children,
}: DashboardSectionProps) {
  return (
    <section className="border-border bg-surface rounded-lg border">
      <header className="border-border flex items-start gap-3 border-b px-5 py-4">
        <span
          className="text-accent bg-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-foreground text-base font-semibold">{title}</h2>
          <p className="text-muted mt-1 text-sm leading-snug">{description}</p>
        </div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * Facility-first dashboard landing with analysis software entry points.
 */
export function DashboardHomePage() {
  const utils = trpc.useUtils();
  const hasPrunedDuplicatesRef = useRef(false);
  const [instrumentsPage, setInstrumentsPage] = useState(1);
  const instrumentsPageSize = DASHBOARD_CONNECTORS_DEFAULT_PAGE_SIZE;
  const instrumentsOffset = (instrumentsPage - 1) * instrumentsPageSize;

  const sessionsQuery = trpc.dashboardSessions.list.useQuery(undefined, {
    staleTime: 30_000,
  });
  const connectorsQuery = trpc.instruments.listDashboardConnectors.useQuery(
    {
      limit: instrumentsPageSize,
      offset: instrumentsOffset,
    },
    { staleTime: 60_000 },
  );
  const { mutate: dedupeWorkspaceSessions } =
    trpc.dashboardSessions.dedupeWorkspaceSessions.useMutation({
      onSettled: async () => {
        await utils.dashboardSessions.list.invalidate();
      },
    });

  useEffect(() => {
    if (sessionsQuery.isSuccess && !hasPrunedDuplicatesRef.current) {
      hasPrunedDuplicatesRef.current = true;
      dedupeWorkspaceSessions();
    }
  }, [sessionsQuery.isSuccess, dedupeWorkspaceSessions]);

  const recentSessions = useMemo(
    () => selectRecentWorkspaceSessions(sessionsQuery.data ?? [], 5),
    [sessionsQuery.data],
  );

  const instrumentConnectors = connectorsQuery.data?.items ?? [];
  const instrumentTotal = connectorsQuery.data?.total ?? 0;
  const instrumentTotalPages = Math.max(
    1,
    Math.ceil(instrumentTotal / instrumentsPageSize),
  );

  useEffect(() => {
    if (instrumentsPage > instrumentTotalPages) {
      setInstrumentsPage(instrumentTotalPages);
    }
  }, [instrumentsPage, instrumentTotalPages]);

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="text-muted flex items-center gap-2 text-sm">
          <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
          <span>Contributor dashboard</span>
        </div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          Open beamline analysis workspaces to process local STXM data in your
          browser, then export results to X-ray Atlas when you are ready.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        <DashboardSection
          title="Catalog tools"
          description="Compare published NEXAFS datasets from the Atlas catalog on one plot."
          icon={<LineChart className="h-4 w-4" />}
        >
          <Link
            href="/dashboard/plot"
            className="border-border bg-default/20 hover:bg-default/40 flex flex-col gap-2 rounded-lg border px-4 py-4 transition-colors"
          >
            <p className="text-foreground text-sm font-semibold">
              Compare spectra
            </p>
            <p className="text-muted text-sm leading-snug">
              Search and facet Atlas experiments, pick channels and polarization
              geometries, and overlay multiple traces on a shared spectrum plot.
            </p>
            <span
              className={cn(
                buttonVariants({ variant: "primary", size: "sm" }),
                "mt-2 w-fit",
              )}
            >
              Open plot viewer
            </span>
          </Link>
        </DashboardSection>

        <DashboardSection
          title="Analysis instruments"
          description="Facilities with built-in spectroscopy processing software."
          icon={<FlaskConical className="h-4 w-4" />}
        >
          {connectorsQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : instrumentTotal === 0 ? (
            <p className="text-muted text-sm">
              No analysis instruments are registered in Atlas yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {instrumentConnectors.map((connector) => (
                  <DashboardConnectorCard
                    key={connector.instrumentId ?? connector.slug}
                    connector={connector}
                    badgeLabel={dashboardConnectorReadinessBadge(
                      connector.readiness,
                    )}
                    workspaceHref={
                      connector.readiness === "not_ready"
                        ? undefined
                        : dashboardInstrumentWorkspaceHref(connector.slug)
                    }
                    instrumentHref={
                      connector.instrumentId && connector.facilitySlug
                        ? dashboardInstrumentBrowseHref(
                            connector.facilitySlug,
                            connector.instrumentId,
                          )
                        : undefined
                    }
                    connectorRequestHref={instrumentConnectorRequestHrefForCard(
                      connector.facilityLabel,
                      connector.instrumentLabel,
                      connector.slug,
                      connector.readiness,
                    )}
                  />
                ))}
              </div>
              {instrumentTotalPages > 1 ? (
                <div className="flex justify-center pt-2">
                  <Pagination size="sm" className="gap-2">
                    <Pagination.Content className="gap-2">
                      <Pagination.Item>
                        <Pagination.Previous
                          isDisabled={instrumentsPage <= 1}
                          aria-label="Previous analysis instruments page"
                          onPress={() =>
                            setInstrumentsPage((page) => Math.max(1, page - 1))
                          }
                          className="border-border bg-surface rounded-lg border"
                        >
                          <Pagination.PreviousIcon />
                        </Pagination.Previous>
                      </Pagination.Item>
                      {instrumentTotalPages <= 20
                        ? Array.from(
                            { length: instrumentTotalPages },
                            (_, index) => index + 1,
                          ).map((page) => (
                            <Pagination.Item key={page}>
                              <Pagination.Link
                                isActive={page === instrumentsPage}
                                onPress={() => setInstrumentsPage(page)}
                                aria-label={`Analysis instruments page ${page}`}
                                className="border-border bg-surface rounded-lg border"
                              >
                                {page}
                              </Pagination.Link>
                            </Pagination.Item>
                          ))
                        : null}
                      <Pagination.Item>
                        <Pagination.Next
                          isDisabled={
                            instrumentsPage >= instrumentTotalPages ||
                            !connectorsQuery.data?.hasMore
                          }
                          aria-label="Next analysis instruments page"
                          onPress={() =>
                            setInstrumentsPage((page) =>
                              Math.min(instrumentTotalPages, page + 1),
                            )
                          }
                          className="border-border bg-surface rounded-lg border"
                        >
                          <Pagination.NextIcon />
                        </Pagination.Next>
                      </Pagination.Item>
                    </Pagination.Content>
                  </Pagination>
                </div>
              ) : null}
            </div>
          )}
        </DashboardSection>

        {recentSessions.length > 0 ? (
          <DashboardSection
            title="Resume recent work"
            description="Optional shortcuts to prior local-folder processing sessions."
            icon={<Clock className="h-4 w-4" />}
          >
            {sessionsQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="md" />
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentSessions.slice(0, 5).map((session) => (
                  <li key={session.id}>
                    <DashboardRecentSessionRow session={session} />
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        ) : null}

        <DashboardSection
          title="Attribution"
          description="Beamtime and working groups for crediting processed NEXAFS on upload."
          icon={<Users className="h-4 w-4" />}
        >
          <p className="text-muted text-sm">
            Create or manage attribution teams before exporting spectra to Atlas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/account/teams"
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Manage attribution teams
            </Link>
            <Link
              href="/account/attributions/pending"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
              )}
            >
              Pending attributions
            </Link>
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}
