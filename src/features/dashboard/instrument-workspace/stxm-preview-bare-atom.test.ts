import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildPreviewCompareBareAtomReferenceCurve,
  previewBareAtomMatrixChannelForCompareChannel,
  resolvePreviewCompareBareAtomContext,
  resolvePreviewCompareTraceFormula,
} from "./stxm-preview-bare-atom";
import { buildPlotViewerTraceKey } from "~/features/dashboard/plot-viewer/plot-viewer-trace-key";
import { buildStxmPreviewTraceKey } from "./stxm-preview-trace-key";
import type { BareAtomRepresentationMatrix } from "~/features/process-nexafs/bare-atom-representation-matrix";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const scanId = "beamtime/scan001.hdr";
const stxmTraceKey = buildStxmPreviewTraceKey(scanId, "pure");
const atlasTraceKey = buildPlotViewerTraceKey(
  "30539a6a-8690-4b55-8f55-000000000001",
  "theta55-phi0",
);

describe("stxm-preview-bare-atom", () => {
  it("maps OD and mass absorption compare channels to bare-atom beta", () => {
    expect(previewBareAtomMatrixChannelForCompareChannel("od")).toBe("beta");
    expect(previewBareAtomMatrixChannelForCompareChannel("od_normalized")).toBe(
      "beta",
    );
    expect(previewBareAtomMatrixChannelForCompareChannel("mass_absorption")).toBe(
      "beta",
    );
    expect(previewBareAtomMatrixChannelForCompareChannel("delta")).toBe("delta");
  });

  it("resolvePreviewCompareTraceFormula reads STXM ingestion formula", () => {
    const formula = resolvePreviewCompareTraceFormula({
      traceKey: stxmTraceKey,
      ingestionByScanId: {
        [scanId]: {
          scanId,
          computedAt: "2026-01-01T00:00:00.000Z",
          weightingMode: "poisson_mle",
          normalization: {
            preLo: 270,
            preHi: 280,
            postLo: 320,
            postHi: 330,
          },
          energyEv: [280, 285, 290],
          od: [0.1, 0.5, 0.9],
          odErr: [0.01, 0.02, 0.03],
          formula: "C82H54N8O2S4",
        },
      },
      atlasDatasets: [],
    });
    expect(formula).toBe("C82H54N8O2S4");
  });

  it("resolvePreviewCompareTraceFormula reads Atlas dataset formula", () => {
    const formula = resolvePreviewCompareTraceFormula({
      traceKey: atlasTraceKey,
      ingestionByScanId: {},
      atlasDatasets: [
        {
          experimentId: "30539a6a-8690-4b55-8f55-000000000001",
          label: "Y6 TEY",
          chemicalFormula: "C82H54N8O2S4",
          spectrumPoints: [],
        },
      ],
    });
    expect(formula).toBe("C82H54N8O2S4");
  });

  it("resolvePreviewCompareBareAtomContext disables ambiguous molecule formulas", () => {
    const context = resolvePreviewCompareBareAtomContext({
      channel: "beta",
      visibleTraceKeys: [stxmTraceKey, atlasTraceKey],
      visiblePoints: [
        { energy: 280, absorption: 0.1 },
        { energy: 285, absorption: 0.2 },
        { energy: 290, absorption: 0.3 },
      ],
      ingestionByScanId: {
        [scanId]: {
          scanId,
          computedAt: "2026-01-01T00:00:00.000Z",
          weightingMode: "poisson_mle",
          normalization: {
            preLo: 270,
            preHi: 280,
            postLo: 320,
            postHi: 330,
          },
          energyEv: [280, 285, 290],
          od: [0.1, 0.5, 0.9],
          odErr: [0.01, 0.02, 0.03],
          formula: "C6H6",
        },
      },
      atlasDatasets: [
        {
          experimentId: "30539a6a-8690-4b55-8f55-000000000001",
          label: "Y6 TEY",
          chemicalFormula: "C82H54N8O2S4",
          spectrumPoints: [],
        },
      ],
    });
    expect(context.disabled).toBe(true);
    expect(context.formula).toBe(null);
  });

  it("resolvePreviewCompareBareAtomContext enables a single shared formula", () => {
    const context = resolvePreviewCompareBareAtomContext({
      channel: "delta",
      visibleTraceKeys: [stxmTraceKey],
      visiblePoints: [
        { energy: 280, absorption: 0.1 },
        { energy: 285, absorption: 0.2 },
      ],
      ingestionByScanId: {
        [scanId]: {
          scanId,
          computedAt: "2026-01-01T00:00:00.000Z",
          weightingMode: "poisson_mle",
          normalization: {
            preLo: 270,
            preHi: 280,
            postLo: 320,
            postHi: 330,
          },
          energyEv: [280, 285],
          od: [0.1, 0.5],
          odErr: [0.01, 0.02],
          formula: "C82H54N8O2S4",
        },
      },
      atlasDatasets: [],
    });
    expect(context.disabled).toBe(false);
    expect(context.formula).toBe("C82H54N8O2S4");
    expect(context.energyEv).toEqual([280, 285]);
  });

  it("buildPreviewCompareBareAtomReferenceCurve uses injected matrix builder", async () => {
    const matrix: BareAtomRepresentationMatrix = {
      formula: "C82H54N8O2S4",
      channels: {
        beta: [
          { energy: 280, absorption: 0.01 },
          { energy: 285, absorption: 0.02 },
        ],
        delta: [
          { energy: 280, absorption: 1e-4 },
          { energy: 285, absorption: 2e-4 },
        ],
      },
    };

    const curve = await buildPreviewCompareBareAtomReferenceCurve({
      chemicalFormula: "C82H54N8O2S4",
      energyEv: [280, 285],
      channel: "od",
      isDark: false,
      buildMatrix: async () => matrix,
    });

    if (!curve) {
      throw new Error("expected bare atom reference curve");
    }
    expect(curve.points.length).toBe(2);
    expect(curve.label).toBe("Bare atom β");
  });
});
