import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HDR_SCAN_TYPE_PEEK_BYTES,
  isProbedLineScan,
  probeHdrScanFromText,
} from "~/lib/stxm/probeHdrScan";
import { scanTypeCategory } from "~/lib/stxm/scanType";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("probeHdrScanFromText", () => {
  it("classifies a NEXAFS line scan from a minimal header prefix", () => {
    const hdr = readFileSync(join(fixtureDir, "minimal-line-scan.hdr"), "utf8");
    const peek = hdr.slice(0, HDR_SCAN_TYPE_PEEK_BYTES);
    const probe = probeHdrScanFromText(peek);
    expect(probe.scanType).toBe("NEXAFS Line Scan");
    expect(probe.category).toBe("line_scan");
    expect(probe.isNexafsLineScan).toBe(true);
    expect(isProbedLineScan(probe)).toBe(true);
  });

  it("classifies image scans without reading axis blocks", () => {
    const peek = 'Type = "Image Scan"\nPAxis = { Name = "X"';
    const probe = probeHdrScanFromText(peek);
    expect(probe.scanType).toBe("Image Scan");
    expect(probe.category).toBe("image_scan");
    expect(probe.isNexafsLineScan).toBe(false);
    expect(isProbedLineScan(probe)).toBe(false);
  });

  it("maps focus and stack types using scanTypeCategory rules", () => {
    expect(scanTypeCategory(probeHdrScanFromText('Type = "Focus Scan"').scanType)).toBe(
      "focus_scan",
    );
    expect(scanTypeCategory(probeHdrScanFromText('Type = "Stack"').scanType)).toBe(
      "stack",
    );
  });

  it("returns Unknown when the Type field is missing from the peek", () => {
    const probe = probeHdrScanFromText("PAxis = { Name = \"Energy\"");
    expect(probe.scanType).toBe("Unknown");
    expect(probe.category).toBe("other");
    expect(probe.isNexafsLineScan).toBe(false);
  });
});
