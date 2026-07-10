import {
  describe as bunDescribe,
  it as bunIt,
  expect as bunExpect,
} from "bun:test";
import { scaleLinear } from "@visx/scale";
import { computeOpticalLinkSplitToggleAnchor } from "./optical-link-split-toggle-anchor";
import type { PlotDimensions } from "../types";
import type { OpticalLinkSplitLayoutResult } from "./useOpticalLinkSplitLayout";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const baseMargins = { top: 40, right: 20, bottom: 50, left: 60 };

function plotDimensions(
  height: number,
  margins: PlotDimensions["margins"] = baseMargins,
): PlotDimensions {
  return { width: 800, height, margins };
}

describe("computeOpticalLinkSplitToggleAnchor", () => {
  it("centers horizontally in the gap between split subplots", () => {
    const imag = plotDimensions(400);
    const real = plotDimensions(400, {
      ...baseMargins,
      top: 24,
    });
    const layout: OpticalLinkSplitLayoutResult = {
      imaginaryPlot: {
        dimensions: imag,
        xScale: scaleLinear({ domain: [0, 1], range: [0, 100] }),
        yScale: scaleLinear({ domain: [0, 1], range: [100, 0] }),
      },
      realPlot: {
        dimensions: real,
        xScale: scaleLinear({ domain: [0, 1], range: [0, 100] }),
        yScale: scaleLinear({ domain: [0, 1], range: [100, 0] }),
      },
      hasOpticalSplit: true,
      sharedEnergyDomain: [270, 320],
    };

    const anchor = computeOpticalLinkSplitToggleAnchor({
      opticalSplitActive: true,
      plotInnerLeft: imag.margins.left,
      plotInnerWidth: imag.width - imag.margins.left - imag.margins.right,
      singlePlotDimensions: imag,
      opticalSplitLayout: layout,
    });

    expect(anchor.left).toBe(420);
    const imaginaryInnerBottom =
      imag.margins.top + (imag.height - imag.margins.top - imag.margins.bottom);
    const realPanelOffsetY =
      imag.height + real.margins.top - imag.margins.top;
    const realInnerTop = realPanelOffsetY + real.margins.top;
    expect(anchor.top).toBe((imaginaryInnerBottom + realInnerTop) / 2);
  });

  it("places unsplit toggle near bottom center of plot inner area", () => {
    const dims = plotDimensions(640);
    const anchor = computeOpticalLinkSplitToggleAnchor({
      opticalSplitActive: false,
      plotInnerLeft: dims.margins.left,
      plotInnerWidth: dims.width - dims.margins.left - dims.margins.right,
      singlePlotDimensions: dims,
      opticalSplitLayout: null,
    });

    expect(anchor.left).toBe(420);
    expect(anchor.top).toBe(dims.height - dims.margins.bottom - 20);
  });
});
