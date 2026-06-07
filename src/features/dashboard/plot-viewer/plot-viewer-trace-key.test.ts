import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildPlotViewerTraceKey,
  parsePlotViewerTraceKey,
} from "./plot-viewer-trace-key";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer trace key", () => {
  it("builds stable experiment and geometry keys", () => {
    const experimentId = "11111111-1111-1111-1111-111111111111";
    const geometryKey = "55:0";
    const traceKey = buildPlotViewerTraceKey(experimentId, geometryKey);
    expect(traceKey).toBe(`${experimentId}:${geometryKey}`);
    const parsed = parsePlotViewerTraceKey(traceKey);
    expect(parsed?.experimentId).toBe(experimentId);
    expect(parsed?.geometryKey).toBe(geometryKey);
  });
});
