import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  BEAMLINE_CLAIM_ISSUE_TEMPLATE,
  INSTRUMENT_CONNECTOR_REQUEST_ISSUE_TEMPLATE,
  XRAY_ATLAS_GITHUB_REPO,
  buildBeamlineClaimIssueUrl,
  buildInstrumentConnectorRequestIssueUrl,
} from "./github-beamline-issues";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function parseIssueUrl(href: string): URL {
  return new URL(href);
}

describe("buildBeamlineClaimIssueUrl", () => {
  it("targets the beamline claim template on the Atlas repository", () => {
    const url = parseIssueUrl(buildBeamlineClaimIssueUrl());
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe(`/${XRAY_ATLAS_GITHUB_REPO}/issues/new`);
    expect(url.searchParams.get("template")).toBe(BEAMLINE_CLAIM_ISSUE_TEMPLATE);
  });

  it("prefills facility and instrument form fields when provided", () => {
    const url = parseIssueUrl(
      buildBeamlineClaimIssueUrl({
        facilityName: "Advanced Light Source",
        instrumentName: "Beamline 5.3.2.2",
      }),
    );
    expect(url.searchParams.get("facility")).toBe("Advanced Light Source");
    expect(url.searchParams.get("instrument_name")).toBe("Beamline 5.3.2.2");
  });

  it("omits empty prefill values", () => {
    const url = parseIssueUrl(
      buildBeamlineClaimIssueUrl({
        facilityName: "  ",
        instrumentName: "ALS 5.3.2.2 STXM",
      }),
    );
    expect(url.searchParams.has("facility")).toBe(false);
    expect(url.searchParams.get("instrument_name")).toBe("ALS 5.3.2.2 STXM");
  });
});

describe("buildInstrumentConnectorRequestIssueUrl", () => {
  it("targets the instrument connector request template", () => {
    const url = parseIssueUrl(buildInstrumentConnectorRequestIssueUrl());
    expect(url.searchParams.get("template")).toBe(
      INSTRUMENT_CONNECTOR_REQUEST_ISSUE_TEMPLATE,
    );
  });

  it("prefills connector workflow fields when provided", () => {
    const url = parseIssueUrl(
      buildInstrumentConnectorRequestIssueUrl({
        facilityName: "Advanced Light Source",
        instrumentName: "Beamline 11.0.1.2",
        preferredSlug: "als-11012",
        technique: "STXM",
      }),
    );
    expect(url.searchParams.get("facility")).toBe("Advanced Light Source");
    expect(url.searchParams.get("instrument_name")).toBe("Beamline 11.0.1.2");
    expect(url.searchParams.get("preferred_slug")).toBe("als-11012");
    expect(url.searchParams.get("technique")).toBe("STXM");
  });
});
