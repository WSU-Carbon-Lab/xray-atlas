import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PlotViewerDescriptorField } from "./plot-viewer-legend";
import {
  defaultPlotViewerUrlState,
  parsePlotViewerLegendDock,
  parsePlotViewerLegendTrayOpen,
  readPlotViewerParams,
  writePlotViewerParams,
} from "./plot-viewer-url-state";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer-url-state", () => {
  it("round-trips datasets, channel, facets, geometry keys, and descriptor columns", () => {
    const initial = defaultPlotViewerUrlState();
    const state = {
      ...initial,
      query: "benzene",
      datasets: [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ],
      channel: "beta" as const,
      facets: {
        edge: ["edge-1"],
        mol: ["mol-1"],
        instrument: ["inst-1"],
        facility: ["ALS"],
      },
      geometryKeys: ["55:0", "fixed"],
      panelOpen: false,
      viewMode: "subplots" as const,
      descriptorFields: [
        "theta",
        "instrument",
        "facility",
      ] satisfies PlotViewerDescriptorField[],
      paletteId: "viridis" as const,
      colorBy: "instrument" as const,
      lineStyleBy: "facility" as const,
      markerBy: "molecule" as const,
      legendPlacement: "inplot" as const,
      legendDock: "bottom" as const,
      legendTrayOpen: false,
      hiddenTraceIds: ["a:55:0", "b:20:0"],
    };
    const params = new URLSearchParams();
    writePlotViewerParams(params, state);
    const parsed = readPlotViewerParams(params);
    expect(parsed.query).toBe("benzene");
    expect(parsed.datasets).toEqual(state.datasets);
    expect(parsed.channel).toBe("beta");
    expect(parsed.facets).toEqual(state.facets);
    expect(parsed.geometryKeys).toEqual(state.geometryKeys);
    expect(parsed.panelOpen).toBe(false);
    expect(parsed.viewMode).toBe("subplots");
    expect(parsed.descriptorFields).toEqual(["theta", "instrument", "facility"]);
    expect(parsed.paletteId).toBe("viridis");
    expect(parsed.colorBy).toBe("instrument");
    expect(parsed.lineStyleBy).toBe("facility");
    expect(parsed.markerBy).toBe("molecule");
    expect(parsed.legendPlacement).toBe("inplot");
    expect(parsed.legendDock).toBe("bottom");
    expect(parsed.legendTrayOpen).toBe(false);
    expect(parsed.hiddenTraceIds).toEqual(["a:55:0", "b:20:0"]);
  });

  it("round-trips legendPlacement and defaults to panel", () => {
    expect(
      readPlotViewerParams(new URLSearchParams("legendPlacement=inplot"))
        .legendPlacement,
    ).toBe("inplot");
    expect(readPlotViewerParams(new URLSearchParams()).legendPlacement).toBe(
      "panel",
    );
    const out = new URLSearchParams();
    writePlotViewerParams(out, {
      ...defaultPlotViewerUrlState(),
      legendPlacement: "inplot",
    });
    expect(out.get("legendPlacement")).toBe("inplot");
    const defaultOut = new URLSearchParams();
    writePlotViewerParams(defaultOut, defaultPlotViewerUrlState());
    expect(defaultOut.has("legendPlacement")).toBe(false);
  });

  it("round-trips style mapping URL params", () => {
    const params = new URLSearchParams(
      "colorBy=edge&lineBy=none&markerBy=experiment&palette=sequential-blue",
    );
    const parsed = readPlotViewerParams(params);
    expect(parsed.colorBy).toBe("edge");
    expect(parsed.lineStyleBy).toBe("none");
    expect(parsed.markerBy).toBe("experiment");
    expect(parsed.paletteId).toBe("sequential-blue");
  });

  it("omits default style mapping keys from the URL", () => {
    const params = new URLSearchParams();
    writePlotViewerParams(params, defaultPlotViewerUrlState());
    expect(params.has("colorBy")).toBe(false);
    expect(params.has("lineBy")).toBe(false);
    expect(params.has("markerBy")).toBe(false);
  });

  it("defaults channel to normalized when absent or invalid", () => {
    expect(readPlotViewerParams(new URLSearchParams()).channel).toBe(
      "normalized",
    );
    expect(
      readPlotViewerParams(new URLSearchParams("channel=unknown")).channel,
    ).toBe("normalized");
  });

  it("omits default-normalized channel and empty keys from the URL", () => {
    const params = new URLSearchParams();
    writePlotViewerParams(params, defaultPlotViewerUrlState());
    expect(params.has("channel")).toBe(false);
    expect(params.has("geom")).toBe(false);
    expect(params.has("datasets")).toBe(false);
    expect(params.has("desc")).toBe(false);
  });

  it("reads desc= descriptor columns and migrates legacy legend= param", () => {
    expect(
      readPlotViewerParams(
        new URLSearchParams("desc=theta,instrument,facility"),
      ).descriptorFields,
    ).toEqual(["theta", "instrument", "facility"]);
    expect(
      readPlotViewerParams(new URLSearchParams("legend=edge")).descriptorFields,
    ).toEqual(["edge"]);
  });

  it("round-trips legendPlacement and accepts legacy legendPlace alias", () => {
    expect(
      readPlotViewerParams(new URLSearchParams("legendPlacement=inplot"))
        .legendPlacement,
    ).toBe("inplot");
    expect(
      readPlotViewerParams(new URLSearchParams("legendPlace=in")).legendPlacement,
    ).toBe("inplot");
    expect(
      readPlotViewerParams(new URLSearchParams("legendPlace=out")).legendPlacement,
    ).toBe("panel");

    const params = new URLSearchParams();
    writePlotViewerParams(params, {
      ...defaultPlotViewerUrlState(),
      legendPlacement: "inplot",
    });
    expect(params.get("legendPlacement")).toBe("inplot");
    expect(params.has("legendPlace")).toBe(false);
  });

  it("parses legend dock and tray defaults", () => {
    expect(parsePlotViewerLegendDock(new URLSearchParams())).toBe("right");
    expect(
      parsePlotViewerLegendDock(new URLSearchParams("legendDock=left")),
    ).toBe("left");
    expect(parsePlotViewerLegendTrayOpen(new URLSearchParams())).toBe(true);
    expect(
      parsePlotViewerLegendTrayOpen(new URLSearchParams("legendTray=0")),
    ).toBe(false);
  });

  it("omits default legend dock, tray, and hidden traces from the URL", () => {
    const params = new URLSearchParams();
    writePlotViewerParams(params, defaultPlotViewerUrlState());
    expect(params.has("legendDock")).toBe(false);
    expect(params.has("legendTray")).toBe(false);
    expect(params.has("hidden")).toBe(false);
  });

  it("omits default panel legend placement from the URL", () => {
    const params = new URLSearchParams();
    writePlotViewerParams(params, defaultPlotViewerUrlState());
    expect(params.has("legendPlacement")).toBe(false);
    expect(params.has("legendPlace")).toBe(false);
  });
});
