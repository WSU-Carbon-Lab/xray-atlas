"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Accordion } from "@heroui/react";
import { cn } from "@heroui/styles";
import { useTheme } from "next-themes";

import {
  BookendWorkflowExample,
  DrawWorkflowExample,
  HeteroatomWorkflowExample,
  TidyWorkflowExample,
} from "./workflow-depiction-examples";
import {
  BookendWorkflowToolChip,
  DrawWorkflowExampleToggle,
  DrawWorkflowToolChip,
  HeteroatomWorkflowToolChip,
  TidyWorkflowExampleToggle,
  TidyWorkflowToolChip,
  WorkflowStepExampleToggleRow,
  workflowExampleToggleRowHeightClass,
  type DatabaseWorkflowDrawVariant,
  type DatabaseWorkflowStepId,
  type DatabaseWorkflowTidyVariant,
  type WorkflowHeaderControlsDensity,
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

/** Visual density for {@link DatabaseBuildWorkflowHint}. */
export type DatabaseBuildWorkflowHintVariant = "default" | "compact";

/** Props for {@link DatabaseBuildWorkflowHint}. */
export interface DatabaseBuildWorkflowHintProps {
  /**
   * `compact` collapses the panel by default and tightens step cards for
   * embedded contribute sketcher layouts on narrow viewports.
   */
  variant?: DatabaseBuildWorkflowHintVariant;
}

function StepToolChip({
  stepId,
  isDark,
  density,
}: {
  stepId: DatabaseWorkflowStepId;
  isDark: boolean;
  density: WorkflowHeaderControlsDensity;
}) {
  switch (stepId) {
    case "draw":
      return <DrawWorkflowToolChip density={density} />;
    case "heteroatom":
      return <HeteroatomWorkflowToolChip isDark={isDark} density={density} />;
    case "bookend":
      return <BookendWorkflowToolChip density={density} />;
    case "tidy":
      return <TidyWorkflowToolChip density={density} />;
    default: {
      const exhaustive: never = stepId;
      return exhaustive;
    }
  }
}

function StepExampleToggle({
  stepId,
  drawTab,
  tidyTab,
  onDrawTabChange,
  onTidyTabChange,
  density,
}: {
  stepId: DatabaseWorkflowStepId;
  drawTab: DatabaseWorkflowDrawVariant;
  tidyTab: DatabaseWorkflowTidyVariant;
  onDrawTabChange: (tab: DatabaseWorkflowDrawVariant) => void;
  onTidyTabChange: (tab: DatabaseWorkflowTidyVariant) => void;
  density: WorkflowHeaderControlsDensity;
}) {
  switch (stepId) {
    case "draw":
      return (
        <DrawWorkflowExampleToggle
          selectedVariant={drawTab}
          onSelectedVariantChange={onDrawTabChange}
          density={density}
        />
      );
    case "tidy":
      return (
        <TidyWorkflowExampleToggle
          selectedVariant={tidyTab}
          onSelectedVariantChange={onTidyTabChange}
          density={density}
        />
      );
    case "heteroatom":
    case "bookend":
      return null;
    default: {
      const exhaustive: never = stepId;
      return exhaustive;
    }
  }
}

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

interface WorkflowStepsListProps {
  drawTab: DatabaseWorkflowDrawVariant;
  tidyTab: DatabaseWorkflowTidyVariant;
  isDark: boolean;
  onDrawTabChange: (tab: DatabaseWorkflowDrawVariant) => void;
  onTidyTabChange: (tab: DatabaseWorkflowTidyVariant) => void;
  variant: DatabaseBuildWorkflowHintVariant;
}

function WorkflowStepsList({
  drawTab,
  tidyTab,
  isDark,
  onDrawTabChange,
  onTidyTabChange,
  variant,
}: WorkflowStepsListProps) {
  const isCompact = variant === "compact";
  const headerDensity: WorkflowHeaderControlsDensity = isCompact
    ? "compact"
    : "default";

  return (
    <ol
      className={cn(
        "flex min-w-0 items-stretch gap-2 overflow-x-auto pb-0.5",
        isCompact ? "mt-2" : "mt-3 gap-3",
        "lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible",
      )}
    >
      {DATABASE_BUILD_STEPS.map((step, index) => (
        <li
          key={step.id}
          className={cn(
            "@container/workflow-step border-border/80 bg-surface/90 flex flex-col rounded-lg border shadow-sm",
            isCompact
              ? "min-w-[11rem] flex-1 gap-1.5 p-2"
              : "min-w-[13.5rem] flex-1 gap-2 p-2.5",
            "lg:min-w-0",
            "transition-[box-shadow,border-color] duration-200",
            "hover:border-accent/25 hover:shadow-md",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 shrink-0 flex-col gap-1",
              isCompact ? "min-h-[3.25rem]" : "min-h-[3.75rem]",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-x-2",
                workflowExampleToggleRowHeightClass(headerDensity),
              )}
            >
              <StepBadge stepNumber={index + 1} />
              <span className="text-foreground min-w-0 flex-1 truncate text-xs font-medium">
                {step.title}
              </span>
              <StepToolChip
                stepId={step.id}
                isDark={isDark}
                density={headerDensity}
              />
            </div>
            <WorkflowStepExampleToggleRow density={headerDensity}>
              <StepExampleToggle
                stepId={step.id}
                drawTab={drawTab}
                tidyTab={tidyTab}
                onDrawTabChange={onDrawTabChange}
                onTidyTabChange={onTidyTabChange}
                density={headerDensity}
              />
            </WorkflowStepExampleToggleRow>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {step.id === "draw" ? (
              <DrawWorkflowExample isDark={isDark} selectedTab={drawTab} />
            ) : step.id === "tidy" ? (
              <TidyWorkflowExample isDark={isDark} selectedTab={tidyTab} />
            ) : (
              <step.Example isDark={isDark} />
            )}
          </div>
          <p
            className={cn(
              "text-muted leading-snug",
              isCompact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {step.caption}
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Compact single-row workflow for building an Atlas-ready molecule in the draw lab.
 * Multi-view steps use internal tabs; each step shows a mini OCL illustration.
 */
export function DatabaseBuildWorkflowHint({
  variant = "default",
}: DatabaseBuildWorkflowHintProps) {
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
  const isCompact = variant === "compact";

  const stepsList = (
    <WorkflowStepsList
      drawTab={drawTab}
      tidyTab={tidyTab}
      isDark={isDark}
      onDrawTabChange={handleDrawTabChange}
      onTidyTabChange={handleTidyTabChange}
      variant={variant}
    />
  );

  if (isCompact) {
    return (
      <div
        className={cn(
          "border-accent/25 relative overflow-hidden rounded-xl border",
          "from-accent-soft/25 via-surface to-muted/20 bg-gradient-to-br",
          "px-3 py-2 shadow-sm",
        )}
        aria-label="Database build workflow"
      >
        <div
          className="via-accent/35 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
          aria-hidden
        />
        <Accordion allowsMultipleExpanded defaultExpandedKeys={[]}>
          <Accordion.Item id="database-build">
            <Accordion.Heading>
              <Accordion.Trigger className="text-foreground py-1 text-sm font-semibold tracking-tight">
                Database build
                <Accordion.Indicator className="text-muted ml-auto shrink-0 [&>svg]:size-4" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pt-0 pb-1">{stepsList}</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    );
  }

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
      {stepsList}
    </div>
  );
}
