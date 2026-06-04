"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import {
  Clock,
  FlaskConical,
  LayoutDashboard,
  Users,
} from "lucide-react";
import {
  ALS_5322_INSTRUMENT_SLUG,
  DASHBOARD_WORKSPACE_STEP_LABELS,
  type DashboardWorkspaceStep,
} from "~/lib/dashboard-processing-session";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";

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

function sessionStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

/**
 * Landing surface for the contributor dashboard with recent processing sessions.
 */
export function DashboardHomePage() {
  const router = useRouter();
  const sessionsQuery = trpc.dashboardSessions.list.useQuery(undefined, {
    staleTime: 30_000,
  });

  const createSession = trpc.dashboardSessions.create.useMutation({
    onSuccess: ({ id }) => {
      router.push(`/dashboard/instruments/als-5322?session=${id}`);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
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
          Process beamline data, revisit recent work, and connect results to
          attribution teams before publishing to X-ray Atlas.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        <DashboardSection
          title="Instrument processing"
          description="STXM NEXAFS line-scan extraction and reduction for ALS Beamline 5.3.2.2."
          icon={<FlaskConical className="h-4 w-4" />}
        >
          <p className="text-muted text-sm">
            Upload raw line scans, define sample and izero regions, and extract
            normalized spectra. Blend fitting and Atlas upload follow in later
            phases.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              isDisabled={createSession.isPending}
              onPress={() => {
                createSession.mutate({ instrumentSlug: ALS_5322_INSTRUMENT_SLUG });
              }}
            >
              {createSession.isPending ? (
                <>
                  <Spinner size="sm" />
                  Starting...
                </>
              ) : (
                "Start ALS 5.3.2.2 session"
              )}
            </Button>
            <Link
              href="/dashboard/instruments/als-5322"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
              )}
            >
              Open workspace
            </Link>
          </div>
        </DashboardSection>

        <DashboardSection
          title="Recent sessions"
          description="Resume in-progress reduction or review completed runs."
          icon={<Clock className="h-4 w-4" />}
        >
          {sessionsQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="text-muted text-sm">
              No processing sessions yet. Start an ALS 5.3.2.2 session to ingest
              STXM line scans.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentSessions.map((session) => {
                const activeStep: DashboardWorkspaceStep =
                  session.stepMetadata.activeStep ?? "ingest";
                const scanCount = session.stepMetadata.ingest?.scans.length ?? 0;
                return (
                  <li key={session.id}>
                    <Link
                      href={`/dashboard/instruments/als-5322?session=${session.id}`}
                      className="border-border hover:bg-default/40 flex flex-col gap-1 rounded-md border px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-medium">
                          {session.title ?? "Untitled session"}
                        </p>
                        <p className="text-muted text-xs">
                          {sessionStatusLabel(session.status)} · Step{" "}
                          {DASHBOARD_WORKSPACE_STEP_LABELS[activeStep]} ·{" "}
                          {scanCount} scan{scanCount === 1 ? "" : "s"}
                          {session.linkedExperiment?.moleculeLabel
                            ? ` · ${session.linkedExperiment.moleculeLabel}`
                            : session.linkedExperiment?.canonicalSlug
                              ? ` · ${session.linkedExperiment.canonicalSlug}`
                              : ""}
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
                );
              })}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection
          title="Attribution"
          description="Beamtime and working groups for crediting processed NEXAFS on upload."
          icon={<Users className="h-4 w-4" />}
        >
          <p className="text-muted text-sm">
            Create or manage attribution teams before exporting spectra to Atlas.
            Processed datasets can inherit roster members as experiment
            contributors in Phase 6.
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
