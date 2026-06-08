import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  ALS_5322_INSTRUMENT_SLUG,
  dashboardInstrumentBrowseHref,
  dashboardInstrumentWorkspaceHref,
  resolveDashboardConnector,
} from "./registry";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("dashboard connector registry", () => {
  it("resolveDashboardConnector returns als-5322 workspace loader as beta", () => {
    const connector = resolveDashboardConnector(ALS_5322_INSTRUMENT_SLUG);
    expect(connector?.readiness).toBe("beta");
    expect(connector?.slug).toBe(ALS_5322_INSTRUMENT_SLUG);
  });

  it("dashboardInstrumentBrowseHref links to the facility instrument anchor", () => {
    expect(
      dashboardInstrumentBrowseHref(
        "advanced-light-source",
        "als-uuid_beamline_5_3_2_2",
      ),
    ).toBe(
      "/facilities/advanced-light-source#instrument-als-uuid_beamline_5_3_2_2",
    );
  });

  it("dashboardInstrumentWorkspaceHref builds resume URLs from instrumentSlug", () => {
    expect(
      dashboardInstrumentWorkspaceHref(
        ALS_5322_INSTRUMENT_SLUG,
        "550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe(
      "/dashboard/instruments/als-5322?session=550e8400-e29b-41d4-a716-446655440000",
    );
    expect(dashboardInstrumentWorkspaceHref(ALS_5322_INSTRUMENT_SLUG)).toBe(
      "/dashboard/instruments/als-5322",
    );
  });

  it("resolveDashboardConnector returns undefined for unknown slugs", () => {
    expect(resolveDashboardConnector("unknown-slug")).toBeUndefined();
  });
});
