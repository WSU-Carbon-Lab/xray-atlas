import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readHdr } from "~/lib/stxm/readHdr";
import { readXim } from "~/lib/stxm/readXim";
import { loadStxm } from "~/lib/stxm/loadStxm";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("readHdr", () => {
  it("parses axis counts and coordinate arrays from a minimal line scan header", () => {
    const text = readFileSync(
      join(fixtureDir, "minimal-line-scan.hdr"),
      "utf8",
    );
    const meta = readHdr(text);
    expect(meta.paxisCount).toBe(3);
    expect(meta.qaxisCount).toBe(2);
    expect(meta.paxisName).toBe("Photon Energy");
    expect(meta.qaxisName).toBe("Sample Y");
    expect(Array.from(meta.paxisPoints ?? [])).toEqual([280, 290, 300]);
    expect(Array.from(meta.qaxisPoints ?? [])).toEqual([0, 1]);
  });
});

describe("readXim", () => {
  it("reshapes flat ASCII values to hdr dimensions", () => {
    const rows = readXim("1 2\n3 4\n", [2, 2]);
    expect(rows.length).toBe(2);
    expect(Array.from(rows[0] ?? [])).toEqual([1, 2]);
    expect(Array.from(rows[1] ?? [])).toEqual([3, 4]);
  });
});

describe("loadStxm", () => {
  it("reports NEXAFS line scan type and energy bounds", () => {
    const hdrText = readFileSync(
      join(fixtureDir, "minimal-line-scan.hdr"),
      "utf8",
    );
    const ximText = "10 20 30\n40 50 60\n";
    const loaded = loadStxm(hdrText, ximText);
    expect(loaded.isNexafsLineScan).toBe(true);
    expect(loaded.rowCount).toBe(2);
    expect(loaded.colCount).toBe(3);
    expect(loaded.energyMinEv).toBe(280);
    expect(loaded.energyMaxEv).toBe(300);
  });
});
