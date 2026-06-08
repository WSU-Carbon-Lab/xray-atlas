import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  allowedDashboardInstrumentSlugs,
  ALS_5322_INSTRUMENT_SLUG,
  dashboardInstrumentWorkspaceHref,
  isAllowedDashboardInstrumentSlug,
  isDashboardWorkspaceAccessible,
  listDashboardConnectors,
  resolveDashboardConnector,
} from "./registry";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (value: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("dashboard connector registry", () => {
  it("resolveDashboardConnector returns als-5322 as beta", () => {
    const connector = resolveDashboardConnector(ALS_5322_INSTRUMENT_SLUG);
    expect(connector?.readiness).toBe("beta");
    expect(connector?.slug).toBe(ALS_5322_INSTRUMENT_SLUG);
  });

  it("not_ready connectors are listed but not workspace-accessible", () => {
    const connector = resolveDashboardConnector("als-5321");
    expect(connector?.readiness).toBe("not_ready");
    expect(isDashboardWorkspaceAccessible("als-5321")).toBe(false);
    expect(isAllowedDashboardInstrumentSlug("als-5321")).toBe(false);
  });

  it("allowedDashboardInstrumentSlugs includes only beta and ready connectors", () => {
    const slugs = allowedDashboardInstrumentSlugs();
    expect(slugs).toContain(ALS_5322_INSTRUMENT_SLUG);
    expect(slugs.includes("als-5321")).toBe(false);
  });

  it("dashboardInstrumentWorkspaceHref builds resume URLs from instrumentSlug", () => {
    expect(
      dashboardInstrumentWorkspaceHref(ALS_5322_INSTRUMENT_SLUG, "550e8400-e29b-41d4-a716-446655440000"),
    ).toBe(
      "/dashboard/instruments/als-5322?session=550e8400-e29b-41d4-a716-446655440000",
    );
    expect(dashboardInstrumentWorkspaceHref(ALS_5322_INSTRUMENT_SLUG)).toBe(
      "/dashboard/instruments/als-5322",
    );
  });

  it("listDashboardConnectors returns a stable non-empty catalog", () => {
    expect(listDashboardConnectors().length > 0).toBe(true);
    expect(resolveDashboardConnector("unknown-slug")).toBeUndefined();
  });
});
