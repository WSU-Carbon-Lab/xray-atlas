import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildStxmPreviewTraceKey,
  isStxmPreviewAggregateTraceKey,
  parseStxmPreviewTraceKey,
  STXM_PREVIEW_AGGREGATE_REGION_ID,
} from "./stxm-preview-trace-key";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("stxm-preview-trace-key", () => {
  it("buildStxmPreviewTraceKey joins scan and region ids", () => {
    expect(buildStxmPreviewTraceKey("scan/a.hdr", "region-1")).toBe(
      "scan/a.hdr::region-1",
    );
  });

  it("parseStxmPreviewTraceKey round-trips built keys", () => {
    const key = buildStxmPreviewTraceKey("scan/a.hdr", "region-1");
    expect(parseStxmPreviewTraceKey(key)).toEqual({
      scanId: "scan/a.hdr",
      regionId: "region-1",
    });
  });

  it("isStxmPreviewAggregateTraceKey detects aggregate sentinel", () => {
    const key = buildStxmPreviewTraceKey(
      "scan/a.hdr",
      STXM_PREVIEW_AGGREGATE_REGION_ID,
    );
    expect(isStxmPreviewAggregateTraceKey(key)).toBe(true);
  });
});
