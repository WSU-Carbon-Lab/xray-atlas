/**
 * Shared Tailwind class strings for spectrum plot toolbars (attached chrome, toggles, tooltip copy styling).
 */

const plotToolbarToggleSelectedClass =
  "data-[selected=true]:bg-(--accent) data-[selected=true]:text-(--accent-foreground) data-[selected=true]:[&_svg]:text-(--accent-foreground) data-[selected=true]:shadow-sm";

const plotToolbarGlyphToggleBase =
  "h-9 w-9 min-w-9 shrink-0 text-(--text-primary) transition-colors data-[hovered=true]:data-[selected=false]:bg-(--surface-3)/60";

/** Styling for `Tooltip.Content` on plot rails (no dedicated stacking token; overlays use theme defaults). */
export const plotToolbarTooltipContentClass =
  "bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg";

export const plotToolbarAttachedShellClass =
  "bg-(--surface-glass)/90 px-1 py-1 shadow-md backdrop-blur-md";

export const plotToolbarIconToolClass =
  "h-9 w-9 min-w-9 text-(--text-primary) transition-colors data-[hovered=true]:bg-(--surface-3)/60";

const plotToolbarCompactGlyphToggleBase =
  "h-7 w-7 min-w-7 shrink-0 text-(--text-primary) transition-colors data-[hovered=true]:data-[selected=false]:bg-(--surface-3)/60";

/** Compact icon-only plot controls (split/coalesce) that must not overlap axis spines. */
export const plotToolbarCompactIconToolClass =
  "h-7 w-7 min-w-7 text-(--text-primary) transition-colors data-[hovered=true]:bg-(--surface-3)/60";

export const plotToolbarCompactGlyphToggleClass =
  `${plotToolbarCompactGlyphToggleBase} rounded-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleStandaloneClass =
  `${plotToolbarGlyphToggleBase} rounded-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleGroupItemHorizontalClass =
  `${plotToolbarGlyphToggleBase} rounded-none first:rounded-l-full last:rounded-r-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleGroupItemVerticalClass =
  `${plotToolbarGlyphToggleBase} rounded-none first:rounded-t-full last:rounded-b-full ${plotToolbarToggleSelectedClass}`;

export const plotToolbarGlyphToggleClass = plotToolbarGlyphToggleStandaloneClass;

export const plotToolbarBasisToggleGroupItemVerticalClass =
  `min-h-9 w-full min-w-9 px-2 text-(--text-primary) transition-colors rounded-none first:rounded-t-full last:rounded-b-full data-[hovered=true]:data-[selected=false]:bg-(--surface-3)/60 ${plotToolbarToggleSelectedClass}`;

export const plotToolbarBasisToggleClass = plotToolbarBasisToggleGroupItemVerticalClass;

/** Accent fill when a tray toggle is highlighted but group selection state is unreliable. */
export const plotToolbarToggleForcedSelectedClass =
  "bg-(--accent) text-(--accent-foreground) shadow-sm [&_svg]:text-(--accent-foreground)";

export const plotToolbarDifferenceToggleClass =
  `h-9 w-9 min-w-9 rounded-full text-(--text-primary) transition-colors data-[hovered=true]:data-[selected=false]:bg-(--surface-3)/60 ${plotToolbarToggleSelectedClass}`;
