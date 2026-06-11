"use client";

import { Button, Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { BrushCleaning } from "lucide-react";

export type ContributeClearFormButtonProps = {
  /** Invoked when the user clears the contribute form. */
  onPress: () => void;
  /** Disables the control when the form cannot be cleared. */
  isDisabled?: boolean;
  /** Accessible name; defaults to "Clear form". */
  "aria-label"?: string;
  /** Optional layout or placement classes on the pill button. */
  className?: string;
  /**
   * Tooltip body shown on hover or focus; defaults to a generic reset message.
   */
  tooltipDescription?: string;
};

const DEFAULT_ARIA_LABEL = "Clear form";
const DEFAULT_TOOLTIP =
  "Clear form fields and reset the contribute workflow";

const CLEAR_FORM_BUTTON_CLASS =
  "border-border bg-surface text-foreground hover:bg-default gap-2 rounded-lg border px-3 py-2 text-sm font-medium";

/**
 * Bordered pill control for resetting contribute upload and registry forms.
 * Matches the NEXAFS contribute header clear affordance (broom icon + label).
 */
export function ContributeClearFormButton({
  onPress,
  isDisabled = false,
  "aria-label": ariaLabel = DEFAULT_ARIA_LABEL,
  className,
  tooltipDescription = DEFAULT_TOOLTIP,
}: ContributeClearFormButtonProps) {
  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onPress={onPress}
          isDisabled={isDisabled}
          aria-label={ariaLabel}
          className={cn(CLEAR_FORM_BUTTON_CLASS, className)}
        >
          <BrushCleaning className="h-4 w-4 shrink-0" aria-hidden="true" />
          Clear Form
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg">
        {tooltipDescription}
      </Tooltip.Content>
    </Tooltip>
  );
}
