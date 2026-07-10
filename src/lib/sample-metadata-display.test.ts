import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { ProcessMethod } from "~/prisma/browser";
import {
  coreSampleMetadataRows,
  coreSampleMetadataSections,
} from "./sample-metadata-display";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("coreSampleMetadataRows", () => {
  it("inserts Patterning layer between Substrate and Thickness when set", () => {
    const rows = coreSampleMetadataRows({
      processmethod: ProcessMethod.DRY,
      substrate: "Silicon nitride",
      patterninglayer: "CuI",
      thickness: 100,
    });

    expect(rows.map((row) => row.label)).toEqual([
      "Process method",
      "Substrate",
      "Patterning layer",
      "Thickness (nm)",
    ]);
    expect(rows.find((row) => row.label === "Patterning layer")?.value).toBe(
      "CuI",
    );
  });

  it("omits Patterning layer when blank", () => {
    const rows = coreSampleMetadataRows({
      processmethod: ProcessMethod.DRY,
      substrate: "Silicon nitride",
      patterninglayer: "  ",
      thickness: 100,
    });

    expect(rows.map((row) => row.label)).toEqual([
      "Process method",
      "Substrate",
      "Thickness (nm)",
    ]);
  });
});

describe("coreSampleMetadataSections", () => {
  it("keeps Patterning layer in the Preparation section", () => {
    const sections = coreSampleMetadataSections(
      coreSampleMetadataRows({
        processmethod: ProcessMethod.DRY,
        substrate: "Silicon nitride",
        patterninglayer: "CuI",
        thickness: 100,
      }),
    );

    const preparation = sections.find((section) => section.title === "Preparation");
    expect(preparation?.rows.map((row) => row.label)).toEqual([
      "Process method",
      "Substrate",
      "Patterning layer",
      "Thickness (nm)",
    ]);
  });
});
