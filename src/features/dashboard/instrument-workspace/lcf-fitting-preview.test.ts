import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { LcfSpectrum } from "~/lib/stxm/lcf";
import {
  buildLcfLivePlotOverlay,
  buildLcfPlotSeries,
  describeLcfPlotPreviewUnavailable,
  filterLcfPlotSeriesByHiddenIds,
  LCF_MODEL_TRACE_ID,
  LCF_RESIDUAL_TRACE_ID,
  LCF_TARGET_TRACE_ID,
  lcfComponentTraceId,
  resolveLcfFitEnergyGrid,
  resolveLcfPlotLegendFractions,
  resolveLcfPreviewWeights,
} from "./lcf-fitting-preview";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toBeLessThanOrEqual: (expected: number) => void;
  toEqual: (expected: unknown) => void;
  not: ExpectAssertions;
  toContain: (expected: string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function spectrum(
  label: string,
  startEv: number,
  endEv: number,
): LcfSpectrum {
  const energyEv = [startEv, startEv + 5, startEv + 10, endEv];
  return {
    energyEv,
    values: energyEv.map((energy) => energy * 0.01),
    sigma: energyEv.map(() => 0.02),
    label,
  };
}

describe("resolveLcfFitEnergyGrid", () => {
  it("falls back to overlap when fit bounds are unset", () => {
    const target = spectrum("target", 280, 295);
    const reference = spectrum("standard", 282, 292);
    const grid = resolveLcfFitEnergyGrid(target, [reference], "", "");
    expect(grid).toEqual([282, 285, 287, 290, 292]);
  });

  it("clips custom bounds to overlap", () => {
    const target = spectrum("target", 280, 295);
    const reference = spectrum("standard", 282, 292);
    const grid = resolveLcfFitEnergyGrid(target, [reference], "285", "300");
    expect(grid).toEqual([285, 287, 290, 292]);
  });
});

describe("resolveLcfPreviewWeights", () => {
  it("preserves single-standard scale without forcing unity", () => {
    expect(resolveLcfPreviewWeights([0.52], 1, true)).toEqual([0.52]);
    expect(resolveLcfPreviewWeights([1.75], 1, false)).toEqual([1.75]);
  });

  it("normalizes multi-standard fractions when sum-to-one is enabled", () => {
    expect(resolveLcfPreviewWeights([0.25, 0.75], 2, true)).toEqual([0.25, 0.75]);
    expect(resolveLcfPreviewWeights([1, 1], 2, true)).toEqual([0.5, 0.5]);
  });
});

describe("resolveLcfPlotLegendFractions", () => {
  it("keeps manual slider weights when optimized fractions differ", () => {
    expect(
      resolveLcfPlotLegendFractions([0.6], [0.5223]),
    ).toEqual([0.6]);
  });
});

describe("manual slider live preview", () => {
  it("updates overlay model when slider scale changes without optimized overwrite", () => {
    const target = spectrum("target", 280, 295);
    const reference = spectrum("standard", 282, 292);
    const manualScale = 0.6;
    const optimizedScale = 0.5223;
    const manualOverlay = buildLcfLivePlotOverlay(
      target,
      [reference],
      resolveLcfPreviewWeights([manualScale], 1, true),
    );
    const optimizedOverlay = buildLcfLivePlotOverlay(
      target,
      [reference],
      [optimizedScale],
    );
    if (manualOverlay == null || optimizedOverlay == null) {
      throw new Error("expected overlays");
    }
    expect(manualOverlay.model[0]).not.toEqual(optimizedOverlay.model[0]);
    const legendFractions = resolveLcfPlotLegendFractions(
      resolveLcfPreviewWeights([manualScale], 1, true),
      [optimizedScale],
    );
    const series = buildLcfPlotSeries({
      overlay: manualOverlay,
      componentSpectra: [reference],
      fractions: legendFractions,
      componentColors: ["var(--chart-2)"],
    });
    expect(series.companions[1]?.label).toContain("0.600");
  });
});

describe("buildLcfLivePlotOverlay", () => {
  it("returns target, model, scaled components, and residual traces", () => {
    const target = spectrum("target", 280, 295);
    const reference = spectrum("standard", 282, 292);
    const overlay = buildLcfLivePlotOverlay(target, [reference], [0.29]);
    if (overlay == null) {
      throw new Error("expected live overlay");
    }
    expect(overlay.energyGrid.length).toBeGreaterThan(1);
    expect(overlay.targetOnGrid.length).toEqual(overlay.energyGrid.length);
    expect(overlay.model.length).toEqual(overlay.energyGrid.length);
    expect(overlay.scaledComponents.length).toBe(1);
    expect(overlay.residual.length).toEqual(overlay.energyGrid.length);
  });
});

describe("buildLcfPlotSeries", () => {
  it("keeps residual out of main-panel companions", () => {
    const target = spectrum("target", 280, 295);
    const reference = spectrum("standard", 282, 292);
    const overlay = buildLcfLivePlotOverlay(target, [reference], [0.29]);
    if (overlay == null) {
      throw new Error("expected live overlay");
    }
    const series = buildLcfPlotSeries({
      overlay,
      componentSpectra: [reference],
      fractions: [0.29],
      componentColors: ["var(--chart-2)"],
    });
    expect(series.companions.some((c) => c.legendId === LCF_RESIDUAL_TRACE_ID)).toBe(
      false,
    );
    expect(series.residual.legendId).toBe(LCF_RESIDUAL_TRACE_ID);
    expect(series.visibilityRows.map((row) => row.id)).toEqual([
      LCF_TARGET_TRACE_ID,
      LCF_MODEL_TRACE_ID,
      lcfComponentTraceId(0),
      LCF_RESIDUAL_TRACE_ID,
    ]);
  });
});

describe("filterLcfPlotSeriesByHiddenIds", () => {
  it("hides residual without removing every main trace", () => {
    const target = spectrum("target", 280, 295);
    const reference = spectrum("standard", 282, 292);
    const overlay = buildLcfLivePlotOverlay(target, [reference], [0.29]);
    if (overlay == null) {
      throw new Error("expected live overlay");
    }
    const series = buildLcfPlotSeries({
      overlay,
      componentSpectra: [reference],
      fractions: [0.29],
      componentColors: ["var(--chart-2)"],
    });
    const filtered = filterLcfPlotSeriesByHiddenIds(series, [
      LCF_RESIDUAL_TRACE_ID,
      LCF_MODEL_TRACE_ID,
      lcfComponentTraceId(0),
    ]);
    expect(filtered.residual).toBe(null);
    expect(filtered.targetPoints.length).toBeGreaterThan(0);
    expect(filtered.companions.length).toBe(0);
  });
});

describe("describeLcfPlotPreviewUnavailable", () => {
  it("returns null when overlay is ready", () => {
    const target = spectrum("target", 280, 295);
    const reference = spectrum("standard", 282, 292);
    const overlay = buildLcfLivePlotOverlay(target, [reference], [0.29]);
    const message = describeLcfPlotPreviewUnavailable({
      targetTraceKey: "scan::region",
      componentTraceKeys: ["scan::other"],
      targetSpectrum: target,
      componentSpectra: [reference],
      liveOverlay: overlay,
    });
    expect(message).toBe(null);
  });

  it("explains missing target cache data", () => {
    const message = describeLcfPlotPreviewUnavailable({
      targetTraceKey: "scan::region",
      componentTraceKeys: ["scan::other"],
      targetSpectrum: null,
      componentSpectra: [],
      liveOverlay: null,
    });
    expect(message).toEqual(
      "Target spectrum data is unavailable. Re-reduce the scan on Ingestion or refresh the Preview spectra cache.",
    );
  });
});
