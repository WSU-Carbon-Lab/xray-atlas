import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  resolveStxmPlotYScale,
  stxmSignalChannelForI0PlotScale,
} from "~/lib/stxm/stxm-ingestion-display";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveStxmPlotYScale", () => {
  it("keeps reduced channels linear regardless of I0 scale", () => {
    expect(resolveStxmPlotYScale("od", "log_i")).toBe("linear");
    expect(resolveStxmPlotYScale("beta", "log_inv")).toBe("linear");
  });

  it("maps I0 and sample channels to log when log_i is active", () => {
    expect(resolveStxmPlotYScale("signal_i0", "log_i")).toBe("log");
    expect(resolveStxmPlotYScale("signal_sample", "log_i")).toBe("log");
    expect(resolveStxmPlotYScale("signal_i0", "linear")).toBe("linear");
  });

  it("maps inverse I0 channel to log only for log_inv mode", () => {
    expect(resolveStxmPlotYScale("signal_inv_i0", "log_inv")).toBe("log");
    expect(resolveStxmPlotYScale("signal_inv_i0", "log_i")).toBe("linear");
  });
});

describe("stxmSignalChannelForI0PlotScale", () => {
  it("selects inverse I0 for log_inv", () => {
    expect(
      stxmSignalChannelForI0PlotScale("log_inv", "signal_sample"),
    ).toBe("signal_inv_i0");
  });

  it("preserves sample when log_i and already on sample", () => {
    expect(
      stxmSignalChannelForI0PlotScale("log_i", "signal_sample"),
    ).toBe("signal_sample");
  });
});
