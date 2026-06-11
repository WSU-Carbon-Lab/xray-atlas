"use client";

import { useCallback, type ReactNode } from "react";
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { cn } from "@heroui/styles";
import { Braces, ChevronDown, Hexagon, Pencil, Sparkles } from "lucide-react";

import { HeteroatomGridIcon } from "./heteroatom-tool-icon";

/** Workflow step ids mirrored by {@link WorkflowToolStrip}. */
export type DatabaseWorkflowStepId =
  | "draw"
  | "heteroatom"
  | "bookend"
  | "tidy";

/** Draw-step tab variants for {@link WorkflowToolStrip}. */
export type DatabaseWorkflowDrawVariant = "chain" | "double" | "ring";

/** Tidy-step tab variants for {@link TidyWorkflowHeaderControls}. */
export type DatabaseWorkflowTidyVariant = "before" | "after";

/** Layout density for workflow card header faux-toolbars. */
export type WorkflowHeaderControlsDensity = "default" | "compact";

/** Shared density prop for workflow step tool chips. */
export interface WorkflowToolChipProps {
  /** Tighter chip sizing for embedded contribute sketcher cards. */
  density?: WorkflowHeaderControlsDensity;
}

/** Props for {@link HeteroatomWorkflowToolChip}. */
export interface HeteroatomWorkflowToolChipProps extends WorkflowToolChipProps {
  /** When true, use the dark-theme CPK palette on heteroatom labels. */
  isDark?: boolean;
}

/** Props for {@link DrawWorkflowHeaderControls}. */
export interface DrawWorkflowHeaderControlsProps {
  /** Active draw-example variant synced with the mini depiction. */
  selectedVariant: DatabaseWorkflowDrawVariant;
  /** Called when the user picks chain, double-bond, or ring example. */
  onSelectedVariantChange: (variant: DatabaseWorkflowDrawVariant) => void;
  /** Tighter chip and toggle sizing for embedded contribute sketcher cards. */
  density?: WorkflowHeaderControlsDensity;
}

/** Props for {@link TidyWorkflowHeaderControls}. */
export interface TidyWorkflowHeaderControlsProps {
  /** Active tidy-example variant synced with the mini depiction. */
  selectedVariant: DatabaseWorkflowTidyVariant;
  /** Called when the user picks before or after abbreviation. */
  onSelectedVariantChange: (variant: DatabaseWorkflowTidyVariant) => void;
  /** Tighter chip and toggle sizing for embedded contribute sketcher cards. */
  density?: WorkflowHeaderControlsDensity;
}

function compactChipClass(density: WorkflowHeaderControlsDensity): string | undefined {
  return density === "compact" ? "h-6 min-w-6" : undefined;
}

function compactIconClass(density: WorkflowHeaderControlsDensity): string {
  return density === "compact" ? "h-3.5 w-3.5" : "h-4 w-4";
}

/**
 * Fixed row height for workflow step example toggles so depiction grids align
 * across cards with and without toggles.
 */
export function workflowExampleToggleRowHeightClass(
  density: WorkflowHeaderControlsDensity,
): string {
  return density === "compact" ? "h-6" : "h-7";
}

function workflowExampleToggleButtonClass(
  density: WorkflowHeaderControlsDensity,
) {
  const rowHeight = workflowExampleToggleRowHeightClass(density);
  const minWidth = density === "compact" ? "min-w-6" : "min-w-7";
  return cn(rowHeight, minWidth, "px-0.5");
}

function workflowExampleToggleGroupClass(
  density: WorkflowHeaderControlsDensity,
) {
  return cn(
    "border-border/60 bg-muted/20 inline-flex shrink-0 items-center rounded-md border p-px",
    workflowExampleToggleRowHeightClass(density),
  );
}

/** Left-indented toggle row under the step badge; reserves height when empty. */
export function WorkflowStepExampleToggleRow({
  density,
  children,
}: {
  density: WorkflowHeaderControlsDensity;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 items-center pl-7",
        workflowExampleToggleRowHeightClass(density),
      )}
      aria-hidden={children == null ? true : undefined}
    >
      {children}
    </div>
  );
}

/** Draw-step row-1 tool chip (pencil icon). */
export function DrawWorkflowToolChip({
  density = "default",
}: WorkflowToolChipProps) {
  return (
    <MiniToolChip
      highlighted
      label="Draw tool"
      className={compactChipClass(density)}
    >
      <Pencil className={compactIconClass(density)} aria-hidden />
    </MiniToolChip>
  );
}

/** Heteroatom-step row-1 tool chip (N/O/S/F grid). */
export function HeteroatomWorkflowToolChip({
  isDark = false,
  density = "default",
}: HeteroatomWorkflowToolChipProps) {
  return (
    <MiniToolChip
      highlighted
      dense
      label="Heteroatom tool"
      className={compactChipClass(density)}
    >
      <HeteroatomStepLabel isDark={isDark} />
    </MiniToolChip>
  );
}

/** Repeat-unit step row-1 tool chip (braces icon). */
export function BookendWorkflowToolChip({
  density = "default",
}: WorkflowToolChipProps) {
  return (
    <MiniToolChip
      highlighted
      label="Repeat unit tool"
      className={compactChipClass(density)}
    >
      <Braces className={compactIconClass(density)} aria-hidden />
    </MiniToolChip>
  );
}

/** Tidy-step row-1 tool chip (sparkles icon). */
export function TidyWorkflowToolChip({
  density = "default",
}: WorkflowToolChipProps) {
  return (
    <MiniToolChip
      highlighted
      label="Tidy for database"
      className={compactChipClass(density)}
    >
      <Sparkles className={compactIconClass(density)} aria-hidden />
    </MiniToolChip>
  );
}

/** Draw-step row-2 example toggle (chain, double bond, ring). */
export function DrawWorkflowExampleToggle({
  selectedVariant,
  onSelectedVariantChange,
  density = "default",
}: DrawWorkflowHeaderControlsProps) {
  const handleSelectionChange = useCallback(
    (keys: "all" | Iterable<string | number>) => {
      if (keys === "all") {
        return;
      }
      queueMicrotask(() => {
        for (const key of keys) {
          const id = String(key);
          if (
            id === "chain" ||
            id === "double" ||
            id === "ring"
          ) {
            onSelectedVariantChange(id);
          }
          return;
        }
      });
    },
    [onSelectedVariantChange],
  );

  const bondToggleButtonClass = cn(
    workflowExampleToggleRowHeightClass(density),
    density === "compact" ? "min-w-6" : "min-w-7",
    "px-0",
    "text-muted data-[selected=true]:text-accent",
  );
  const ringToggleButtonClass = cn(
    workflowExampleToggleButtonClass(density),
    "text-muted data-[selected=true]:text-accent",
  );

  return (
    <ToggleButtonGroup
      aria-label="Draw examples"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={new Set([selectedVariant])}
      onSelectionChange={handleSelectionChange}
      className={workflowExampleToggleGroupClass(density)}
    >
      <ToggleButton
        id="chain"
        size="sm"
        aria-label="Chain"
        className={bondToggleButtonClass}
      >
        <MiniBondGlyph kind="single" />
      </ToggleButton>
      <ToggleButton
        id="double"
        size="sm"
        aria-label="Double bond"
        className={bondToggleButtonClass}
      >
        <MiniBondGlyph kind="double" />
      </ToggleButton>
      <ToggleButton
        id="ring"
        size="sm"
        aria-label="Ring template"
        className={ringToggleButtonClass}
      >
        <Hexagon className={compactIconClass(density)} aria-hidden />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/** Tidy-step row-2 before/after example toggle. */
export function TidyWorkflowExampleToggle({
  selectedVariant,
  onSelectedVariantChange,
  density = "default",
}: TidyWorkflowHeaderControlsProps) {
  const handleSelectionChange = useCallback(
    (keys: "all" | Iterable<string | number>) => {
      if (keys === "all") {
        return;
      }
      queueMicrotask(() => {
        for (const key of keys) {
          const id = String(key);
          if (id === "before" || id === "after") {
            onSelectedVariantChange(id);
          }
          return;
        }
      });
    },
    [onSelectedVariantChange],
  );

  const toggleButtonClass = cn(
    workflowExampleToggleButtonClass(density),
    "text-[10px] font-medium tabular-nums",
    "text-muted data-[selected=true]:text-accent",
  );

  return (
    <ToggleButtonGroup
      aria-label="Tidy layout examples"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={new Set([selectedVariant])}
      onSelectionChange={handleSelectionChange}
      className={workflowExampleToggleGroupClass(density)}
    >
      <ToggleButton
        id="before"
        size="sm"
        aria-label="Before abbreviation"
        className={toggleButtonClass}
      >
        {density === "compact" ? "B" : "Before"}
      </ToggleButton>
      <ToggleButton
        id="after"
        size="sm"
        aria-label="After abbreviation"
        className={toggleButtonClass}
      >
        {density === "compact" ? "A" : "After"}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/**
 * Tidy-step card header: sparkles tool chip plus a before/after example toggle.
 * Prefer {@link TidyWorkflowToolChip} and {@link TidyWorkflowExampleToggle} for
 * two-row step card layouts.
 */
export function TidyWorkflowHeaderControls({
  selectedVariant,
  onSelectedVariantChange,
  density = "default",
}: TidyWorkflowHeaderControlsProps) {
  return (
    <WorkflowStepHeaderControls
      density={density}
      chip={<TidyWorkflowToolChip density={density} />}
      toggle={
        <TidyWorkflowExampleToggle
          selectedVariant={selectedVariant}
          onSelectedVariantChange={onSelectedVariantChange}
          density={density}
        />
      }
    />
  );
}

/**
 * Draw-step card header: pencil tool chip plus a three-way bond/ring example toggle.
 * Prefer {@link DrawWorkflowToolChip} and {@link DrawWorkflowExampleToggle} for
 * two-row step card layouts.
 */
export function DrawWorkflowHeaderControls({
  selectedVariant,
  onSelectedVariantChange,
  density = "default",
}: DrawWorkflowHeaderControlsProps) {
  return (
    <WorkflowStepHeaderControls
      density={density}
      chip={<DrawWorkflowToolChip density={density} />}
      toggle={
        <DrawWorkflowExampleToggle
          selectedVariant={selectedVariant}
          onSelectedVariantChange={onSelectedVariantChange}
          density={density}
        />
      }
    />
  );
}

/** Props for {@link WorkflowStepHeaderControls}. */
export interface WorkflowStepHeaderControlsProps {
  /** Row-1 faux tool chip shown beside the step title. */
  chip: ReactNode;
  /** Optional row-2 example toggle; row height is reserved when omitted. */
  toggle?: ReactNode;
  /** Matches example toggle sizing for a consistent two-row header block. */
  density?: WorkflowHeaderControlsDensity;
}

/**
 * Two-row workflow step header: tool chip on row 1, optional example toggle on
 * row 2. Row 2 always reserves toggle height so depictions align across steps.
 */
export function WorkflowStepHeaderControls({
  chip,
  toggle,
  density = "default",
}: WorkflowStepHeaderControlsProps) {
  return (
    <div className="flex min-w-0 max-w-full flex-col items-end gap-1">
      <div className="flex shrink-0 items-center justify-end">{chip}</div>
      <div
        className={cn(
          "flex min-w-0 shrink-0 items-center justify-end",
          workflowExampleToggleRowHeightClass(density),
        )}
        aria-hidden={toggle == null ? true : undefined}
      >
        {toggle}
      </div>
    </div>
  );
}

/** Props for {@link WorkflowToolStrip}. */
export interface WorkflowToolStripProps {
  /** Which database-build step toolbar controls to preview. */
  stepId: DatabaseWorkflowStepId;
  /** Draw-step illustration variant when `stepId` is `draw`. */
  drawVariant?: DatabaseWorkflowDrawVariant;
  /** When true, use the dark-theme CPK palette on heteroatom labels. */
  isDark?: boolean;
  /** When true, render chips inline without the bordered strip shell. */
  inline?: boolean;
}

interface MiniToolChipProps {
  /** When true, applies accent highlight matching an active draw-lab control. */
  highlighted?: boolean;
  /** When true, omits horizontal padding so a full-size grid glyph fills the chip. */
  dense?: boolean;
  /** Accessible label for the faux control. */
  label: string;
  /** Optional size or layout overrides for compact card headers. */
  className?: string;
  children: ReactNode;
}

function MiniToolChip({
  highlighted = false,
  dense = false,
  label,
  className,
  children,
}: MiniToolChipProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex h-7 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-md border px-1 transition-colors",
        dense && "px-0",
        highlighted
          ? "border-accent/50 bg-accent-soft text-accent shadow-[0_0_0_1px] shadow-accent/25"
          : "border-border/80 bg-surface text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function MiniChevron() {
  return <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />;
}

/**
 * Compact diagonal bond preview for workflow example toggles (~12px).
 * Lines run bottom-left to top-right so bonds read clearly at h-6 button size.
 */
function MiniBondGlyph({ kind }: { kind: "single" | "double" }) {
  const stroke = "currentColor";
  const common = {
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
  };

  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      aria-hidden
      className="shrink-0"
    >
      {kind === "single" ? (
        <line x1={2} y1={10} x2={10} y2={2} {...common} />
      ) : (
        <>
          <line x1={1.5} y1={9.5} x2={9.5} y2={1.5} {...common} />
          <line x1={2.5} y1={10.5} x2={10.5} y2={2.5} {...common} />
        </>
      )}
    </svg>
  );
}

function StripShell({
  inline = false,
  children,
}: {
  inline?: boolean;
  children: ReactNode;
}) {
  if (inline) {
    return (
      <span
        className="inline-flex flex-wrap items-center gap-0.5"
        aria-hidden
      >
        {children}
      </span>
    );
  }

  return (
    <div
      className="border-border bg-muted/30 flex flex-wrap items-center gap-0.5 rounded-md border px-0.5 py-0.5"
      aria-hidden
    >
      {children}
    </div>
  );
}

/** Workflow step title glyph; delegates to {@link HeteroatomGridIcon}. */
export function HeteroatomStepLabel({ isDark }: { isDark: boolean }) {
  return <HeteroatomGridIcon isDark={isDark} size="xs" />;
}

/**
 * Renders a compact faux-toolbar row mirroring draw-lab controls for one
 * database-build workflow step.
 */
export function WorkflowToolStrip({
  stepId,
  drawVariant = "chain",
  isDark = false,
  inline = false,
}: WorkflowToolStripProps) {
  switch (stepId) {
    case "draw":
      return (
        <StripShell inline={inline}>
          <DrawWorkflowToolChip />
          {drawVariant === "ring" ? (
            <MiniToolChip highlighted label="Ring templates">
              <Hexagon className="h-4 w-4" aria-hidden />
              <MiniChevron />
            </MiniToolChip>
          ) : (
            <MiniToolChip highlighted label="Bond type">
              <MiniBondGlyph kind={drawVariant === "double" ? "double" : "single"} />
              <MiniChevron />
            </MiniToolChip>
          )}
        </StripShell>
      );
    case "heteroatom":
      return (
        <StripShell inline={inline}>
          <HeteroatomWorkflowToolChip isDark={isDark} />
        </StripShell>
      );
    case "bookend":
      return (
        <StripShell inline={inline}>
          <BookendWorkflowToolChip />
        </StripShell>
      );
    case "tidy":
      return (
        <StripShell inline={inline}>
          <TidyWorkflowToolChip />
        </StripShell>
      );
    default: {
      const exhaustive: never = stepId;
      return exhaustive;
    }
  }
}
