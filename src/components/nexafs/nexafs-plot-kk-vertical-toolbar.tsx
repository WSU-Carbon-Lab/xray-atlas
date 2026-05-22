"use client";

import { Button, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarAttachedToolbarVerticalClass,
  plotToolbarGlyphToggleGroupItemVerticalClass,
  PlotToolbarRichHint,
} from "~/components/plots/toolbars";

/**
 * Vertical attached toolbar with a single **KK** control (recompute delta from beta in the
 * browser). Callers own consent, eligibility, loading state, and side effects; this module only
 * renders HeroUI chrome consistent with other plot rails.
 */
export interface NexafsPlotKkVerticalToolbarProps {
  /** When false, the toolbar is not rendered (callers hide when KK is impossible or irrelevant). */
  readonly visible: boolean;
  /** When true, disables the KK control (heavy KK work in flight or server mutation pending). */
  readonly busy: boolean;
  /**
   * Invoked when the user activates **KK**; should open the session consent dialog when needed,
   * then run the KK pipeline (upload drafts vs persisted experiments are caller-defined).
   */
  readonly onPressKk: () => void;
  /** Rail layout: vertical on the analysis stack, horizontal on the bottom deck. */
  readonly orientation?: "vertical" | "horizontal";
}

export function NexafsPlotKkVerticalToolbar({
  visible,
  busy,
  onPressKk,
  orientation = "vertical",
}: NexafsPlotKkVerticalToolbarProps) {
  if (!visible) {
    return null;
  }

  const isHorizontal = orientation === "horizontal";

  return (
    <Toolbar
      isAttached
      orientation={orientation}
      aria-label="Kramers Kronig delta tools"
      className={
        isHorizontal
          ? plotToolbarAttachedToolbarHorizontalClass
          : plotToolbarAttachedToolbarVerticalClass
      }
    >
      <PlotToolbarRichHint
        title="KK"
        description="Recompute delta from beta in-browser (consent once). Drafts update locally; experiments may save on the server when permitted."
        whenDisabledDescription="Wait for the current KK calculation or save to finish."
        placement={isHorizontal ? "top" : "left"}
        disabled={busy}
      >
        <Button
          type="button"
          variant="tertiary"
          aria-label="Recalculate Kramers Kronig delta from beta"
          onPress={onPressKk}
          isDisabled={busy}
          className={cn(
            plotToolbarGlyphToggleGroupItemVerticalClass,
            "min-h-9 min-w-0 rounded-full px-2 text-xs font-semibold",
          )}
        >
          KK
        </Button>
      </PlotToolbarRichHint>
    </Toolbar>
  );
}
