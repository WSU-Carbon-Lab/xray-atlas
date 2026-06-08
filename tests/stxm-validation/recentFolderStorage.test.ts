import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  dedupeRecentFolders,
  normalizeRecentFolderDisplayName,
  RECENT_FOLDERS_MAX,
  type RecentStxmFolder,
} from "~/features/dashboard/lib/localFolderStorage";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const sampleRows = (): RecentStxmFolder[] => [
  {
    handleKey: "key-a",
    displayName: "BL5321 (New STXM)",
    lastOpenedAt: "2026-03-01T10:00:00.000Z",
  },
  {
    handleKey: "key-b",
    displayName: "BL5321 (New STXM)",
    lastOpenedAt: "2026-03-02T10:00:00.000Z",
  },
  {
    handleKey: "key-c",
    displayName: "BL5321 (New STXM)",
    lastOpenedAt: "2026-03-03T10:00:00.000Z",
  },
  {
    handleKey: "key-d",
    displayName: "2026-03(March)",
    lastOpenedAt: "2026-03-04T10:00:00.000Z",
  },
];

describe("normalizeRecentFolderDisplayName", () => {
  it("trims and lowercases display names", () => {
    expect(normalizeRecentFolderDisplayName("  BL5321 (New STXM)  ")).toBe(
      "bl5321 (new stxm)",
    );
  });
});

describe("dedupeRecentFolders", () => {
  it("keeps one row per normalized display name", () => {
    const deduped = dedupeRecentFolders(sampleRows());
    expect(deduped).toHaveLength(2);
    expect(deduped[0]?.displayName).toBe("BL5321 (New STXM)");
    expect(deduped[1]?.displayName).toBe("2026-03(March)");
  });

  it("caps the list at RECENT_FOLDERS_MAX", () => {
    const many: RecentStxmFolder[] = Array.from({ length: 8 }, (_, index) => ({
      handleKey: `key-${index}`,
      displayName: `Folder ${index}`,
      lastOpenedAt: new Date(index).toISOString(),
    }));
    const deduped = dedupeRecentFolders(many);
    expect(deduped).toHaveLength(RECENT_FOLDERS_MAX);
  });
});
