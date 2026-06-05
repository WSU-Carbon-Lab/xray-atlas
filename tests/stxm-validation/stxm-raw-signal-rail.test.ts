import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
  STXM_RAW_SPECTROSCOPY_TRAY_CHANNEL_IDS,
} from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import {
  applyStxmRawSignalTransform,
  applyStxmRawSignalTransformError,
  migrateStxmRawSignalTransformMode,
} from "~/lib/stxm/stxm-raw-signal-transform";
import {
  transformStxmRawIntensityErrorY,
  transformStxmRawIntensityY,
} from "~/lib/stxm/stxm-ingestion-display";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("STXM raw spectroscopy rail config", () => {
  it("uses a single spectroscopy tray with all raw and reduced channels", () => {
    expect(STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION.trays.length).toBe(3);
    expect(STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION.trays[0]?.id).toBe(
      "spectroscopy",
    );
    expect(STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION.trays[0]?.trayGlyph).toBe(
      "Rw",
    );
    expect(STXM_RAW_SPECTROSCOPY_TRAY_CHANNEL_IDS).toEqual([
      "signal_i0",
      "signal_it",
      "signal_ie",
      "od",
      "od_normalized",
      "mass_absorption",
    ]);
    const trayIds = STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION.channels.map(
      (ch) => ch.trayId,
    );
    expect(trayIds.includes("raw_signal" as never)).toBe(false);
    expect(trayIds.includes("spectroscopy")).toBe(true);
  });
});

describe("applyStxmRawSignalTransform", () => {
  it("returns linear signal unchanged", () => {
    expect(applyStxmRawSignalTransform(200, "signal")).toBe(200);
  });

  it("computes reciprocal 1/s with clamp", () => {
    expect(applyStxmRawSignalTransform(200, "reciprocal")).toBeCloseTo(0.005, 8);
    expect(applyStxmRawSignalTransform(0, "reciprocal")).toBeCloseTo(
      1 / 1e-12,
      3,
    );
  });

  it("computes log10(1/s)", () => {
    expect(applyStxmRawSignalTransform(100, "log_reciprocal")).toBeCloseTo(-2, 8);
  });

  it("migrates legacy i0 plot scale keys", () => {
    expect(migrateStxmRawSignalTransformMode("log_inv")).toBe("log_reciprocal");
    expect(migrateStxmRawSignalTransformMode("linear")).toBe("signal");
  });
});

describe("transformStxmRawIntensityY", () => {
  it("applies reciprocal only to raw intensity channels", () => {
    expect(
      transformStxmRawIntensityY(50, "signal_it", "reciprocal"),
    ).toBeCloseTo(0.02, 8);
    expect(transformStxmRawIntensityY(0.5, "od", "reciprocal")).toBe(0.5);
  });

  it("propagates error through reciprocal transform", () => {
    const err = transformStxmRawIntensityErrorY(2, 100, "signal_i0", "reciprocal");
    expect(err).toBeCloseTo(2 / 10000, 8);
  });

  it("propagates error through log reciprocal transform", () => {
    const direct = applyStxmRawSignalTransformError(100, 5, "log_reciprocal");
    const wrapped = transformStxmRawIntensityErrorY(
      5,
      100,
      "signal_i0",
      "log_reciprocal",
    );
    expect(wrapped).toBeCloseTo(direct ?? Number.NaN, 8);
  });
});
