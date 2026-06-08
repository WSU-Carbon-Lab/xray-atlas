import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  formatPlotViewerAngleDegrees,
  formatPlotViewerGeometryCellLabel,
  plotViewerThetaPhiColumnTitle,
  resolvePlotViewerAngleSplit,
} from "./format-plot-viewer-geometry-label";
import { plotViewerDescriptorColumnTitle } from "./plot-viewer-legend";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("formatPlotViewerAngleDegrees", () => {
  it("formats finite angles without theta/phi prefixes", () => {
    expect(formatPlotViewerAngleDegrees(55)).toBe("55°");
    expect(formatPlotViewerAngleDegrees(55.04)).toBe("55°");
    expect(formatPlotViewerAngleDegrees(12.34)).toBe("12.3°");
  });
});

describe("resolvePlotViewerAngleSplit", () => {
  it("detects fixed phi across geometry keys", () => {
    const split = resolvePlotViewerAngleSplit(["55:0", "70:0", "20:0"]);
    expect(split.singlePhi).toBe(true);
    expect(split.singleTheta).toBe(false);
  });
});

describe("formatPlotViewerGeometryCellLabel", () => {
  it("omits phi when phi is fixed across traces", () => {
    const split = resolvePlotViewerAngleSplit(["55:0", "70:0"]);
    expect(
      formatPlotViewerGeometryCellLabel({
        geometryKey: "55:0",
        theta: 55,
        phi: 0,
        split,
      }),
    ).toBe("55°");
  });

  it("shows both compact angles when theta and phi vary", () => {
    const split = resolvePlotViewerAngleSplit(["55:0", "70:90"]);
    expect(
      formatPlotViewerGeometryCellLabel({
        geometryKey: "70:90",
        theta: 70,
        phi: 90,
        split,
      }),
    ).toBe("70° · 90°");
  });
});

describe("plotViewerThetaPhiColumnTitle", () => {
  it("uses theta-only heading when phi is fixed", () => {
    expect(plotViewerThetaPhiColumnTitle(["55:0", "70:0"])).toBe("θ");
    expect(
      plotViewerDescriptorColumnTitle("thetaPhi", {
        geometryKeys: ["55:0", "70:0"],
      }),
    ).toBe("θ");
  });
});
