import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  overlayKindFromSpectrumKinds,
  SPECTRUM_UPLOAD_XLSX_MIME,
  spectrumUploadKindFromFileName,
  spectrumUploadKindFromMime,
} from "./filenameParser";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("spectrumUploadKindFromFileName", () => {
  it("classifies csv json and xlsx extensions", () => {
    expect(spectrumUploadKindFromFileName("O(K)_TEY.csv")).toBe("csv");
    expect(spectrumUploadKindFromFileName("bundle.JSON")).toBe("json");
    expect(spectrumUploadKindFromFileName("N2200 1.xlsx")).toBe("xlsx");
    expect(spectrumUploadKindFromFileName("notes.txt")).toBeNull();
  });
});

describe("spectrumUploadKindFromMime", () => {
  it("classifies spreadsheet MIME as xlsx during drag", () => {
    expect(spectrumUploadKindFromMime(SPECTRUM_UPLOAD_XLSX_MIME)).toBe("xlsx");
    expect(spectrumUploadKindFromMime("application/vnd.ms-excel")).toBe("xlsx");
    expect(spectrumUploadKindFromMime("text/csv")).toBe("csv");
  });
});

describe("overlayKindFromSpectrumKinds", () => {
  it("returns mixed when kinds disagree", () => {
    expect(overlayKindFromSpectrumKinds(["csv", "xlsx"])).toBe("mixed");
    expect(overlayKindFromSpectrumKinds(["xlsx", "xlsx"])).toBe("xlsx");
    expect(overlayKindFromSpectrumKinds([null, null])).toBeNull();
  });
});
