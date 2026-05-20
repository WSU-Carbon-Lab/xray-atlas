import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildKkDeltaMetadata,
  KK_DELTA_ENGINE_LABEL,
  parseKkDeltaMetadata,
} from "./kkDeltaMetadata";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("parseKkDeltaMetadata", () => {
  it("returns null for invalid input", () => {
    expect(parseKkDeltaMetadata(null)).toBeNull();
    expect(parseKkDeltaMetadata({ source: "unknown" })).toBeNull();
    expect(parseKkDeltaMetadata({ source: "kk_at_upload" })).toBeNull();
  });

  it("round-trips build output", () => {
    const built = buildKkDeltaMetadata({
      source: "kk_browser_recalculate",
      calculatedAt: new Date("2026-05-14T12:00:00.000Z"),
      calculatedByUserId: "user-1",
    });
    const parsed = parseKkDeltaMetadata(built);
    if (parsed == null) {
      throw new Error("expected parsed metadata");
    }
    expect(parsed.source).toBe("kk_browser_recalculate");
    expect(parsed.calculatedAt).toBe("2026-05-14T12:00:00.000Z");
    expect(parsed.calculatedByUserId).toBe("user-1");
    expect(parsed.engineLabel).toBe(KK_DELTA_ENGINE_LABEL);
    expect(parsed.note.length > 0).toBe(true);
  });
});
