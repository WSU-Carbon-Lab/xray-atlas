import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { percentile, valueToGrayscaleByte } from "~/lib/stxm/heatmap";
import {
  isAllowedStxmFilename,
  StxmValidationError,
  stxmFileKindFromName,
  STXM_MAX_HDR_BYTES,
  STXM_MAX_XIM_BYTES,
  validateStxmFilePair,
  validateStxmFileSize,
  validateStxmHdrMetadata,
} from "~/lib/stxm/validateStxmFile";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toThrow: (expected?: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("isAllowedStxmFilename", () => {
  it("allows hdr and xim only", () => {
    expect(isAllowedStxmFilename("scan.hdr")).toBe(true);
    expect(isAllowedStxmFilename("scan.XIM")).toBe(true);
    expect(isAllowedStxmFilename("scan.exe")).toBe(false);
    expect(stxmFileKindFromName("a.hdr")).toBe("hdr");
  });
});

describe("validateStxmFileSize", () => {
  it("rejects oversize hdr", () => {
    expect(() =>
      validateStxmFileSize(STXM_MAX_HDR_BYTES + 1, "hdr"),
    ).toThrow(StxmValidationError);
  });

  it("accepts experiment-aux sized xim", () => {
    validateStxmFileSize(STXM_MAX_XIM_BYTES, "xim");
  });
});

describe("validateStxmHdrMetadata", () => {
  it("rejects absurd axis counts", () => {
    expect(() =>
      validateStxmHdrMetadata({
        paxisCount: 100_000,
        qaxisCount: 10,
        raw: "",
      }),
    ).toThrow(StxmValidationError);
  });
});

describe("validateStxmFilePair", () => {
  it("requires hdr and xim extensions", () => {
    const hdr = new File(["x"], "a.hdr", { type: "text/plain" });
    const xim = new File(["y"], "a.xim", { type: "application/octet-stream" });
    validateStxmFilePair(hdr, xim);
    expect(() =>
      validateStxmFilePair(new File(["x"], "a.txt", { type: "text/plain" }), xim),
    ).toThrow(StxmValidationError);
  });
});

describe("heatmap preview helpers", () => {
  it("maps linear grayscale with percentile contrast", () => {
    expect(percentile([1, 2, 3, 4, 100], 50)).toBe(3);
    expect(valueToGrayscaleByte(5, 0, 10)).toBe(128);
  });
});
