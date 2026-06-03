import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  moleculeContributionTypeLabel,
  moleculeContributorAttributionRows,
  normalizeMoleculeContributionType,
  profileMoleculeContributionsFromRows,
} from "./molecule-contribution-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("normalizeMoleculeContributionType", () => {
  it("maps legacy creator and contributor to linked", () => {
    expect(normalizeMoleculeContributionType("creator")).toBe("linked");
    expect(normalizeMoleculeContributionType("contributor")).toBe("linked");
  });

  it("maps legacy editor to edited", () => {
    expect(normalizeMoleculeContributionType("editor")).toBe("edited");
  });

  it("accepts canonical values", () => {
    expect(normalizeMoleculeContributionType("linked")).toBe("linked");
    expect(normalizeMoleculeContributionType("edited")).toBe("edited");
  });

  it("returns null for unknown values", () => {
    expect(normalizeMoleculeContributionType("owner")).toBeNull();
  });
});

describe("moleculeContributionTypeLabel", () => {
  it("returns prescriptive copy", () => {
    expect(moleculeContributionTypeLabel("linked")).toBe(
      "Linked molecule to X-ray Atlas",
    );
    expect(moleculeContributionTypeLabel("edited")).toBe("Edited molecule");
  });
});

describe("profileMoleculeContributionsFromRows", () => {
  it("includes linked when user owns the record", () => {
    expect(
      profileMoleculeContributionsFromRows({
        userId: "0000-0001-2345-6789",
        createdby: "0000-0001-2345-6789",
        contributorTypes: [],
      }),
    ).toEqual(["linked"]);
  });

  it("includes edited from contributor rows", () => {
    expect(
      profileMoleculeContributionsFromRows({
        userId: "0000-0001-2345-6789",
        createdby: null,
        contributorTypes: ["editor"],
      }),
    ).toEqual(["edited"]);
  });

  it("allows linked and edited together", () => {
    expect(
      profileMoleculeContributionsFromRows({
        userId: "0000-0001-2345-6789",
        createdby: "0000-0001-2345-6789",
        contributorTypes: ["edited"],
      }),
    ).toEqual(["linked", "edited"]);
  });
});

describe("moleculeContributorAttributionRows", () => {
  it("dedupes roles per user and sorts labels canonically", () => {
    const user = {
      id: "0000-0001-2345-6789",
      name: "Ada",
      image: null,
    };
    const rows = moleculeContributorAttributionRows([
      { contributionType: "creator", user },
      { contributionType: "editor", user },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.labels).toEqual([
      "Linked molecule to X-ray Atlas",
      "Edited molecule",
    ]);
  });
});
