import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  ALS_5322_INSTRUMENT_SLUG,
  allowedDashboardInstrumentSlugs,
  isAllowedDashboardInstrumentSlug,
  isDashboardWorkspaceAccessible,
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
  });

  it("resolveDashboardConnectorBinding returns als-5321 as not_ready", () => {
    const binding = resolveDashboardConnectorBinding("als-5321");
    expect(binding?.readiness).toBe("not_ready");
    expect(isDashboardWorkspaceAccessible("als-5321")).toBe(false);
    expect(isAllowedDashboardInstrumentSlug("als-5321")).toBe(false);
  });

  it("allowedDashboardInstrumentSlugs includes only beta and ready connectors", () => {
    const slugs = allowedDashboardInstrumentSlugs();
    expect(slugs).toContain(ALS_5322_INSTRUMENT_SLUG);
    expect(slugs.includes("als-5321")).toBe(false);
  });
});
