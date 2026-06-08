import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  dashboardWorkspaceShortcutKey,
  selectRecentWorkspaceSessions,
  workspaceSessionDuplicateIdsToDelete,
  type DashboardStepMetadata,
} from "~/lib/dashboard-processing-session";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  not: ExpectAssertions;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function session(
  id: string,
  updatedAt: string,
  workspace: NonNullable<DashboardStepMetadata["workspace"]>,
) {
  return {
    id,
    instrumentSlug: "als-5322",
    updatedAt,
    stepMetadata: { workspace } satisfies DashboardStepMetadata,
  };
}

describe("dashboard workspace session dedupe", () => {
  it("groups sessions by instrument, folder handle, and beamtime", () => {
    const rootOnly = session("a", "2026-03-01T10:00:00.000Z", {
      folderHandleKey: "bl5321-key",
      folderRootName: "BL5321",
      beamtimeName: null,
      activeTab: "experiment",
      selectedScanRelativePath: null,
      selectedScanBasename: null,
    });
    const rootDuplicate = session("b", "2026-03-02T10:00:00.000Z", {
      folderHandleKey: "bl5321-key",
      folderRootName: "BL5321",
      beamtimeName: null,
      activeTab: "experiment",
      selectedScanRelativePath: null,
      selectedScanBasename: null,
    });
    const beamtimeSpecific = session("c", "2026-03-03T10:00:00.000Z", {
      folderHandleKey: "bl5321-key",
      folderRootName: "BL5321",
      beamtimeName: "2026-03(March)",
      activeTab: "experiment",
      selectedScanRelativePath: null,
      selectedScanBasename: null,
    });

    expect(dashboardWorkspaceShortcutKey(rootOnly)).toBe(
      dashboardWorkspaceShortcutKey(rootDuplicate),
    );
    expect(dashboardWorkspaceShortcutKey(rootOnly)).not.toBe(
      dashboardWorkspaceShortcutKey(beamtimeSpecific),
    );
  });

  it("selectRecentWorkspaceSessions keeps newest per shortcut", () => {
    const rows = [
      session("old", "2026-03-01T10:00:00.000Z", {
        folderHandleKey: "key-a",
        folderRootName: "BL5321",
        beamtimeName: null,
        activeTab: "experiment",
        selectedScanRelativePath: null,
        selectedScanBasename: null,
      }),
      session("newest-root", "2026-03-04T10:00:00.000Z", {
        folderHandleKey: "key-a",
        folderRootName: "BL5321",
        beamtimeName: null,
        activeTab: "experiment",
        selectedScanRelativePath: null,
        selectedScanBasename: null,
      }),
      session("beamtime", "2026-03-03T10:00:00.000Z", {
        folderHandleKey: "key-a",
        folderRootName: "BL5321",
        beamtimeName: "2026-03(March)",
        activeTab: "experiment",
        selectedScanRelativePath: null,
        selectedScanBasename: null,
      }),
    ];

    const recent = selectRecentWorkspaceSessions(rows, 5);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.id).toBe("newest-root");
    expect(recent[1]?.id).toBe("beamtime");
  });

  it("workspaceSessionDuplicateIdsToDelete lists older duplicates only", () => {
    const rows = [
      session("keep", "2026-03-04T10:00:00.000Z", {
        folderHandleKey: "key-a",
        folderRootName: "BL5321",
        beamtimeName: null,
        activeTab: "experiment",
        selectedScanRelativePath: null,
        selectedScanBasename: null,
      }),
      session("drop-1", "2026-03-02T10:00:00.000Z", {
        folderHandleKey: "key-a",
        folderRootName: "BL5321",
        beamtimeName: null,
        activeTab: "experiment",
        selectedScanRelativePath: null,
        selectedScanBasename: null,
      }),
      session("drop-2", "2026-03-01T10:00:00.000Z", {
        folderHandleKey: "key-a",
        folderRootName: "BL5321",
        beamtimeName: null,
        activeTab: "experiment",
        selectedScanRelativePath: null,
        selectedScanBasename: null,
      }),
    ];

    expect(workspaceSessionDuplicateIdsToDelete(rows)).toEqual([
      "drop-1",
      "drop-2",
    ]);
  });
});
