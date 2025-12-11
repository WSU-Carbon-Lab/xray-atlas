/**
 * Plot renderer interface for abstraction layer
 * Allows both Plotly and visx implementations to coexist
 */

import type { ReactElement } from "react";
import type { SpectrumPlotProps } from "./types";

/**
 * Types of interactions supported by renderers
 */
export type InteractionType =
  | "drag-peak"
  | "resize-peak"
  | "select-region"
  | "hover-tooltip"
  | "click-add-peak";

/**
 * Interface that plot renderers must implement
 */
export interface PlotRenderer {
  /**
   * Render the plot with given props
   */
  render(props: SpectrumPlotProps): ReactElement;

  /**
   * Check if the renderer supports a specific interaction type
   */
  supportsInteraction(interaction: InteractionType): boolean;
}
