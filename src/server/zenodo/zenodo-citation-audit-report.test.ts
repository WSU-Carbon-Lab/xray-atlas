/**
 * Unit tests for Zenodo citation audit markdown formatting.
 */

import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { formatZenodoCitationAuditMarkdown } from "~/server/zenodo/zenodo-citation-audit-report";

type ExpectAssertions = {
  toContain: (expected: string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

describe("formatZenodoCitationAuditMarkdown", () => {
  it("summarizes a clean audit", () => {
    const md = formatZenodoCitationAuditMarkdown({
      generatedAt: "2026-07-10T00:00:00.000Z",
      mode: "audit",
      totalPublished: 2,
      requiredUpdateCount: 0,
      requiredUpdates: [],
      passed: [],
    });
    expect(md).toContain("Updates required: **0**");
    expect(md).toContain("All published Zenodo deposits match");
  });

  it("lists required updates with issue codes", () => {
    const md = formatZenodoCitationAuditMarkdown({
      generatedAt: "2026-07-10T00:00:00.000Z",
      mode: "audit",
      totalPublished: 1,
      requiredUpdateCount: 1,
      requiredUpdates: [
        {
          experimentId: "22222222-2222-2222-2222-222222222222",
          atlasDatasetId: "k7m2xq4n",
          doi: "10.5281/zenodo.1",
          zenodoDepositionId: 1,
          issues: [
            {
              code: "title_drift",
              message: "Title drift: Zenodo has old title",
            },
          ],
          plannedAction: "metadata_sync",
          expectedTitle: "X-ray Atlas NEXAFS Dataset: …",
          remoteTitle: "old title",
        },
      ],
      passed: [],
    });
    expect(md).toContain("`k7m2xq4n`");
    expect(md).toContain("`title_drift`");
    expect(md).toContain("choose **apply**");
  });
});