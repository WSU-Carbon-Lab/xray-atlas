import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  moleculeNexafsExperimentHref,
  parseNexafsExperimentSearchParam,
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
