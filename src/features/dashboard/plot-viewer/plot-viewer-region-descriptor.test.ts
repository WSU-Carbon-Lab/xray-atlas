import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  isPlotViewerNamedRegionLabel,
  resolvePlotViewerRegionDescriptor,
} from "./plot-viewer-region-descriptor";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer-region-descriptor", () => {
  it("isPlotViewerNamedRegionLabel rejects empty and generic region placeholder", () => {
    expect(isPlotViewerNamedRegionLabel("")).toBe(false);
    expect(isPlotViewerNamedRegionLabel("  ")).toBe(false);
    expect(isPlotViewerNamedRegionLabel("region")).toBe(false);
    expect(isPlotViewerNamedRegionLabel("REGION")).toBe(false);
    expect(isPlotViewerNamedRegionLabel("pure")).toBe(true);
    expect(isPlotViewerNamedRegionLabel("Aggregate")).toBe(true);
  });

  it("resolvePlotViewerRegionDescriptor keeps named region labels", () => {
    expect(
      resolvePlotViewerRegionDescriptor({
        regionLabel: "pure",
        theta: 55,
      }),
    ).toBe("pure");
  });

  it("resolvePlotViewerRegionDescriptor falls back to formatted theta", () => {
    expect(
      resolvePlotViewerRegionDescriptor({
        regionLabel: "",
        theta: 55,
      }),
    ).toBe("55°");
    expect(
      resolvePlotViewerRegionDescriptor({
        regionLabel: "region",
        theta: 55,
      }),
    ).toBe("55°");
  });

  it("resolvePlotViewerRegionDescriptor parses theta from geometry keys", () => {
    expect(
      resolvePlotViewerRegionDescriptor({
        regionLabel: "",
        geometryKey: "55:0",
      }),
    ).toBe("55°");
  });
});
