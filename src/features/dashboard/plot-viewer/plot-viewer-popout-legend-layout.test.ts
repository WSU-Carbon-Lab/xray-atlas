import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_HEIGHT_CLASS,
  PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_WIDTH_CLASS,
  PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_MAX_HEIGHT_CLASS,
  PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_WIDTH_CLASS,
  PLOT_VIEWER_POPOUT_LEGEND_SIDE_EXPANDED_HEIGHT_CLASS,
  plotViewerPopoutLegendAsideClassName,
  plotViewerPopoutLegendDockIsHorizontal,
  plotViewerPopoutLegendPlotAdjacentChromeClassName,
  plotViewerPopoutLegendTrayChevronDirection,
} from "./plot-viewer-popout-legend-layout";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  not: ExpectAssertions;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plotViewerPopoutLegendDockIsHorizontal", () => {
  it("treats top and bottom docks as horizontal", () => {
    expect(plotViewerPopoutLegendDockIsHorizontal("top")).toBe(true);
    expect(plotViewerPopoutLegendDockIsHorizontal("bottom")).toBe(true);
  });

  it("treats left and right docks as vertical", () => {
    expect(plotViewerPopoutLegendDockIsHorizontal("left")).toBe(false);
    expect(plotViewerPopoutLegendDockIsHorizontal("right")).toBe(false);
  });
});

describe("plotViewerPopoutLegendAsideClassName", () => {
  it("uses a narrow width strip when a side dock tray is collapsed", () => {
    const className = plotViewerPopoutLegendAsideClassName("right", false);
    expect(className).toContain(
      PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_WIDTH_CLASS,
    );
    expect(className).not.toContain(
      PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_WIDTH_CLASS,
    );
  });

  it("uses expanded width and full plot height when a side dock tray is open", () => {
    const className = plotViewerPopoutLegendAsideClassName("left", true);
    expect(className).toContain(PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_WIDTH_CLASS);
    expect(className).toContain(PLOT_VIEWER_POPOUT_LEGEND_SIDE_EXPANDED_HEIGHT_CLASS);
    expect(className).not.toContain(
      PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_WIDTH_CLASS,
    );
  });

  it("uses a short height strip when a top/bottom dock tray is collapsed", () => {
    const className = plotViewerPopoutLegendAsideClassName("bottom", false);
    expect(className).toContain(
      PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_HEIGHT_CLASS,
    );
    expect(className).not.toContain(
      PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_MAX_HEIGHT_CLASS,
    );
  });

  it("uses expanded max height when a top/bottom dock tray is open", () => {
    const className = plotViewerPopoutLegendAsideClassName("top", true);
    expect(className).toContain(
      PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_MAX_HEIGHT_CLASS,
    );
    expect(className).not.toContain(
      PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_HEIGHT_CLASS,
    );
  });
});

describe("plotViewerPopoutLegendPlotAdjacentChromeClassName", () => {
  it("trims the plot-facing border on a right dock panel", () => {
    expect(plotViewerPopoutLegendPlotAdjacentChromeClassName("right")).toContain(
      "border-s-0",
    );
  });

  it("trims the plot-facing border on a top dock panel", () => {
    expect(plotViewerPopoutLegendPlotAdjacentChromeClassName("top")).toContain(
      "border-b-0",
    );
  });
});

describe("plotViewerPopoutLegendTrayChevronDirection", () => {
  it("points toward the plot when expanding from a right dock strip", () => {
    expect(plotViewerPopoutLegendTrayChevronDirection("right", false)).toBe(
      "left",
    );
  });

  it("points toward the plot edge when collapsing an open left dock panel", () => {
    expect(plotViewerPopoutLegendTrayChevronDirection("left", true)).toBe(
      "left",
    );
  });
});
