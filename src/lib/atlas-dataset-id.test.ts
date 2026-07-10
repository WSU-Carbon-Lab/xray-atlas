/**
 * Unit tests for opaque Atlas dataset id helpers.
 */

import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  atlasDatasetPath,
  generateAtlasDatasetId,
  isAtlasDatasetId,
  normalizeAtlasDatasetId,
} from "~/lib/atlas-dataset-id";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

describe("atlas-dataset-id", () => {
  it("accepts Crockford base32 ids and rejects ambiguous characters", () => {
    expect(isAtlasDatasetId("k7m2xq4n")).toBe(true);
    expect(isAtlasDatasetId("K7M2XQ4N")).toBe(true);
    expect(isAtlasDatasetId("k7m2xq4i")).toBe(false);
    expect(isAtlasDatasetId("short")).toBe(false);
  });

  it("normalizes case and builds /d/ paths", () => {
    expect(normalizeAtlasDatasetId("K7M2XQ4N")).toBe("k7m2xq4n");
    expect(atlasDatasetPath("k7m2xq4n")).toBe("/d/k7m2xq4n");
  });

  it("generates 8-character ids", () => {
    const id = generateAtlasDatasetId();
    expect(isAtlasDatasetId(id)).toBe(true);
    expect(id.length).toBe(8);
  });
});
