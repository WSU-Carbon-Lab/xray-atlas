import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  isPlotViewerPaletteId,
  PLOT_VIEWER_PALETTE_CATALOG,
  PLOT_VIEWER_PALETTE_IDS,
  pickPlotViewerPaletteColor,
  plotViewerPaletteEntry,
} from "./plot-viewer-palette-catalog";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer-palette-catalog", () => {
  it("lists expected matplotlib-inspired palette ids", () => {
    expect(PLOT_VIEWER_PALETTE_IDS).toEqual([
      "tab10",
      "spectrum",
      "set2",
      "paired",
      "viridis",
      "plasma",
      "mako",
      "rocket",
      "sequential-blue",
    ]);
    expect(PLOT_VIEWER_PALETTE_CATALOG.length).toBe(9);
  });

  it("validates palette ids", () => {
    expect(isPlotViewerPaletteId("tab10")).toBe(true);
    expect(isPlotViewerPaletteId("viridis")).toBe(true);
    expect(isPlotViewerPaletteId("unknown")).toBe(false);
  });

  it("cycles qualitative tab10 colors discretely", () => {
    const first = pickPlotViewerPaletteColor({
      paletteId: "tab10",
      isDark: false,
      valueIndex: 0,
      valueCount: 12,
    });
    const last = pickPlotViewerPaletteColor({
      paletteId: "tab10",
      isDark: false,
      valueIndex: 9,
      valueCount: 12,
    });
    const wrapped = pickPlotViewerPaletteColor({
      paletteId: "tab10",
      isDark: false,
      valueIndex: 10,
      valueCount: 12,
    });
    expect(first).toBe("#1F77B4");
    expect(last).toBe("#17BECF");
    expect(wrapped).toBe("#1F77B4");
  });

  it("interpolates sequential viridis along value count", () => {
    const start = pickPlotViewerPaletteColor({
      paletteId: "viridis",
      isDark: false,
      valueIndex: 0,
      valueCount: 4,
    });
    const end = pickPlotViewerPaletteColor({
      paletteId: "viridis",
      isDark: false,
      valueIndex: 3,
      valueCount: 4,
    });
    expect(start).toBe(plotViewerPaletteEntry("viridis").previewStops[0]);
    expect(start === end).toBe(false);
  });
});
