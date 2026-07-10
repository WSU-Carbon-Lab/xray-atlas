import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  moleculeNexafsExperimentHref,
  parseNexafsExperimentSearchParam,
  pathnameWithoutNexafsExperimentDeepLink,
} from "~/lib/nexafs-experiment-deep-link";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const EXPERIMENT_ID = "869dcdef-134e-454d-882b-fdcd2596715d";

describe("parseNexafsExperimentSearchParam", () => {
  it("accepts a UUID", () => {
    expect(parseNexafsExperimentSearchParam(EXPERIMENT_ID)).toBe(EXPERIMENT_ID);
  });

  it("rejects empty and malformed values", () => {
    expect(parseNexafsExperimentSearchParam(null)).toBeNull();
    expect(parseNexafsExperimentSearchParam("")).toBeNull();
    expect(parseNexafsExperimentSearchParam("not-a-uuid")).toBeNull();
  });
});

describe("moleculeNexafsExperimentHref", () => {
  it("builds a molecule deep-link path", () => {
    expect(moleculeNexafsExperimentHref("polystyrene", EXPERIMENT_ID)).toBe(
      `/molecules/polystyrene?nexafsExperiment=${EXPERIMENT_ID}`,
    );
  });
});

describe("pathnameWithoutNexafsExperimentDeepLink", () => {
  it("strips a matching nexafsExperiment param", () => {
    expect(
      pathnameWithoutNexafsExperimentDeepLink(
        "/molecules/polystyrene",
        `?nexafsExperiment=${EXPERIMENT_ID}`,
        EXPERIMENT_ID,
      ),
    ).toBe("/molecules/polystyrene");
  });

  it("preserves unrelated query keys", () => {
    expect(
      pathnameWithoutNexafsExperimentDeepLink(
        "/molecules/polystyrene",
        `?nexafsExperiment=${EXPERIMENT_ID}&sort=favorites`,
        EXPERIMENT_ID,
      ),
    ).toBe("/molecules/polystyrene?sort=favorites");
  });

  it("returns null when the param is absent or for another experiment", () => {
    expect(
      pathnameWithoutNexafsExperimentDeepLink(
        "/molecules/polystyrene",
        "",
        EXPERIMENT_ID,
      ),
    ).toBeNull();
    expect(
      pathnameWithoutNexafsExperimentDeepLink(
        "/molecules/polystyrene",
        "?nexafsExperiment=11111111-1111-1111-1111-111111111111",
        EXPERIMENT_ID,
      ),
    ).toBeNull();
  });
});
