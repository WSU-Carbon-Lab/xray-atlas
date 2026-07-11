/**
 * Unit tests for public Atlas citation URL construction.
 */

import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { site } from "~/app/brand";
import { buildPublicAtlasDatasetCitationUrl } from "~/lib/atlas-citation-url";

type ExpectAssertions = {
  toBe: (expected: string) => void;
  toContain: (expected: string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

describe("buildPublicAtlasDatasetCitationUrl", () => {
  it("uses brand production origin with normalized id", () => {
    const url = buildPublicAtlasDatasetCitationUrl("Ab12Cd34");
    expect(url).toBe(`${site.url}/d/ab12cd34`);
    expect(url).toContain("https://xrayatlas.wsu.edu/");
  });
});
