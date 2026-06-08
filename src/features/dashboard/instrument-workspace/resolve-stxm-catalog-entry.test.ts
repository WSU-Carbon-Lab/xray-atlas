import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { resolveStxmCatalogEntryForScanId } from "./resolve-stxm-catalog-entry";
import type { StxmCatalogEntry } from "~/lib/stxm";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const catalogEntry = (
  relativePath: string,
  basename: string,
): StxmCatalogEntry => ({
  basename,
  relativePath,
  scanType: "line_scan",
  category: "line_scan",
  isNexafsLineScan: true,
  paxisCount: 10,
  qaxisCount: 10,
  energyMinEv: 270,
  energyMaxEv: 330,
  thumbnailDataUrl: null,
});

describe("resolveStxmCatalogEntryForScanId", () => {
  const catalog = [
    catalogEntry("nested/scan001.hdr", "scan001.hdr"),
    catalogEntry("scan002.hdr", "scan002.hdr"),
  ];

  it("matches exact relativePath keys", () => {
    expect(
      resolveStxmCatalogEntryForScanId("nested/scan001.hdr", catalog)
        ?.relativePath,
    ).toBe("nested/scan001.hdr");
  });

  it("falls back to hdr basename when preview used basename scanId", () => {
    expect(
      resolveStxmCatalogEntryForScanId("scan001.hdr", catalog)?.relativePath,
    ).toBe("nested/scan001.hdr");
  });

  it("uses preview hdrFileName hint when scanId is stale", () => {
    expect(
      resolveStxmCatalogEntryForScanId("stale-key", catalog, {
        scanId: "stale-key",
        scanLabel: "scan001",
        keptAt: "2026-01-01T00:00:00.000Z",
        hdrFileName: "scan001.hdr",
      })?.relativePath,
    ).toBe("nested/scan001.hdr");
  });

  it("returns undefined when no catalog row matches", () => {
    expect(
      resolveStxmCatalogEntryForScanId("missing.hdr", catalog),
    ).toBeUndefined();
  });
});
