import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { discoverStxmPairsFromAuxFiles } from "~/lib/stxm/pairStxmFiles";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("discoverStxmPairsFromAuxFiles", () => {
  it("pairs hdr with _a.xim suffix", () => {
    const pairs = discoverStxmPairsFromAuxFiles([
      { id: "h1", originalFilename: "scan001.hdr" },
      { id: "x1", originalFilename: "scan001_a.xim" },
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.hdrExperimentFileId).toBe("h1");
    expect(pairs[0]?.ximExperimentFileId).toBe("x1");
  });
});
