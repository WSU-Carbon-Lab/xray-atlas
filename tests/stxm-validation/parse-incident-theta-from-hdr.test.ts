import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  parseIncidentThetaDegFromHdrText,
  parseIncidentThetaDegFromScanLabel,
  resolveIncidentThetaDegForScan,
} from "~/lib/stxm/parse-incident-theta-from-hdr";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("parse-incident-theta-from-hdr", () => {
  it("parseIncidentThetaDegFromHdrText reads Polarization Value blocks", () => {
    const hdr = `
Type = "NEXAFS Line Scan"
Polarization = { Value = ( 55.0 ) }
`;
    expect(parseIncidentThetaDegFromHdrText(hdr)).toBe(55);
  });

  it("parseIncidentThetaDegFromScanLabel reads th55 and 55deg tokens", () => {
    expect(parseIncidentThetaDegFromScanLabel("sample_th55_run")).toBe(55);
    expect(parseIncidentThetaDegFromScanLabel("scan-55deg")).toBe(55);
  });

  it("resolveIncidentThetaDegForScan prefers hdr over scan label", () => {
    expect(
      resolveIncidentThetaDegForScan({
        hdrText: "Sample Polar = 70",
        scanLabel: "scan_th55",
      }),
    ).toBe(70);
  });
});
