"use client";

import { Button, Label, Switch, Tooltip } from "@heroui/react";
import { ChevronDown, Sparkles } from "lucide-react";
import { buttonVariants, cn } from "@heroui/styles";

import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";

/** Props for {@link DatabasePrepSection}. */
export interface DatabasePrepSectionProps {
  /** True when the canvas holds at least one atom. */
  hasStructure: boolean;
  /** When true, primary prep and snapshots also compact whitespace. */
  compactSpacing: boolean;
  /** Toggles optional whitespace compaction for prep and snapshots. */
  onCompactSpacingChange: (enabled: boolean) => void;
  /** Abbreviates alkyl tails and nitriles, then stabilizes bond angles (one undo step). */
  onPrepareForDatabase: () => void;
  /** Scales coordinates about the centroid without abbreviating labels. */
  onTidySpacing: () => void;
  /** Expands abbreviated alkyl labels back to full chains (advanced undo recovery). */
  onExpandAlkyl: () => void;
  /** Non-blocking upload-prep hints for the current drawing. */
  prepWarnings: readonly string[];
}

/**
 * Unified upload-prep controls for the draw lab: one primary database-prep
 * action, optional compact spacing, and advanced alkyl expand in a chevron menu.
 */
export function DatabasePrepSection({
  hasStructure,
  compactSpacing,
  onCompactSpacingChange,
  onPrepareForDatabase,
  onTidySpacing,
  onExpandAlkyl,
  prepWarnings,
}: DatabasePrepSectionProps) {
  return (
    <div className="border-border space-y-3 rounded-lg border p-3">
      <div>
        <p className="text-foreground text-sm font-medium">Database prep</p>
        <p className="text-muted mt-1 max-w-2xl text-xs">
          Prepare for Atlas upload: abbreviate long alkyl tails and nitrile groups
          while keeping your chosen rotation and layout. Enable compact layout to
          tighten whitespace during prep and snapshot generation.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip delay={300}>
          <Tooltip.Trigger>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onPress={onPrepareForDatabase}
              isDisabled={!hasStructure}
              aria-label="Prepare for database"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Prepare for database
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" className="max-w-xs">
            Abbreviate alkyl tails and nitriles (CN) without re-orienting the
            drawing. Includes compact spacing when that option is enabled.
          </Tooltip.Content>
        </Tooltip>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={onTidySpacing}
          isDisabled={!hasStructure}
        >
          Tidy spacing
        </Button>

        <Switch
          isSelected={compactSpacing}
          onChange={onCompactSpacingChange}
          size="sm"
          isDisabled={!hasStructure}
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <Label className="text-xs">Compact layout</Label>
          </Switch.Content>
        </Switch>

        <PopoverMenu
          placement="bottom-start"
          renderTrigger={({ triggerProps, isOpen }) => (
            <button
              type="button"
              {...triggerProps}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "inline-flex items-center gap-1 text-xs",
              )}
              aria-label="Advanced database prep"
              disabled={!hasStructure}
            >
              Advanced
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                aria-hidden
              />
            </button>
          )}
          renderContent={({ close, contentProps, contentPositionClassName }) => (
            <PopoverMenuContent
              {...contentProps}
              className={cn(contentPositionClassName, "w-52 p-1")}
            >
              <p className="text-muted px-2 py-1 text-xs font-medium">Advanced</p>
              <button
                type="button"
                className="hover:bg-default text-foreground w-full rounded-md px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  onExpandAlkyl();
                  close();
                }}
              >
                Expand abbreviated tails
              </button>
            </PopoverMenuContent>
          )}
        />
      </div>
      {prepWarnings.length > 0 ? (
        <ul className="text-muted list-disc space-y-1 pl-5 text-xs" role="status">
          {prepWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : hasStructure ? (
        <p className="text-muted text-xs" role="status">
          Upload prep looks ready: abbreviations applied and layout accepted as drawn.
        </p>
      ) : null}
    </div>
  );
}
