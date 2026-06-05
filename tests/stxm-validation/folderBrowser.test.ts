import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  isExperimentFolderName,
  sortExperimentFolderNames,
  summarizeBeamtimeFolders,
} from "~/lib/stxm/experimentFolder";
import { resolveStxmDirectoryLayoutFromNames } from "~/features/dashboard/lib/resolveDirectoryLayout";
import {
  parseHdrScanTypeFromText,
  scanCategoryLabel,
  scanTypeCategory,
} from "~/lib/stxm/scanType";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("isExperimentFolderName", () => {
  it("accepts ALS beamtime folder names", () => {
    expect(isExperimentFolderName("2025_10(October)")).toBe(true);
    expect(isExperimentFolderName("2026-03(March)")).toBe(true);
    expect(isExperimentFolderName("misc")).toBe(false);
  });
});

describe("experimentSortKey", () => {
  it("sorts newer beamtimes first", () => {
    const sorted = sortExperimentFolderNames([
      "2024_01(January)",
      "2026-03(March)",
      "2025_10(October)",
    ]);
    expect(sorted[0]).toBe("2026-03(March)");
    expect(sorted[1]).toBe("2025_10(October)");
  });
});

describe("summarizeBeamtimeFolders", () => {
  it("attaches scan counts from a map", () => {
    const counts = new Map([
      ["2025_10(October)", { total: 12, nexafs: 4 }],
    ]);
    const rows = summarizeBeamtimeFolders(["2025_10(October)", "misc"], counts);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.scanCount).toBe(12);
    expect(rows[0]?.nexafsLineScanCount).toBe(4);
  });
});

describe("scanTypeCategory", () => {
  it("maps header types to UI groups", () => {
    const hdr = 'Type = "NEXAFS Line Scan"';
    expect(scanTypeCategory(parseHdrScanTypeFromText(hdr))).toBe("line_scan");
    expect(scanCategoryLabel("focus_scan")).toBe("FOCUS SCANS");
  });
});

describe("resolveStxmDirectoryLayoutFromNames", () => {
  it("treats BL5321 beamtime root with month children as multi-experiment", () => {
    const layout = resolveStxmDirectoryLayoutFromNames(
      "BL5321 (New STXM)",
      ["2026-03(March)", "2025_10(October)", "misc"],
      false,
    );
    expect(layout.mode).toBe("multi-experiment");
    if (layout.mode === "multi-experiment") {
      expect(layout.experimentNames).toHaveLength(2);
      expect(layout.experimentNames[0]).toBe("2026-03(March)");
    }
  });

  it("treats a picked month folder as single-experiment", () => {
    const layout = resolveStxmDirectoryLayoutFromNames(
      "2026-03(March)",
      ["scan_a", "scan_b"],
      false,
    );
    expect(layout.mode).toBe("single-experiment");
    if (layout.mode === "single-experiment") {
      expect(layout.displayName).toBe("2026-03(March)");
    }
  });

  it("treats flat hdr tree as single-experiment when no month folders", () => {
    const layout = resolveStxmDirectoryLayoutFromNames(
      "BL5321 (New STXM)",
      ["line_scans"],
      true,
    );
    expect(layout.mode).toBe("single-experiment");
  });
});
