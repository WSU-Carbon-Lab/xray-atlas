import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  isExperimentFolderName,
  listBeamtimeExperimentFolders,
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
  toContain: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("isExperimentFolderName", () => {
  it("accepts ALS beamtime folder names", () => {
    expect(isExperimentFolderName("2025_10(October)")).toBe(true);
    expect(isExperimentFolderName("2026-03(March)")).toBe(true);
    expect(isExperimentFolderName("2024_06")).toBe(true);
    expect(isExperimentFolderName("2024-06")).toBe(true);
    expect(isExperimentFolderName("2024_06 (June)")).toBe(true);
    expect(isExperimentFolderName("2024.06(June)")).toBe(true);
    expect(isExperimentFolderName("misc")).toBe(false);
    expect(isExperimentFolderName("BL5321 (New STXM)")).toBe(false);
  });
});

describe("listBeamtimeExperimentFolders", () => {
  it("includes every visible sibling when any dated folder exists", () => {
    const names = listBeamtimeExperimentFolders([
      "2026-03(March)",
      "2025_10(October)",
      "Archive",
      "misc",
      ".hidden",
    ]);
    expect(names).toHaveLength(4);
    expect(names).toContain("Archive");
    expect(names).toContain("misc");
  });

  it("returns only dated folders when no beamline siblings match", () => {
    const names = listBeamtimeExperimentFolders(["misc", "calibration"]);
    expect(names).toHaveLength(0);
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
    const rows = summarizeBeamtimeFolders(
      ["2025_10(October)", "2026-03(March)", "misc"],
      counts,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]?.name).toBe("2026-03(March)");
    expect(rows[1]?.name).toBe("2025_10(October)");
    expect(rows[1]?.scanCount).toBe(12);
    expect(rows[1]?.nexafsLineScanCount).toBe(4);
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
      expect(layout.experimentNames).toHaveLength(3);
      expect(layout.experimentNames[0]).toBe("2026-03(March)");
      expect(layout.experimentNames[2]).toBe("misc");
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
