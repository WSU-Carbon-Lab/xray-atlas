"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Spinner } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import {
  Clock,
  FlaskConical,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { ALS_5322_INSTRUMENT_LABEL } from "~/lib/dashboard-processing-session";
import { trpc } from "~/trpc/client";

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
  const sessionsQuery = trpc.dashboardSessions.list.useQuery(undefined, {
    staleTime: 30_000,
  });
  const recentSessions = sessionsQuery.data ?? [];

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
          title="Analysis instruments"
          description="Facilities with built-in spectroscopy processing software."
          icon={<FlaskConical className="h-4 w-4" />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/instruments/als-5322"
              className="border-border bg-default/20 hover:bg-default/40 flex flex-col gap-2 rounded-lg border px-4 py-4 transition-colors"
            >
              <p className="text-foreground text-sm font-semibold">
                ALS — Beamline 5.3.2.2 (STXM)
              </p>
              <p className="text-muted text-sm leading-snug">
                Browse local beamtime folders, extract NEXAFS line-scan spectra,
                and define sample and izero regions in-browser.
              </p>
              <span
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "mt-2 w-fit",
                )}
              >
                Open workspace
              </span>
            </Link>
          </div>
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
                    <Link
                      href={`/dashboard/instruments/als-5322?session=${session.id}`}
                      className="border-border hover:bg-default/40 flex items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-medium">
                          {session.stepMetadata.workspace?.folderRootName ??
                            session.title ??
                            "Untitled session"}
                        </p>
                        <p className="text-muted text-xs">
                          {session.stepMetadata.workspace?.beamtimeName ??
                            ALS_5322_INSTRUMENT_LABEL}
                        </p>
                      </div>
                      <time
                        className="text-muted shrink-0 text-xs tabular-nums"
                        dateTime={new Date(session.updatedAt).toISOString()}
                      >
                        {new Date(session.updatedAt).toLocaleString()}
                      </time>
                    </Link>
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
