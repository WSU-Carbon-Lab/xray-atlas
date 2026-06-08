"use client";

import { cn } from "@heroui/styles";
import {
  DASHBOARD_WORKSPACE_STEP_LABELS,
  DASHBOARD_WORKSPACE_STEPS,
  dashboardStepLockReason,
  isDashboardStepEnabled,
  type DashboardStepGateState,
  type DashboardWorkspaceStep,
} from "~/lib/dashboard-processing-session";

type WorkspaceStepperProps = {
  activeStep: DashboardWorkspaceStep;
  gateState: DashboardStepGateState;
  onStepChange?: (step: DashboardWorkspaceStep) => void;
};

/**
 * Horizontal stepper for the STXM instrument workspace pipeline with step gating.
 */
export function WorkspaceStepper({
  activeStep,
  gateState,
  onStepChange,
}: WorkspaceStepperProps) {
  const activeIndex = DASHBOARD_WORKSPACE_STEPS.indexOf(activeStep);

  return (
    <nav aria-label="Processing steps" className="w-full">
      <ol className="flex flex-wrap gap-2 sm:gap-0">
        {DASHBOARD_WORKSPACE_STEPS.map((step, index) => {
          const isActive = step === activeStep;
          const isComplete = index < activeIndex;
          const label = DASHBOARD_WORKSPACE_STEP_LABELS[step];
          const enabled = isDashboardStepEnabled(step, gateState);
          const lockReason = dashboardStepLockReason(step, gateState);
          const isInteractive = onStepChange !== undefined && enabled;

          return (
            <li
              key={step}
              className="flex min-w-0 flex-1 items-center gap-2 sm:gap-0"
            >
              <button
                type="button"
                disabled={!isInteractive}
                title={!enabled ? (lockReason ?? undefined) : undefined}
                onClick={() => {
                  if (enabled) {
                    onStepChange?.(step);
                  }
                }}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors sm:px-3",
                  isActive
                    ? "bg-accent/10 text-accent font-medium"
                    : isComplete
                      ? "text-foreground"
                      : "text-muted",
                  !enabled && "cursor-not-allowed opacity-50",
                  !isInteractive && enabled && "cursor-default",
                )}
                aria-current={isActive ? "step" : undefined}
                aria-disabled={!enabled}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : isComplete
                        ? "bg-default text-foreground"
                        : "bg-default/60 text-muted",
                  )}
                >
                  {index + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
              {index < DASHBOARD_WORKSPACE_STEPS.length - 1 ? (
                <span
                  className="bg-border mx-1 hidden h-px flex-1 sm:block"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
