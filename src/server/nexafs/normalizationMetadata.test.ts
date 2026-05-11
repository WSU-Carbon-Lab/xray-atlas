import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildQualityScores,
  buildValidationSummary,
} from "./normalizationMetadata";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("buildValidationSummary", () => {
  it("uses range checks when pre/post ranges exist", () => {
    const summary = buildValidationSummary({
      points: [
        { energy: 280, absorption: 1, od: 0.02 },
        { energy: 281, absorption: 2, od: 0.01 },
        { energy: 300, absorption: 3, od: 0.98 },
      ],
      ranges: { pre: [279, 282], post: [299, 301] },
      override: { bypass: false },
    });
    expect(summary.mode).toBe("ranges");
    expect(summary.checks.od).toBe("pass");
  });

  it("falls back to single-point checks without ranges", () => {
    const summary = buildValidationSummary({
      points: [
        { energy: 280, absorption: 1, od: 0.5 },
        { energy: 300, absorption: 3, od: 0.4 },
      ],
      ranges: null,
      override: { bypass: false },
    });
    expect(summary.mode).toBe("single_point");
    expect(summary.warnings.length).toBeGreaterThan(0);
  });

  it("marks beta/mass disagreement above threshold as warning", () => {
    const summary = buildValidationSummary({
      points: [
        { energy: 280, absorption: 1, beta: 1.3, massabsorption: 1.0 },
        { energy: 281, absorption: 2, beta: 1.4, massabsorption: 1.0 },
      ],
      ranges: null,
      override: { bypass: false },
    });
    expect(summary.checks.betaCrossCheck).toBe("warn");
  });
});

describe("buildQualityScores", () => {
  it("scores smaller spacing better", () => {
    const dense = buildQualityScores({
      points: [
        { energy: 280, absorption: 1 },
        { energy: 281, absorption: 2 },
        { energy: 282, absorption: 1.8 },
      ],
      ranges: null,
      doiPresent: false,
    });
    const sparse = buildQualityScores({
      points: [
        { energy: 280, absorption: 1 },
        { energy: 290, absorption: 2 },
        { energy: 300, absorption: 1.8 },
      ],
      ranges: null,
      doiPresent: false,
    });
    expect(dense.perChannel.rawabs.pointSpacing).toBeLessThan(
      sparse.perChannel.rawabs.pointSpacing ?? Number.POSITIVE_INFINITY,
    );
    expect((dense.aggregateScore ?? 0) > (sparse.aggregateScore ?? 0)).toBe(
      true,
    );
  });

  it("scores higher snr better", () => {
    const highSnr = buildQualityScores({
      points: [
        { energy: 280, absorption: 10, rawabsError: 0.2 },
        { energy: 281, absorption: 10.1, rawabsError: 0.2 },
        { energy: 282, absorption: 9.9, rawabsError: 0.2 },
      ],
      ranges: null,
      doiPresent: false,
    });
    const lowSnr = buildQualityScores({
      points: [
        { energy: 280, absorption: 10, rawabsError: 0.2 },
        { energy: 281, absorption: 12, rawabsError: 0.2 },
        { energy: 282, absorption: 8, rawabsError: 0.2 },
      ],
      ranges: null,
      doiPresent: false,
    });
    expect(
      (highSnr.perChannel.rawabs.snr ?? 0) >
        (lowSnr.perChannel.rawabs.snr ?? 0),
    ).toBe(true);
  });

  it("computes normalization anchor distance for every channel when ranges exist", () => {
    const qs = buildQualityScores({
      points: [
        { energy: 280, absorption: 5, od: 0.05, massabsorption: 0.06 },
        { energy: 281, absorption: 6, od: 0.02, massabsorption: 0.01 },
        { energy: 300, absorption: 7, od: 0.97, massabsorption: 0.98 },
      ],
      ranges: { pre: [279.5, 281.5], post: [299.5, 300.5] },
      doiPresent: false,
    });
    expect(qs.perChannel.od.normalizationTargetDistance != null).toBe(true);
    expect(qs.perChannel.massabsorption.normalizationTargetDistance != null).toBe(
      true,
    );
    expect(qs.perChannel.rawabs.normalizationTargetDistance != null).toBe(true);
  });

  it("suppresses snr when uploaded points lack error bars", () => {
    const qs = buildQualityScores({
      points: [
        { energy: 280, absorption: 10 },
        { energy: 281, absorption: 10.5 },
        { energy: 282, absorption: 9.7 },
      ],
      ranges: null,
      doiPresent: false,
    });
    expect(qs.perChannel.rawabs.snr).toBe(null);
  });

  it("uses channel-local energy grids for spacing when finite samples differ", () => {
    const qs = buildQualityScores({
      points: [
        { energy: 280, absorption: 1, od: 0.1 },
        { energy: 285, absorption: 2 },
        { energy: 290, absorption: 3, od: 0.2 },
      ],
      ranges: null,
      doiPresent: false,
    });
    expect(qs.perChannel.rawabs.pointSpacing).toBeLessThan(
      qs.perChannel.od.pointSpacing ?? Number.POSITIVE_INFINITY,
    );
  });
});
