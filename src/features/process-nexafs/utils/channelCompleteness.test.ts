import {
  describe as bunDescribe,
  it as bunIt,
  expect as bunExpect,
} from "bun:test";
import {
  classifyColumnFillStatus,
  datasetHasResolvablePrimary,
  inferPrimaryRepresentation,
} from "./channelCompleteness";
import type { CSVColumnMappings } from "../types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function filledRows(
  columns: Record<string, number[]>,
): Record<string, unknown>[] {
  const length = Object.values(columns)[0]?.length ?? 0;
  return Array.from({ length }, (_, rowIndex) => {
    const row: Record<string, unknown> = {};
    for (const [key, values] of Object.entries(columns)) {
      row[key] = values[rowIndex];
    }
    return row;
  });
}

describe("channelCompleteness", () => {
  it("requires explicit choice when mu and processed columns are both filled", () => {
    const rows = filledRows({
      Energy: [280, 290],
      mu: [0.12, 0.45],
      beta: [1.1e-5, 4.2e-5],
    });
    const mappings: CSVColumnMappings = {
      energy: "Energy",
      absorption: "mu",
      beta: "beta",
    };
    const fillStatus = classifyColumnFillStatus(rows, mappings);
    const inferred = inferPrimaryRepresentation({ mappings, fillStatus });
    expect(inferred?.needsExplicitChoice).toBe(true);
    expect(inferred?.primaryRepresentation).toBe("beta");
  });

  it("blocks resolvable primary until ambiguous inference is confirmed", () => {
    const rows = filledRows({
      Energy: [280, 290],
      mu: [0.12, 0.45],
      beta: [1.1e-5, 4.2e-5],
    });
    const mappings: CSVColumnMappings = {
      energy: "Energy",
      absorption: "mu",
      beta: "beta",
    };
    const fillStatus = classifyColumnFillStatus(rows, mappings);
    expect(
      datasetHasResolvablePrimary({
        mappings,
        fillStatus,
        primaryRepresentation: "beta",
        primaryRepresentationLocked: false,
        primaryInferenceNeedsChoice: true,
      }),
    ).toBe(false);
    expect(
      datasetHasResolvablePrimary({
        mappings,
        fillStatus,
        primaryRepresentation: "beta",
        primaryRepresentationLocked: true,
        primaryInferenceNeedsChoice: false,
      }),
    ).toBe(true);
  });
});
