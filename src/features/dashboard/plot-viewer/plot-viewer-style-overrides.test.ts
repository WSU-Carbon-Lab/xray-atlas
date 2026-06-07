import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  PLOT_VIEWER_FIXED_COLOR_PRESETS,
} from "./plot-viewer-fixed-color-panel";
import {
  writePlotViewerExperimentColorMode,
  writePlotViewerTraceStyleOverride,
} from "./plot-viewer-style-overrides";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (value: unknown) => void;
  toBeGreaterThan: (value: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer fixed color presets", () => {
  it("exposes a theme-safe Igor-style preset grid size", () => {
    expect(PLOT_VIEWER_FIXED_COLOR_PRESETS.length).toBeGreaterThan(23);
    expect(PLOT_VIEWER_FIXED_COLOR_PRESETS).toContain("#FFFFFF");
    expect(PLOT_VIEWER_FIXED_COLOR_PRESETS).toContain("#0A0A0A");
  });
});

describe("plot-viewer style overrides persistence", () => {
  it("stores experiment fixed color mode and trace lineWidth/markerSize", () => {
    const experimentId = "11111111-1111-1111-1111-111111111111";
    const traceKey = "trace-a";

    const withColor = writePlotViewerExperimentColorMode(
      experimentId,
      "fixed",
      "#336699",
    );
    expect(withColor.experimentColorMode[experimentId]).toBe("fixed");
    expect(withColor.experimentFixedColor[experimentId]).toBe("#336699");

    const withTrace = writePlotViewerTraceStyleOverride(traceKey, {
      lineWidth: 2.5,
      markerSize: 7,
      markerEvery: 5,
    });
    expect(withTrace.traceOverrides[traceKey]?.lineWidth).toBe(2.5);
    expect(withTrace.traceOverrides[traceKey]?.markerSize).toBe(7);
    expect(withTrace.traceOverrides[traceKey]?.markerEvery).toBe(5);
  });
});
