"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { ArrowLeft, FlaskConical } from "lucide-react";
import {
  ALS_5322_INSTRUMENT_LABEL,
  ALS_5322_INSTRUMENT_SLUG,
  defaultDashboardStepMetadata,
  type DashboardReduceStepMetadata,
  type DashboardRegionsStepMetadata,
  type DashboardStepMetadata,
  type DashboardWorkspaceStep,
  type StxmIngestScanRecord,
  type StxmIngestStorageMode,
} from "~/lib/dashboard-processing-session";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { ExperimentLinkCard } from "./experiment-link-card";
import { IngestStep } from "./ingest-step";
import {
  ExportPlaceholderStep,
  FitPlaceholderStep,
  RegionsStep,
} from "./regions-step";
import { ReduceStep } from "./reduce-step";
import { WorkspaceStepper } from "./workspace-stepper";

/**
 * ALS 5.3.2.2 STXM instrument workspace with session-backed step progress.
 */
export function Als5322WorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const utils = trpc.useUtils();
  const createSession = trpc.dashboardSessions.create.useMutation({
    onSuccess: ({ id }) => {
      router.replace(`/dashboard/instruments/als-5322?session=${id}`);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const sessionQuery = trpc.dashboardSessions.getById.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: Boolean(sessionId) },
  );

  const updateSession = trpc.dashboardSessions.update.useMutation({
    onSuccess: () => {
      if (sessionId) {
        void utils.dashboardSessions.getById.invalidate({ sessionId });
        void utils.dashboardSessions.list.invalidate();
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const [localScans, setLocalScans] = useState<StxmIngestScanRecord[] | null>(
    null,
  );

  const stepMetadata = sessionQuery.data?.stepMetadata;
  const linkedExperimentId = sessionQuery.data?.linkedExperimentId ?? null;
  const [activeStep, setActiveStep] = useState<DashboardWorkspaceStep>("ingest");

  useEffect(() => {
    if (stepMetadata?.activeStep) {
      setActiveStep(stepMetadata.activeStep);
    }
  }, [stepMetadata?.activeStep]);

  const ingestScans = useMemo(
    () => localScans ?? stepMetadata?.ingest?.scans ?? [],
    [localScans, stepMetadata?.ingest?.scans],
  );

  const gateState = useMemo(
    () => ({
      linkedExperimentId,
      stepMetadata: stepMetadata ?? defaultDashboardStepMetadata(),
    }),
    [linkedExperimentId, stepMetadata],
  );

  const persistStepMetadata = useCallback(
    async (nextMetadata: DashboardStepMetadata) => {
      if (!sessionId) {
        return;
      }
      await updateSession.mutateAsync({
        sessionId,
        stepMetadata: nextMetadata,
      });
      setLocalScans(null);
    },
    [sessionId, updateSession],
  );

  const persistIngest = useCallback(
    async (payload: {
      scans: StxmIngestScanRecord[];
      activeScanId: string | null;
      storageMode: StxmIngestStorageMode;
    }) => {
      const base = stepMetadata ?? defaultDashboardStepMetadata();
      await persistStepMetadata({
        ...base,
        activeStep: "ingest",
        ingest: {
          scans: payload.scans,
          storageMode: payload.storageMode,
          activeScanId: payload.activeScanId,
        },
      });
    },
    [persistStepMetadata, stepMetadata],
  );

  const persistRegions = useCallback(
    async (regions: DashboardRegionsStepMetadata) => {
      const base = stepMetadata ?? defaultDashboardStepMetadata();
      await persistStepMetadata({
        ...base,
        activeStep: "regions",
        regions,
      });
    },
    [persistStepMetadata, stepMetadata],
  );

  const persistReduce = useCallback(
    async (reduce: DashboardReduceStepMetadata) => {
      const base = stepMetadata ?? defaultDashboardStepMetadata();
      await updateSession.mutateAsync({
        sessionId: sessionId ?? "",
        status: "ready",
        stepMetadata: {
          ...base,
          activeStep: "reduce",
          reduce,
        },
      });
      setLocalScans(null);
    },
    [sessionId, stepMetadata, updateSession],
  );

  const handleTitleBlur = useCallback(
    (title: string) => {
      if (!sessionId || !title.trim()) {
        return;
      }
      updateSession.mutate({ sessionId, title: title.trim() });
    },
    [sessionId, updateSession],
  );

  const handleStepChange = useCallback(
    (step: DashboardWorkspaceStep) => {
      setActiveStep(step);
      if (sessionId && stepMetadata) {
        updateSession.mutate({
          sessionId,
          stepMetadata: { ...stepMetadata, activeStep: step },
        });
      }
    },
    [sessionId, stepMetadata, updateSession],
  );

  const stepContent = useMemo(() => {
    switch (activeStep) {
      case "ingest":
        return (
          <IngestStep
            experimentId={linkedExperimentId}
            scans={ingestScans}
            activeScanId={stepMetadata?.ingest?.activeScanId ?? null}
            storageMode={
              stepMetadata?.ingest?.storageMode ?? "session_metadata_pending"
            }
            onScansChange={setLocalScans}
            onPersistIngest={persistIngest}
            isSaving={updateSession.isPending}
          />
        );
      case "regions":
        return (
          <RegionsStep
            experimentId={linkedExperimentId}
            scans={ingestScans}
            regionsMetadata={stepMetadata?.regions}
            onPersistRegions={persistRegions}
            isSaving={updateSession.isPending}
          />
        );
      case "reduce":
        return (
          <ReduceStep
            experimentId={linkedExperimentId}
            scans={ingestScans}
            regionsMetadata={stepMetadata?.regions}
            reduceMetadata={stepMetadata?.reduce}
            onPersistReduce={persistReduce}
            isSaving={updateSession.isPending}
          />
        );
      case "fit":
        return <FitPlaceholderStep />;
      case "export":
        return <ExportPlaceholderStep />;
      default:
        return null;
    }
  }, [
    activeStep,
    ingestScans,
    linkedExperimentId,
    persistIngest,
    persistReduce,
    persistRegions,
    stepMetadata?.ingest?.activeScanId,
    stepMetadata?.ingest?.storageMode,
    stepMetadata?.reduce,
    stepMetadata?.regions,
    updateSession.isPending,
  ]);

  if (!sessionId) {
    return (
      <div className="flex flex-col gap-6">
        <WorkspaceHeader />
        <div className="border-border bg-surface rounded-lg border px-5 py-8">
          <p className="text-foreground text-sm font-medium">
            Start a processing session
          </p>
          <p className="text-muted mt-2 text-sm">
            Create a session to ingest ALS 5.3.2.2 STXM line scans.
          </p>
          <div className="mt-4">
            <Button
              variant="primary"
              size="sm"
              isDisabled={createSession.isPending}
              onPress={() => {
                createSession.mutate({
                  instrumentSlug: ALS_5322_INSTRUMENT_SLUG,
                });
              }}
            >
              {createSession.isPending ? (
                <>
                  <Spinner size="sm" />
                  Creating...
                </>
              ) : (
                "New session"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="flex flex-col gap-4">
        <WorkspaceHeader />
        <p className="text-danger text-sm">Session not found or unavailable.</p>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const session = sessionQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <WorkspaceHeader
        sessionTitle={session.title}
        onTitleBlur={handleTitleBlur}
      />

      <ExperimentLinkCard
        sessionId={session.id}
        linkedExperiment={session.linkedExperiment}
        onLinked={() => {
          void sessionQuery.refetch();
        }}
      />

      <WorkspaceStepper
        activeStep={activeStep}
        gateState={gateState}
        onStepChange={handleStepChange}
      />

      <section className="border-border bg-surface rounded-lg border px-5 py-5">
        {stepContent}
      </section>
    </div>
  );
}

function WorkspaceHeader({
  sessionTitle,
  onTitleBlur,
}: {
  sessionTitle?: string | null;
  onTitleBlur?: (title: string) => void;
}) {
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
        <div className="min-w-0 flex-1">
          <p className="text-muted text-sm">{ALS_5322_INSTRUMENT_LABEL}</p>
          {sessionTitle !== undefined && onTitleBlur ? (
            <TextField
              className="mt-1 max-w-xl"
              defaultValue={sessionTitle ?? ""}
              onBlur={(event) => onTitleBlur(event.target.value)}
            >
              <Label className="sr-only">Session title</Label>
              <Input placeholder="Session title" />
            </TextField>
          ) : (
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              {ALS_5322_INSTRUMENT_LABEL}
            </h1>
          )}
        </div>
      </div>
    </header>
  );
}
