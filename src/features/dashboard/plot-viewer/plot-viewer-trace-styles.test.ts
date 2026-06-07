import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PlotViewerDescriptorField } from "./plot-viewer-legend";
import {
  buildPlotViewerStyleContext,
  resolvePlotViewerTraceStyle,
} from "./plot-viewer-trace-styles";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function descriptorRow(params: {
  thetaPhi: string;
  instrument: string;
  experiment: string;
}): Record<PlotViewerDescriptorField, string> {
  return {
    thetaPhi: params.thetaPhi,
    theta: params.thetaPhi,
    phi: params.thetaPhi,
    region: params.thetaPhi,
    instrument: params.instrument,
    facility: "ALS",
    edge: "C K",
    molecule: "Benzene",
    experiment: params.experiment,
  };
}

describe("resolvePlotViewerTraceStyle", () => {
  it("assigns color by geometry and line dash by instrument", () => {
    const rows = [
      descriptorRow({
        thetaPhi: "55°",
        instrument: "ALS",
        experiment: "exp-a",
      }),
      descriptorRow({
        thetaPhi: "70°",
        instrument: "ALS",
        experiment: "exp-a",
      }),
      descriptorRow({
        thetaPhi: "55°",
        instrument: "SXR",
        experiment: "exp-b",
      }),
    ];
    const styleContext = buildPlotViewerStyleContext({
      descriptorRows: rows,
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
    });
    const alsGeometryA = resolvePlotViewerTraceStyle({
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
    });
    const alsGeometryB = resolvePlotViewerTraceStyle({
      descriptors: rows[1]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
    });
    const sxrGeometry = resolvePlotViewerTraceStyle({
      descriptors: rows[2]!,
      experimentId: "exp-b",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
    });

    expect(alsGeometryA.color === alsGeometryB.color).toBe(false);
    expect(alsGeometryA.lineDash).toBe("solid");
    expect(sxrGeometry.lineDash).toBe("dash");
  });

  it("assigns marker symbol by experiment id", () => {
    const rows = [
      descriptorRow({
        thetaPhi: "55°",
        instrument: "ALS",
        experiment: "exp-a",
      }),
      descriptorRow({
        thetaPhi: "55°",
        instrument: "ALS",
        experiment: "exp-b",
      }),
    ];
    const styleContext = buildPlotViewerStyleContext({
      descriptorRows: rows,
      colorBy: "thetaPhi",
      lineStyleBy: "none",
      markerBy: "experiment",
    });
    const first = resolvePlotViewerTraceStyle({
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "none",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
    });
    const second = resolvePlotViewerTraceStyle({
      descriptors: rows[1]!,
      experimentId: "exp-b",
      colorBy: "thetaPhi",
      lineStyleBy: "none",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
    });
    expect(first.markerSymbol).toBe("circle");
    expect(second.markerSymbol).toBe("square");
  });

  it("honors session color overrides and per-value line dash overrides", () => {
    const rows = [
      descriptorRow({
        thetaPhi: "55°",
        instrument: "SXR",
        experiment: "exp-a",
      }),
    ];
    const styleContext = buildPlotViewerStyleContext({
      descriptorRows: rows,
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
    });
    const styled = resolvePlotViewerTraceStyle({
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
      colorOverrides: { "exp-a": "#112233" },
      lineDashOverrides: { SXR: "dot" },
    });
    expect(styled.color).toBe("#112233");
    expect(styled.lineDash).toBe("dot");
  });

  it("honors per-experiment line dash and marker overrides over encoding defaults", () => {
    const rows = [
      descriptorRow({
        thetaPhi: "55°",
        instrument: "ALS",
        experiment: "exp-a",
      }),
    ];
    const styleContext = buildPlotViewerStyleContext({
      descriptorRows: rows,
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
    });
    const styled = resolvePlotViewerTraceStyle({
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
      experimentLineDashOverrides: { "exp-a": "dashdot" },
      experimentMarkerOverrides: { "exp-a": "diamond" },
    });
    expect(styled.lineDash).toBe("dashdot");
    expect(styled.markerSymbol).toBe("diamond");
  });

  it("applies trace overrides before experiment and encoding defaults", () => {
    const rows = [
      descriptorRow({
        thetaPhi: "55°",
        instrument: "ALS",
        experiment: "exp-a",
      }),
    ];
    const styleContext = buildPlotViewerStyleContext({
      descriptorRows: rows,
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
    });
    const traceKey = "exp-a:55:0";
    const styled = resolvePlotViewerTraceStyle({
      traceKey,
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
      experimentColorMode: { "exp-a": "fixed" },
      experimentFixedColor: { "exp-a": "#101010" },
      experimentLineDashOverrides: { "exp-a": "dashdot" },
      experimentMarkerOverrides: { "exp-a": "diamond" },
      traceOverrides: {
        [traceKey]: {
          color: "#FF0000",
          lineDash: "dot",
          marker: "triangle",
          lineWidth: 2.5,
          markerEvery: 4,
          markerSize: 6,
        },
      },
    });
    expect(styled.color).toBe("#FF0000");
    expect(styled.lineDash).toBe("dot");
    expect(styled.markerSymbol).toBe("triangle");
    expect(styled.lineWidth).toBe(2.5);
    expect(styled.markerEvery).toBe(4);
    expect(styled.markerSize).toBe(6);
  });

  it("applies experiment-level width and marker spacing before trace overrides", () => {
    const rows = [
      descriptorRow({
        thetaPhi: "55°",
        instrument: "ALS",
        experiment: "exp-a",
      }),
    ];
    const styleContext = buildPlotViewerStyleContext({
      descriptorRows: rows,
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
    });
    const styled = resolvePlotViewerTraceStyle({
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "instrument",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
      experimentLineWidthOverrides: { "exp-a": 3 },
      experimentMarkerSizeOverrides: { "exp-a": 9 },
      experimentMarkerEveryOverrides: { "exp-a": 6 },
    });
    expect(styled.lineWidth).toBe(3);
    expect(styled.markerSize).toBe(9);
    expect(styled.markerEvery).toBe(6);
  });

  it("uses scheme color when experiment color mode is scheme", () => {
    const rows = [
      descriptorRow({
        thetaPhi: "55°",
        instrument: "ALS",
        experiment: "exp-a",
      }),
    ];
    const styleContext = buildPlotViewerStyleContext({
      descriptorRows: rows,
      colorBy: "thetaPhi",
      lineStyleBy: "none",
      markerBy: "experiment",
    });
    const withFixed = resolvePlotViewerTraceStyle({
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "none",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
      experimentColorMode: { "exp-a": "fixed" },
      experimentFixedColor: { "exp-a": "#101010" },
    });
    const withScheme = resolvePlotViewerTraceStyle({
      descriptors: rows[0]!,
      experimentId: "exp-a",
      colorBy: "thetaPhi",
      lineStyleBy: "none",
      markerBy: "experiment",
      styleContext,
      paletteId: "spectrum",
      isDark: false,
      experimentColorMode: { "exp-a": "scheme" },
      experimentFixedColor: { "exp-a": "#101010" },
    });
    expect(withFixed.color).toBe("#101010");
    expect(withScheme.color === withFixed.color).toBe(false);
  });
});
