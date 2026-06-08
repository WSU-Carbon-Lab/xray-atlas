import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  ALS_11012_INSTRUMENT_SLUG,
  ALS_5322_INSTRUMENT_SLUG,
  allowedDashboardInstrumentSlugs,
  isAllowedDashboardInstrumentSlug,
  isDashboardWorkspaceAccessible,
  listDashboardConnectorBindings,
  matchInstrumentToDashboardBinding,
  resolveDashboardConnectorBinding,
} from "./bindings";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (value: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const ALS_FACILITY = "Advanced Light Source";

describe("dashboard connector bindings", () => {
  it("matchInstrumentToDashboardBinding maps Beamline 5.3.2.2 to als-5322", () => {
    const binding = matchInstrumentToDashboardBinding(
      "Beamline 5.3.2.2",
      ALS_FACILITY,
    );
    expect(binding?.slug).toBe(ALS_5322_INSTRUMENT_SLUG);
    expect(binding?.readiness).toBe("beta");
  });

  it("matchInstrumentToDashboardBinding maps Beamline 11.0.1.2 to als-11012", () => {
    const binding = matchInstrumentToDashboardBinding(
      "Beamline 11.0.1.2",
      ALS_FACILITY,
    );
    expect(binding?.slug).toBe(ALS_11012_INSTRUMENT_SLUG);
    expect(binding?.readiness).toBe("not_ready");
  });

  it("matchInstrumentToDashboardBinding returns undefined for unrelated instruments", () => {
    expect(
      matchInstrumentToDashboardBinding("Beamline 11.0.2", ALS_FACILITY),
    ).toBeUndefined();
    expect(
      matchInstrumentToDashboardBinding(
        "Beamline 5.3.2.2",
        "National Synchrotron Light Source II",
      ),
    ).toBeUndefined();
    expect(
      matchInstrumentToDashboardBinding("SST1", ALS_FACILITY),
    ).toBeUndefined();
  });

  it("matchInstrumentToDashboardBinding compares facility names case-insensitively", () => {
    const binding = matchInstrumentToDashboardBinding(
      "Beamline 5.3.2.2",
      "advanced light source",
    );
    expect(binding?.slug).toBe(ALS_5322_INSTRUMENT_SLUG);
  });

  it("allowedDashboardInstrumentSlugs includes only beta and ready connectors", () => {
    const slugs = allowedDashboardInstrumentSlugs();
    expect(slugs).toContain(ALS_5322_INSTRUMENT_SLUG);
    expect(slugs.includes(ALS_11012_INSTRUMENT_SLUG)).toBe(false);
  });

  it("registers only implemented workspace slugs", () => {
    const slugs = listDashboardConnectorBindings().map((binding) => binding.slug);
    expect(slugs).toContain(ALS_5322_INSTRUMENT_SLUG);
    expect(slugs).toContain(ALS_11012_INSTRUMENT_SLUG);
    expect(slugs.includes("als-5321")).toBe(false);
    expect(slugs.includes("als-731")).toBe(false);
    expect(slugs.includes("ansto-sxr")).toBe(false);
    expect(resolveDashboardConnectorBinding(ALS_11012_INSTRUMENT_SLUG)?.readiness).toBe(
      "not_ready",
    );
    expect(isDashboardWorkspaceAccessible(ALS_11012_INSTRUMENT_SLUG)).toBe(false);
    expect(isAllowedDashboardInstrumentSlug(ALS_11012_INSTRUMENT_SLUG)).toBe(false);
  });
});
