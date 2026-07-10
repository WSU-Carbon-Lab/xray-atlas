import type { PlotDimensions } from "../types";
import type { OpticalLinkSplitLayoutResult } from "./useOpticalLinkSplitLayout";

/** Pixel position for the in-plot optical link split toggle anchor. */
export type OpticalLinkSplitToggleAnchor = {
  readonly left: number;
  readonly top: number;
};

const SINGLE_PLOT_BOTTOM_INSET_PX = 20;

/**
 * Computes the centered anchor for the optical link split toggle inside the plot canvas.
 *
 * When split, places the control in the horizontal gap between imaginary and real subplots.
 * When unsplit, places it near the bottom center of the plot inner area.
 */
export function computeOpticalLinkSplitToggleAnchor(params: {
  opticalSplitActive: boolean;
  plotInnerLeft: number;
  plotInnerWidth: number;
  singlePlotDimensions: PlotDimensions;
  opticalSplitLayout: OpticalLinkSplitLayoutResult | null;
}): OpticalLinkSplitToggleAnchor {
  const centerX = params.plotInnerLeft + params.plotInnerWidth / 2;

  if (params.opticalSplitActive && params.opticalSplitLayout != null) {
    const imag = params.opticalSplitLayout.imaginaryPlot.dimensions;
    const real = params.opticalSplitLayout.realPlot.dimensions;
    const imaginaryInnerHeight =
      imag.height - imag.margins.top - imag.margins.bottom;
    const realPanelOffsetY =
      imag.height + real.margins.top - imag.margins.top;
    const imaginaryInnerBottom = imag.margins.top + imaginaryInnerHeight;
    const realInnerTop = realPanelOffsetY + real.margins.top;
    return {
      left: centerX,
      top: (imaginaryInnerBottom + realInnerTop) / 2,
    };
  }

  const dims = params.singlePlotDimensions;
  const innerBottom = dims.height - dims.margins.bottom;
  return {
    left: centerX,
    top: innerBottom - SINGLE_PLOT_BOTTOM_INSET_PX,
  };
}
