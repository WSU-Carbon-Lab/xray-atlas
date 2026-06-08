export {
  SpectrumYChannelRail,
  type SpectrumYChannelRailProps,
} from "./spectrum-y-channel-rail";
export { PlotToolRailsDeck, type PlotToolRailInsets } from "./PlotToolRailsDeck";
export { PlotSpectrumToolsToolbarSection } from "./PlotSpectrumToolsToolbarSection";
export {
  PlotToolbarGroupSeparator,
  type PlotToolbarGroupSeparatorProps,
} from "./plot-toolbar-group-separator";
export {
  PlotToolbarRichHint,
  PLOT_TOOLBAR_RICH_HINT_CLOSE_DELAY_MS,
  PLOT_TOOLBAR_RICH_HINT_OPEN_DELAY_MS,
  type PlotToolbarRichHintPlacement,
  type PlotToolbarRichHintProps,
} from "./plot-toolbar-rich-hint";
export type { PlotSpectrumToolsToolbarSectionProps } from "./PlotSpectrumToolsToolbarSection";
/**
 * Plot toolbar chrome: black attached shells, grey segment fills, and group spacing.
 *
 * - {@link plotToolbarAttachedToolbarHorizontalClass} + {@link plotToolbarGroupGapClass}: sibling groups on the top navigation rail; add {@link PlotToolbarGroupSeparator} when a visible rule is needed between groups.
 * - {@link plotToolbarAttachedToolbarVerticalClass}: one vertical shell (display tools, data rail, spectrum tools).
 * - {@link plotToolbarAttachedVerticalStackTrayPopoverClass}: collapsed tray rows inside a single data-rail shell (segments touch; no group separators).
 * - `ToggleButtonGroup.Separator` / `ButtonGroup.Separator`: adjacent tools within one attached group only.
 */
export {
  plotToolbarAttachedHorizontalPickerShellClass,
  plotToolbarAttachedShellClass,
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarAttachedToolbarVerticalClass,
  plotToolbarAttachedToolbarVerticalScrollClass,
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarAttachedToggleGroupVerticalClass,
  plotToolbarGroupGapClass,
  plotToolbarGroupSeparatorHorizontalClass,
  plotToolbarGroupSeparatorVerticalClass,
  plotToolbarAttachedVerticalStackClass,
  plotToolbarAttachedVerticalStackTrayPopoverClass,
  plotToolbarTooltipContentClass,
  plotToolbarBasisToggleClass,
  plotToolbarBasisSegmentClass,
  plotToolbarLinkSegmentClass,
  plotToolbarBasisSegmentDisabledClass,
  plotToolbarBasisToggleGroupItemVerticalClass,
  type PlotToolbarBasisSegmentPosition,
  plotToolbarDifferenceToggleClass,
  plotToolbarGlyphToggleClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  plotToolbarGlyphToggleGroupItemVerticalClass,
  plotToolbarGlyphToggleStandaloneClass,
  plotToolbarIconToolClass,
  plotToolbarCompactIconToolClass,
  plotToolbarCompactGlyphToggleClass,
  plotToolbarToggleForcedSelectedClass,
} from "./plot-toolbar-chrome";
export type {
  PlotRailAxis,
  PlotRailDefinition,
  PlotRailExpansionState,
  PlotRailId,
} from "./types";
export {
  PlotDataViewRail,
  usePlotDataRail,
  channelDefinitionById,
  type PlotDataRailDefinition,
  type PlotDataRailChannelDefinition,
  type PlotDataViewRailProps,
} from "../data-rail";
