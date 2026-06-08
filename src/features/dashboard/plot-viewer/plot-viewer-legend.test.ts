import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildPlotViewerLegendRows,
  normalizePlotViewerDescriptorFields,
  plotViewerDescriptorColumnTitle,
  plotViewerLegendColumnCount,
  plotViewerLegendRowSpotLabel,
  resolvePlotViewerLegendDescriptorFields,
} from "./plot-viewer-legend";
import type { PlotViewerLegendTraceInput } from "./plot-viewer-legend";

type ExpectAssertions = {
  toHaveLength: (length: number) => void;
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function descriptors(
  partial: Partial<PlotViewerLegendTraceInput["descriptors"]> = {},
): PlotViewerLegendTraceInput["descriptors"] {
  return {
    theta: "20°",
    phi: "0°",
    thetaPhi: "20°",
    region: "20°",
    molecule: "Benzene",
    edge: "C K",
    instrument: "STXM",
    facility: "ALS",
    experiment: "11111111",
    ...partial,
  };
}

function trace(
  partial: Partial<PlotViewerLegendTraceInput> &
    Pick<
      PlotViewerLegendTraceInput,
      "traceKey" | "geometryKey" | "datasetOrder"
    >,
): PlotViewerLegendTraceInput {
  return {
    geometrySortKey: partial.geometryKey,
    channelGlyph: "OD",
    descriptors: descriptors(),
    color: "#111111",
    lineDash: "solid",
    ...partial,
  };
}

describe("buildPlotViewerLegendRows", () => {
  it("groups rows by geometry and sorts datasets within each geometry", () => {
    const rows = buildPlotViewerLegendRows(
      [
        trace({
          traceKey: "b:20:0",
          geometryKey: "20:0",
          datasetOrder: 1,
          descriptors: descriptors({ molecule: "B" }),
        }),
        trace({
          traceKey: "a:55:0",
          geometryKey: "55:0",
          datasetOrder: 0,
          descriptors: descriptors({ molecule: "A", thetaPhi: "55°" }),
        }),
        trace({
          traceKey: "a:20:0",
          geometryKey: "20:0",
          datasetOrder: 0,
          descriptors: descriptors({ molecule: "A" }),
        }),
      ],
      ["molecule"],
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]?.geometryKey).toBe("20:0");
    expect(rows[0]?.values.molecule).toBe("A");
    expect(rows[1]?.values.molecule).toBe("B");
    expect(rows[2]?.geometryKey).toBe("55:0");
  });

  it("projects separate theta and phi columns without channel glyph in cells", () => {
    const rows = buildPlotViewerLegendRows(
      [
        trace({
          traceKey: "a:30:0",
          geometryKey: "30:0",
          datasetOrder: 0,
          channelGlyph: "β",
          descriptors: descriptors({
            theta: "30°",
            phi: "0°",
            instrument: "SXR",
          }),
        }),
      ],
      ["theta", "phi", "instrument"],
    );
    expect(rows[0]?.channelLabel).toBe("β");
    expect(rows[0]?.values.theta).toBe("30°");
    expect(rows[0]?.values.phi).toBe("0°");
    expect(rows[0]?.values.instrument).toBe("SXR");
    expect(rows[0]?.values.theta?.includes("β")).toBe(false);
    expect(rows[0]?.values.phi?.includes("β")).toBe(false);
  });

  it("uses region descriptor for STXM-style labels", () => {
    const rows = buildPlotViewerLegendRows(
      [
        trace({
          traceKey: "stxm:region-a",
          geometryKey: "fixed",
          datasetOrder: 0,
          descriptors: descriptors({
            region: "Region A",
            thetaPhi: "Region A",
          }),
        }),
      ],
      ["region"],
    );
    expect(rows[0]?.values.region).toBe("Region A");
  });
});

describe("normalizePlotViewerDescriptorFields", () => {
  it("drops unknown tokens and preserves order", () => {
    expect(
      normalizePlotViewerDescriptorFields([
        "theta",
        "unknown",
        "instrument",
        "theta",
      ]),
    ).toEqual(["theta", "instrument"]);
  });

  it("falls back to theta, phi, and instrument defaults", () => {
    expect(normalizePlotViewerDescriptorFields([])).toEqual([
      "theta",
      "phi",
      "instrument",
    ]);
  });
});

describe("plotViewerLegendColumnCount", () => {
  it("includes the channel column plus each descriptor column", () => {
    expect(plotViewerLegendColumnCount(["theta", "phi", "instrument"])).toBe(4);
    expect(plotViewerLegendColumnCount([])).toBe(4);
    expect(plotViewerLegendColumnCount(["molecule"])).toBe(2);
  });
});

describe("resolvePlotViewerLegendDescriptorFields", () => {
  it("expands thetaPhi into separate theta and phi columns", () => {
    expect(
      resolvePlotViewerLegendDescriptorFields(
        ["thetaPhi", "instrument"],
        ["55:0", "70:90"],
      ),
    ).toEqual(["theta", "phi", "instrument"]);
  });

  it("hides phi when phi is fixed across geometry keys", () => {
    expect(
      resolvePlotViewerLegendDescriptorFields(
        ["theta", "phi", "instrument"],
        ["55:0", "70:0"],
      ),
    ).toEqual(["theta", "instrument"]);
  });

  it("hides theta when theta is fixed across geometry keys", () => {
    expect(
      resolvePlotViewerLegendDescriptorFields(
        ["theta", "phi", "instrument"],
        ["55:0", "55:90"],
      ),
    ).toEqual(["phi", "instrument"]);
  });
});

describe("plotViewerLegendRowSpotLabel", () => {
  it("joins active descriptor values for in-plot legend rows", () => {
    const rows = buildPlotViewerLegendRows(
      [
        trace({
          traceKey: "a:55:0",
          geometryKey: "55:0",
          datasetOrder: 0,
          descriptors: descriptors({
            theta: "55°",
            phi: "0°",
            instrument: "5.3.2.2",
          }),
        }),
      ],
      ["theta", "instrument"],
    );
    expect(
      plotViewerLegendRowSpotLabel(rows[0]!, ["theta", "instrument"]),
    ).toBe("55° · 5.3.2.2");
  });
});

describe("plotViewerDescriptorColumnTitle", () => {
  it("uses theta-only column title when phi is fixed across rows", () => {
    const rows = buildPlotViewerLegendRows(
      [
        trace({
          traceKey: "a:55:0",
          geometryKey: "55:0",
          datasetOrder: 0,
        }),
        trace({
          traceKey: "a:70:0",
          geometryKey: "70:0",
          datasetOrder: 1,
        }),
      ],
      ["thetaPhi"],
    );
    const geometryKeys = rows.map((row) => row.geometryKey);
    expect(
      plotViewerDescriptorColumnTitle("thetaPhi", { geometryKeys }),
    ).toBe("θ");
  });
});
