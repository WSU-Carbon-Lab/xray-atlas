/**
 * Unit tests for per-dataset Zenodo metadata validation against `/d/` URLs.
 */

import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  validateZenodoDatasetMetadata,
  type ZenodoDatasetValidationIssue,
} from "~/server/zenodo/validate-zenodo-dataset-metadata";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

describe("validateZenodoDatasetMetadata", () => {
  it("passes when description and related identifiers use /d/{id}", () => {
    const issues: ZenodoDatasetValidationIssue[] =
      validateZenodoDatasetMetadata({
        atlasDatasetId: "k7m2xq4n",
        expectedDoi: "10.5281/zenodo.99",
        metadata: {
          title: "NEXAFS dataset",
          description:
            '<p>Canonical record on X-ray Atlas: <a href="https://xrayatlas.wsu.edu/d/k7m2xq4n">https://xrayatlas.wsu.edu/d/k7m2xq4n</a>.</p>',
          upload_type: "dataset",
          related_identifiers: [
            {
              identifier: "https://xrayatlas.wsu.edu/d/k7m2xq4n",
              relation: "isIdenticalTo",
              scheme: "url",
            },
          ],
          doi: "10.5281/zenodo.99",
        },
      });
    expect(issues).toEqual([]);
  });

  it("flags missing /d/ URL and related identifier", () => {
    const issues: ZenodoDatasetValidationIssue[] =
      validateZenodoDatasetMetadata({
        atlasDatasetId: "k7m2xq4n",
        metadata: {
          title: "NEXAFS dataset",
          description: "<p>No atlas link</p>",
          upload_type: "dataset",
          related_identifiers: [],
        },
      });
    expect(issues.map((issue) => issue.code)).toEqual([
      "missing_d_url_in_description",
      "missing_related_atlas_url",
    ]);
  });

  it("flags legacy browse URLs", () => {
    const issues: ZenodoDatasetValidationIssue[] =
      validateZenodoDatasetMetadata({
        atlasDatasetId: "k7m2xq4n",
        metadata: {
          title: "NEXAFS dataset",
          description:
            '<p><a href="https://xrayatlas.wsu.edu/browse?nexafsExperiment=11111111-1111-1111-1111-111111111111">legacy</a> and https://xrayatlas.wsu.edu/d/k7m2xq4n</p>',
          upload_type: "dataset",
          related_identifiers: [
            {
              identifier: "https://xrayatlas.wsu.edu/d/k7m2xq4n",
              relation: "isIdenticalTo",
              scheme: "url",
            },
          ],
        },
      });
    expect(issues.some((issue) => issue.code === "legacy_browse_url")).toBe(
      true,
    );
  });
});
