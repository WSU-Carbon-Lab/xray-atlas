import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PlotViewerStyledTrace } from "./plot-viewer-styled-traces";
import { buildPlotViewerExperimentStyleItems } from "./plot-viewer-experiment-styles";
import { buildPlotViewerTraceKey } from "./plot-viewer-trace-key";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (length: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function trace(experimentId: string, geometryKey: string): PlotViewerStyledTrace {
  return {
    traceKey: buildPlotViewerTraceKey(experimentId, geometryKey),
    experimentId,
    geometryKey,
    geometrySortKey: geometryKey,
    datasetOrder: 0,
    geometryIndex: 0,
    label: `${experimentId} ${geometryKey}`,
    points: [],
    color: "#112233",
    lineDash: "solid",
    markerSymbol: "circle",
    lineWidth: 1.8,
    markerSize: 5,
    legendId: buildPlotViewerTraceKey(experimentId, geometryKey),
    channelGlyph: "OD",
    descriptors: {
      theta: "55°",
      phi: "0°",
      thetaPhi: "55°",
      region: "55°",
      molecule: "Benzene",
      edge: "C K",
      instrument: "STXM",
      facility: "ALS",
      experiment: experimentId.slice(0, 8),
    },
  };
}

describe("buildPlotViewerExperimentStyleItems", () => {
  it("returns one item per experiment with trace rows and color mode", () => {
    const experimentId = "11111111-1111-1111-1111-111111111111";
    const items = buildPlotViewerExperimentStyleItems({
      experimentIds: [experimentId],
      catalogMetaByExperimentId: new Map([
        [
          experimentId,
          {
            experimentId,
            moleculeName: "Benzene",
            edgeLabel: "C K",
            instrumentName: "STXM",
            facilityName: "ALS",
          },
        ],
      ]),
      traces: [trace(experimentId, "55:0")],
      paletteId: "spectrum",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      isDark: false,
      experimentColorMode: { [experimentId]: "fixed" },
      experimentFixedColor: { [experimentId]: "#AABBCC" },
      traceOverrides: {
        [buildPlotViewerTraceKey(experimentId, "55:0")]: {
          lineDash: "dot",
          marker: "square",
        },
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.label).toBe("Benzene · C K · STXM");
    expect(items[0]?.colorMode).toBe("fixed");
    expect(items[0]?.effectiveColor).toBe("#AABBCC");
    expect(items[0]?.traces).toHaveLength(1);
    expect(items[0]?.traces[0]?.effectiveLineDash).toBe("dot");
    expect(items[0]?.traces[0]?.effectiveMarker).toBe("square");
    expect(items[0]?.traces[0]?.hasLineDashOverride).toBe(true);
    expect(items[0]?.traces[0]?.hasMarkerOverride).toBe(true);
    expect(items[0]?.traces[0]?.label).toBe("55° · STXM");
  });

  it("falls back to a short experiment id prefix when catalog metadata is missing", () => {
    const experimentId = "12d5b864-bf0d-423a-9004-82d8cd6e140c";
    const items = buildPlotViewerExperimentStyleItems({
      experimentIds: [experimentId],
      catalogMetaByExperimentId: new Map(),
      traces: [trace(experimentId, "55:0")],
      paletteId: "spectrum",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      isDark: false,
    });
    expect(items[0]?.label).toBe("12d5b864");
  });

  it("surfaces experiment-level line and marker override flags", () => {
    const experimentId = "11111111-1111-1111-1111-111111111111";
    const items = buildPlotViewerExperimentStyleItems({
      experimentIds: [experimentId],
      catalogMetaByExperimentId: new Map([
        [
          experimentId,
          {
            experimentId,
            moleculeName: "Benzene",
            edgeLabel: "C K",
            instrumentName: "STXM",
            facilityName: "ALS",
          },
        ],
      ]),
      traces: [trace(experimentId, "55:0")],
      paletteId: "spectrum",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      isDark: false,
      experimentLineDashOverrides: { [experimentId]: "dot" },
      experimentLineWidthOverrides: { [experimentId]: 2.5 },
      experimentMarkerOverrides: { [experimentId]: "square" },
      experimentMarkerSizeOverrides: { [experimentId]: 8 },
      experimentMarkerEveryOverrides: { [experimentId]: 10 },
    });
    expect(items[0]?.hasLineDashOverride).toBe(true);
    expect(items[0]?.hasLineWidthOverride).toBe(true);
    expect(items[0]?.hasMarkerOverride).toBe(true);
    expect(items[0]?.hasMarkerSizeOverride).toBe(true);
    expect(items[0]?.hasMarkerEveryOverride).toBe(true);
    expect(items[0]?.effectiveLineDash).toBe("dot");
    expect(items[0]?.effectiveLineWidth).toBe(2.5);
    expect(items[0]?.effectiveMarker).toBe("square");
    expect(items[0]?.effectiveMarkerSize).toBe(8);
    expect(items[0]?.effectiveMarkerEvery).toBe(10);
  });
});
