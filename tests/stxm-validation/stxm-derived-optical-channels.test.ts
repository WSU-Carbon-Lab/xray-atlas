import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  deriveStxmOpticalChannelSeries,
  migrateStxmIngestionPlotChannel,
  stxmDerivedOpticalChannelsAvailable,
} from "~/lib/stxm/stxm-derived-optical-channels";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const ENERGY_EV = [280, 285, 290];
const BETA = [0.001, 0.002, 0.0015];
const DELTA = [1e-5, 2e-5, 1.5e-5];
const FORMULA = "C8H8";

describe("STXM derived optical channels", () => {
  it("aligns imaginary and real tray channel ids with NEXAFS browse rails", () => {
    const imaginaryIds = STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION.channels
      .filter((channel) => channel.trayId === "imaginary")
      .map((channel) => channel.id);
    const realIds = STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION.channels
      .filter((channel) => channel.trayId === "real")
      .map((channel) => channel.id);
    expect(imaginaryIds).toEqual(["beta", "f2", "im-epsilon", "im-chi"]);
    expect(realIds).toEqual(["delta", "f1", "re-epsilon", "re-chi"]);
  });

  it("derives Im(epsilon) from beta and delta", () => {
    const series = deriveStxmOpticalChannelSeries(
      "im-epsilon",
      ENERGY_EV,
      BETA,
      DELTA,
      FORMULA,
    );
    expect(series?.[0]).toBeCloseTo(2 * (1 - DELTA[0]!) * BETA[0]!, 10);
  });

  it("derives Re(chi) from beta and delta", () => {
    const series = deriveStxmOpticalChannelSeries(
      "re-chi",
      ENERGY_EV,
      BETA,
      DELTA,
      FORMULA,
    );
    const reN = 1 - DELTA[1]!;
    const imN = BETA[1]!;
    expect(series?.[1]).toBeCloseTo(reN * reN - imN * imN - 1, 10);
  });

  it("requires formula for f1 and f2 channels", () => {
    expect(
      deriveStxmOpticalChannelSeries("f2", ENERGY_EV, BETA, DELTA, null),
    ).toEqual(null);
    expect(
      deriveStxmOpticalChannelSeries("f1", ENERGY_EV, BETA, DELTA, ""),
    ).toEqual(null);
  });

  it("reports derived availability only with formula and paired beta/delta", () => {
    expect(
      stxmDerivedOpticalChannelsAvailable(ENERGY_EV, BETA, DELTA, FORMULA),
    ).toBe(true);
    expect(
      stxmDerivedOpticalChannelsAvailable(ENERGY_EV, BETA, DELTA, null),
    ).toBe(false);
  });

  it("migrates legacy chi channel id to im-chi", () => {
    expect(migrateStxmIngestionPlotChannel("chi")).toBe("im-chi");
  });
});
