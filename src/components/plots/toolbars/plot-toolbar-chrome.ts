const plotToolbarToggleSelectedClass =
  "data-[selected=true]:bg-red-500 data-[selected=true]:text-white data-[selected=true]:[&_svg]:text-white data-[selected=true]:shadow-sm";

const plotToolbarGlyphToggleBase =
  "h-9 w-9 min-w-9 shrink-0 text-(--text-primary) transition-colors data-[hovered=true]:data-[selected=false]:bg-(--surface-3)/60";

export const plotToolbarAttachedShellClass =
  "bg-(--surface-glass)/90 px-1 py-1 shadow-md backdrop-blur-md";

export const plotToolbarIconToolClass =
  "h-9 w-9 min-w-9 text-(--text-primary) transition-colors data-[hovered=true]:bg-(--surface-3)/60";

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

export const plotToolbarDifferenceToggleClass =
  `h-9 w-9 min-w-9 rounded-full text-(--text-primary) transition-colors data-[hovered=true]:data-[selected=false]:bg-(--surface-3)/60 ${plotToolbarToggleSelectedClass}`;
