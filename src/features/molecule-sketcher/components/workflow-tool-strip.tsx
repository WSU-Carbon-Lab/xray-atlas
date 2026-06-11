"use client";

import { useCallback, type ReactNode } from "react";
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { cn } from "@heroui/styles";
import { Braces, ChevronDown, Hexagon, Pencil, Sparkles } from "lucide-react";

import { BondKindGlyph } from "./bond-kind-glyph";
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

/** Props for {@link DrawWorkflowHeaderControls}. */
export interface DrawWorkflowHeaderControlsProps {
  /** Active draw-example variant synced with the mini depiction. */
  selectedVariant: DatabaseWorkflowDrawVariant;
  /** Called when the user picks chain, double-bond, or ring example. */
  onSelectedVariantChange: (variant: DatabaseWorkflowDrawVariant) => void;
}

/** Props for {@link TidyWorkflowHeaderControls}. */
export interface TidyWorkflowHeaderControlsProps {
  /** Active tidy-example variant synced with the mini depiction. */
  selectedVariant: DatabaseWorkflowTidyVariant;
  /** Called when the user picks before or after abbreviation. */
  onSelectedVariantChange: (variant: DatabaseWorkflowTidyVariant) => void;
}

/**
 * Tidy-step card header: sparkles tool chip plus a before/after example toggle.
 */
export function TidyWorkflowHeaderControls({
  selectedVariant,
  onSelectedVariantChange,
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

  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-0.5">
      <MiniToolChip highlighted label="Tidy for database">
        <Sparkles className="h-4 w-4" aria-hidden />
      </MiniToolChip>
      <ToggleButtonGroup
        aria-label="Tidy layout examples"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set([selectedVariant])}
        onSelectionChange={handleSelectionChange}
        className="h-7 items-center gap-0"
      >
        <ToggleButton
          id="before"
          size="sm"
          aria-label="Before abbreviation"
          className="h-7 min-h-7 min-w-0 px-1 text-[9px] font-medium"
        >
          Before
        </ToggleButton>
        <ToggleButton
          id="after"
          size="sm"
          aria-label="After abbreviation"
          className="h-7 min-h-7 min-w-0 px-1 text-[9px] font-medium"
        >
          After
        </ToggleButton>
      </ToggleButtonGroup>
    </span>
  );
}

/**
 * Draw-step card header: pencil tool chip plus a three-way bond/ring example toggle.
 */
export function DrawWorkflowHeaderControls({
  selectedVariant,
  onSelectedVariantChange,
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

  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-0.5">
      <MiniToolChip highlighted label="Draw tool">
        <Pencil className="h-4 w-4" aria-hidden />
      </MiniToolChip>
      <ToggleButtonGroup
        aria-label="Draw examples"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set([selectedVariant])}
        onSelectionChange={handleSelectionChange}
        className="h-7 items-center gap-0"
      >
        <ToggleButton
          id="chain"
          size="sm"
          aria-label="Chain"
          className="h-7 min-h-7 min-w-7 px-0.5"
        >
          <MiniBondGlyph kind="single" />
        </ToggleButton>
        <ToggleButton
          id="double"
          size="sm"
          aria-label="Double bond"
          className="h-7 min-h-7 min-w-7 px-0.5"
        >
          <MiniBondGlyph kind="double" />
        </ToggleButton>
        <ToggleButton
          id="ring"
          size="sm"
          aria-label="Ring template"
          className="h-7 min-h-7 min-w-7 px-0.5"
        >
          <Hexagon className="h-4 w-4" aria-hidden />
        </ToggleButton>
      </ToggleButtonGroup>
    </span>
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
  children: ReactNode;
}

function MiniToolChip({
  highlighted = false,
  dense = false,
  label,
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
      )}
    >
      {children}
    </span>
  );
}

function MiniChevron() {
  return <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />;
}

function MiniBondGlyph({ kind }: { kind: "single" | "double" }) {
  return (
    <span className="flex h-4 w-4 items-center justify-center overflow-hidden">
      <span className="origin-center scale-[0.5]">
        <BondKindGlyph kind={kind} />
      </span>
    </span>
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
          <MiniToolChip highlighted label="Draw tool">
            <Pencil className="h-4 w-4" aria-hidden />
          </MiniToolChip>
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
          <MiniToolChip highlighted dense label="Heteroatom tool">
            <HeteroatomStepLabel isDark={isDark} />
          </MiniToolChip>
        </StripShell>
      );
    case "bookend":
      return (
        <StripShell inline={inline}>
          <MiniToolChip highlighted label="Repeat unit tool">
            <Braces className="h-4 w-4" aria-hidden />
          </MiniToolChip>
        </StripShell>
      );
    case "tidy":
      return (
        <StripShell inline={inline}>
          <MiniToolChip highlighted label="Tidy for database">
            <Sparkles className="h-4 w-4" aria-hidden />
          </MiniToolChip>
        </StripShell>
      );
    default: {
      const exhaustive: never = stepId;
      return exhaustive;
    }
  }
}
