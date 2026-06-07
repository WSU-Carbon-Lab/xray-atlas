import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { partitionPlotViewerTracesByGeometry } from "./plot-viewer-subplot-partition";
import type { PlotViewerStyledTrace } from "./plot-viewer-styled-traces";

type ExpectAssertions = {
  toHaveLength: (length: number) => void;
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function styledTrace(
  partial: Pick<
    PlotViewerStyledTrace,
    "traceKey" | "geometryKey" | "datasetOrder"
  > & {
    angleLabel?: string;
  },
): PlotViewerStyledTrace {
  const angleLabel = partial.angleLabel ?? partial.geometryKey;
  return {
    experimentId: "exp",
    geometrySortKey: partial.geometryKey,
    geometryIndex: 0,
    label: partial.traceKey,
    points: [],
    color: "#000000",
    lineDash: "solid",
    markerSymbol: "circle",
    lineWidth: 1.8,
    markerSize: 5,
    legendId: partial.traceKey,
    channelGlyph: "OD",
    descriptors: {
      theta: angleLabel,
      phi: "0°",
      thetaPhi: angleLabel,
      region: angleLabel,
      molecule: "M",
      edge: "C K",
      instrument: "I",
      facility: "F",
      experiment: "exp",
    },
    traceKey: partial.traceKey,
    datasetOrder: partial.datasetOrder,
    geometryKey: partial.geometryKey,
  };
}

describe("partitionPlotViewerTracesByGeometry", () => {
  it("creates one panel per geometry with dataset traces inside", () => {
    const panels = partitionPlotViewerTracesByGeometry([
      styledTrace({
        traceKey: "a:20:0",
        geometryKey: "20:0",
        datasetOrder: 0,
        angleLabel: "20.0°",
      }),
      styledTrace({
        traceKey: "b:20:0",
        geometryKey: "20:0",
        datasetOrder: 1,
        angleLabel: "20.0°",
      }),
      styledTrace({
        traceKey: "a:55:0",
        geometryKey: "55:0",
        datasetOrder: 0,
        angleLabel: "55.0°",
      }),
    ]);
    expect(panels).toHaveLength(2);
    expect(panels[0]?.geometryKey).toBe("20:0");
    expect(panels[0]?.traces).toHaveLength(2);
    expect(panels[1]?.geometryKey).toBe("55:0");
    expect(panels[1]?.traces).toHaveLength(1);
  });
});
