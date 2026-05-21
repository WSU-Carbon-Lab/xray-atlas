/**
 * Shared Tailwind class strings for spectrum plot toolbars (attached chrome, toggles, tooltip copy styling).
 *
 * Visual hierarchy: elevated attached shell (light surface pill, dark black pill); segment fills use
 * theme greys (idle, hover, disabled) and accent when selected.
 */

const plotToolbarToggleSelectedClass =
  "data-[selected=true]:!bg-(--accent) data-[selected=true]:text-(--accent-foreground) data-[selected=true]:[&_svg]:text-(--accent-foreground) data-[selected=true]:shadow-sm";

/** Idle segment fill: light inset on surface shell; dark grey on black shell. */
const plotToolbarSegmentIdleFill =
  "!bg-background dark:!bg-(--surface-2)";

/** Hover on unselected segments. */
const plotToolbarSegmentHoverFill =
  "hover:!bg-(--surface-2) data-[hovered=true]:data-[selected=false]:!bg-(--surface-2) dark:hover:!bg-(--surface-3) dark:data-[hovered=true]:data-[selected=false]:!bg-(--surface-3)";

/** Disabled segment fill: readable icon contrast in both themes. */
const plotToolbarSegmentDisabledFill =
  "data-[disabled=true]:!bg-(--surface-3) data-[disabled=true]:text-(--text-tertiary) data-[disabled=true]:[&_svg]:text-(--text-tertiary) dark:data-[disabled=true]:!bg-(--surface-1) dark:data-[disabled=true]:text-(--text-secondary) dark:data-[disabled=true]:opacity-70 dark:data-[disabled=true]:[&_svg]:text-(--text-secondary)";

const plotToolbarGlyphToggleBase = `h-9 w-9 min-w-9 shrink-0 ${plotToolbarSegmentIdleFill} text-(--text-primary) transition-colors ${plotToolbarSegmentHoverFill} ${plotToolbarSegmentDisabledFill}`;

/** Styling for `Tooltip.Content` on plot rails (no dedicated stacking token; overlays use theme defaults). */
export const plotToolbarTooltipContentClass =
  "bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg";

/**
 * Attached plot toolbar shell: overrides HeroUI `.toolbar--attached` `bg-surface` so rails read as an elevated pill on the plot.
 */
export const plotToolbarAttachedShellClass =
  "rounded-full border border-(--border-strong) !bg-(--surface-2) px-1 py-1 shadow-sm dark:border-(--border-default)/50 dark:!bg-black dark:shadow-md";

/**
 * Flex gap between sibling tool **groups** inside one attached `Toolbar` (for example home/export | inspect/zoom/pan | edit).
 * Use {@link PlotToolbarGroupSeparator} when a visible divider is required between groups; use this gap alone when groups should breathe without a rule.
 */
export const plotToolbarGroupGapClass = "gap-2";

/**
 * Horizontal attached `Toolbar` shell: black pill plus {@link plotToolbarGroupGapClass} between direct child groups.
 */
export const plotToolbarAttachedToolbarHorizontalClass = `${plotToolbarAttachedShellClass} items-stretch ${plotToolbarGroupGapClass}`;

/**
 * Vertical attached `Toolbar` shell for a single column of groups (display tools, data rail, spectrum tools).
 */
export const plotToolbarAttachedToolbarVerticalClass = `${plotToolbarAttachedShellClass} w-fit`;

/**
 * Vertical attached `Toolbar` with a scrollable analysis stack (peaks, normalization, KK).
 */
export const plotToolbarAttachedToolbarVerticalScrollClass = `${plotToolbarAttachedShellClass} flex max-h-[24rem] flex-col items-center overflow-auto`;

/** Thin vertical rule between horizontal tool groups inside one attached top rail. */
export const plotToolbarGroupSeparatorVerticalClass =
  "mx-1 h-6 min-h-6 w-px shrink-0 self-center bg-(--border-strong)/70 dark:bg-(--border-default)";

/** Thin horizontal rule between vertical tool groups inside one attached rail. */
export const plotToolbarGroupSeparatorHorizontalClass =
  "my-1 w-full shrink-0 bg-(--border-strong)/70 dark:bg-(--border-default)";

/** `ToggleButtonGroup` / `ButtonGroup` chrome for horizontal segments inside one attached group. */
export const plotToolbarAttachedToggleGroupHorizontalClass = "rounded-full";

/** `ToggleButtonGroup` chrome for vertical segments inside one attached group. */
export const plotToolbarAttachedToggleGroupVerticalClass = "w-full rounded-full";

/** Horizontal channel picker popover: same attached pill chrome as plot rails. */
export const plotToolbarAttachedHorizontalPickerShellClass =
  `${plotToolbarAttachedShellClass} w-fit rounded-full`;

/**
 * Inner column for a vertical attached toolbar: stacks segment rows flush inside one shell pill.
 */
export const plotToolbarAttachedVerticalStackClass =
  "flex w-full min-w-9 flex-col items-stretch gap-0 overflow-hidden rounded-full";

/**
 * Like {@link plotToolbarAttachedVerticalStackClass} but allows tray channel pickers to extend horizontally outside the rail.
 */
export const plotToolbarAttachedVerticalStackTrayPopoverClass =
  "flex w-full min-w-9 flex-col items-stretch gap-0 overflow-visible rounded-full";

export const plotToolbarIconToolClass = `h-9 w-9 min-w-9 ${plotToolbarSegmentIdleFill} text-(--text-primary) transition-colors ${plotToolbarSegmentHoverFill} ${plotToolbarSegmentDisabledFill}`;

const plotToolbarCompactGlyphToggleBase = `h-7 w-7 min-w-7 shrink-0 ${plotToolbarSegmentIdleFill} text-(--text-primary) transition-colors ${plotToolbarSegmentHoverFill} ${plotToolbarSegmentDisabledFill}`;

/** Compact icon-only plot controls (split/coalesce) that must not overlap axis spines. */
export const plotToolbarCompactIconToolClass = `h-7 w-7 min-w-7 ${plotToolbarSegmentIdleFill} text-(--text-primary) transition-colors ${plotToolbarSegmentHoverFill} ${plotToolbarSegmentDisabledFill}`;

export const plotToolbarCompactGlyphToggleClass =
  `${plotToolbarCompactGlyphToggleBase} rounded-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleStandaloneClass =
  `${plotToolbarGlyphToggleBase} rounded-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleGroupItemHorizontalClass =
  `${plotToolbarGlyphToggleBase} rounded-none first:rounded-l-full last:rounded-r-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleGroupItemVerticalClass =
  `${plotToolbarGlyphToggleBase} rounded-none first:rounded-t-full last:rounded-b-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleClass = plotToolbarGlyphToggleStandaloneClass;

export const plotToolbarBasisToggleGroupItemVerticalClass = `min-h-9 w-full min-w-9 px-2 ${plotToolbarSegmentIdleFill} text-(--text-primary) transition-colors rounded-none first:rounded-t-full last:rounded-b-full ${plotToolbarSegmentHoverFill} ${plotToolbarSegmentDisabledFill} ${plotToolbarToggleSelectedClass}`;

/** @deprecated Prefer {@link plotToolbarBasisSegmentClass} when segments are not direct ToggleButtonGroup siblings. */
export const plotToolbarBasisToggleClass = plotToolbarBasisToggleGroupItemVerticalClass;

export type PlotToolbarBasisSegmentPosition = "first" | "middle" | "last" | "only";

/**
 * Muted fill for plot-rail controls that cannot be used (link off, unavailable channel, etc.).
 * Applied on the hover-capturing shell from {@link PlotToolbarRichHint} when the trigger is disabled.
 */
export const plotToolbarBasisSegmentDisabledClass =
  "!bg-(--surface-3) text-(--text-tertiary) shadow-none [&_svg]:text-(--text-tertiary) dark:!bg-(--surface-1) dark:text-(--text-secondary) dark:opacity-70 dark:[&_svg]:text-(--text-secondary)";

/**
 * Corner radii for one row in a vertical attached stack when each row is wrapped (for example in a popover trigger).
 * Idle rows use theme segment fills on the attached shell; selection uses accent tokens.
 */
export function plotToolbarBasisSegmentClass(
  position: PlotToolbarBasisSegmentPosition,
): string {
  const base = `min-h-9 w-full min-w-9 appearance-none border-0 ${plotToolbarSegmentIdleFill} px-2 text-(--text-primary) shadow-none transition-colors rounded-none ${plotToolbarSegmentHoverFill} ${plotToolbarToggleSelectedClass}`;
  switch (position) {
    case "first":
      return `${base} rounded-t-full`;
    case "last":
      return `${base} rounded-b-full`;
    case "only":
      return `${base} rounded-t-full rounded-b-full`;
    case "middle":
      return base;
    default: {
      const _exhaustive: never = position;
      return _exhaustive;
    }
  }
}

const plotToolbarLinkSegmentCornerClass = (
  position: PlotToolbarBasisSegmentPosition,
): string => {
  switch (position) {
    case "first":
      return "rounded-t-full";
    case "last":
      return "rounded-b-full";
    case "only":
      return "rounded-t-full rounded-b-full";
    case "middle":
      return "rounded-none";
    default: {
      const _exhaustive: never = position;
      return _exhaustive;
    }
  }
};

/**
 * Thin middle strip for tray link controls (for example beta-delta chain): centered icon on segment idle fill.
 */
export function plotToolbarLinkSegmentClass(
  position: PlotToolbarBasisSegmentPosition,
): string {
  return `flex h-6 w-full min-w-9 shrink-0 cursor-pointer appearance-none items-center justify-center border-0 ${plotToolbarSegmentIdleFill} p-0 text-(--text-primary) shadow-none transition-colors ${plotToolbarSegmentHoverFill} ${plotToolbarLinkSegmentCornerClass(position)}`;
}

/** Accent fill when a tray toggle is highlighted but group selection state is unreliable. */
export const plotToolbarToggleForcedSelectedClass =
  "!bg-(--accent) text-(--accent-foreground) shadow-sm [&_svg]:text-(--accent-foreground)";

export const plotToolbarDifferenceToggleClass =
  `h-9 w-9 min-w-9 rounded-full ${plotToolbarSegmentIdleFill} text-(--text-primary) transition-colors ${plotToolbarSegmentHoverFill} ${plotToolbarSegmentDisabledFill} ${plotToolbarToggleSelectedClass}`;
