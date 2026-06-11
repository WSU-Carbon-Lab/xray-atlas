"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@heroui/styles";
import { useTheme } from "next-themes";

import {
  BookendWorkflowExample,
  DrawWorkflowExample,
  HeteroatomWorkflowExample,
  TidyWorkflowExample,
} from "./workflow-depiction-examples";
import {
  DrawWorkflowHeaderControls,
  TidyWorkflowHeaderControls,
  WorkflowToolStrip,
  type DatabaseWorkflowDrawVariant,
  type DatabaseWorkflowStepId,
  type DatabaseWorkflowTidyVariant,
} from "./workflow-tool-strip";

const DATABASE_BUILD_STEPS: ReadonlyArray<{
  id: DatabaseWorkflowStepId;
  title: string;
  caption: string;
  Example: (props: { isDark: boolean }) => ReactNode;
}> = [
  {
    id: "draw",
    title: "Draw",
    caption: "Sketch chains and rings",
    Example: DrawWorkflowExample,
  },
  {
    id: "heteroatom",
    title: "Heteroatom",
    caption: "Swap in N, O, S, F",
    Example: HeteroatomWorkflowExample,
  },
  {
    id: "bookend",
    title: "Repeat unit",
    caption: "Mark repeat-unit bonds",
    Example: BookendWorkflowExample,
  },
  {
    id: "tidy",
    title: "Tidy layout",
    caption: "Abbreviate long tails",
    Example: TidyWorkflowExample,
  },
];

function StepBadge({ stepNumber }: { stepNumber: number }) {
  return (
    <span
      className="bg-accent-soft text-accent inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
      aria-hidden
    >
      {stepNumber}
    </span>
  );
}

/**
 * Compact single-row workflow for building an Atlas-ready molecule in the draw lab.
 * Multi-view steps use internal tabs; each step shows a mini OCL illustration.
 */
export function DatabaseBuildWorkflowHint() {
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const [drawTab, setDrawTab] = useState<DatabaseWorkflowDrawVariant>("chain");
  const [tidyTab, setTidyTab] = useState<DatabaseWorkflowTidyVariant>("after");

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handleDrawTabChange = useCallback((tab: DatabaseWorkflowDrawVariant) => {
    setDrawTab(tab);
  }, []);

  const handleTidyTabChange = useCallback((tab: DatabaseWorkflowTidyVariant) => {
    setTidyTab(tab);
  }, []);

  const isDark = themeMounted && resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "border-accent/25 relative overflow-hidden rounded-xl border",
        "from-accent-soft/25 via-surface to-muted/20 bg-gradient-to-br",
        "px-4 py-3 shadow-sm",
      )}
      aria-label="Database build workflow"
    >
      <div
        className="via-accent/35 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        aria-hidden
      />
      <p className="text-foreground text-sm font-semibold tracking-tight">
        Database build
      </p>
      <ol
        className={cn(
          "mt-3 flex min-w-0 items-stretch gap-3 overflow-x-auto pb-0.5",
          "lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible",
        )}
      >
        {DATABASE_BUILD_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "border-border/80 bg-surface/90 flex min-w-[13.5rem] flex-1 flex-col gap-2 rounded-lg border p-2.5 shadow-sm",
              "lg:min-w-0",
              "transition-[box-shadow,border-color] duration-200",
              "hover:border-accent/25 hover:shadow-md",
            )}
          >
            <div className="flex min-h-7 flex-nowrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <StepBadge stepNumber={index + 1} />
                <span className="text-foreground shrink-0 text-xs font-medium">
                  {step.title}
                </span>
              </div>
              {step.id === "draw" ? (
                <DrawWorkflowHeaderControls
                  selectedVariant={drawTab}
                  onSelectedVariantChange={handleDrawTabChange}
                />
              ) : step.id === "tidy" ? (
                <TidyWorkflowHeaderControls
                  selectedVariant={tidyTab}
                  onSelectedVariantChange={handleTidyTabChange}
                />
              ) : (
                <WorkflowToolStrip stepId={step.id} isDark={isDark} inline />
              )}
            </div>
            {step.id === "draw" ? (
              <DrawWorkflowExample isDark={isDark} selectedTab={drawTab} />
            ) : step.id === "tidy" ? (
              <TidyWorkflowExample isDark={isDark} selectedTab={tidyTab} />
            ) : (
              <step.Example isDark={isDark} />
            )}
            <p className="text-muted text-[11px] leading-snug">{step.caption}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
