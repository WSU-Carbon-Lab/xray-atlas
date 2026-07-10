import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { createEmptyDatasetState } from "../types";
import { computeUploadDatasetDiagnostics } from "./upload-dataset-diagnostics";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function sampleDataset() {
  const file = new File(["energy,mu\n"], "test.csv", { type: "text/csv" });
  const dataset = createEmptyDatasetState(file);
  dataset.spectrumPoints = [
    { energy: 280, absorption: 0.05, od: 0.02 },
    { energy: 281, absorption: 0.08, od: 0.04 },
    { energy: 282, absorption: 0.12, od: 0.08 },
    { energy: 283, absorption: 0.18, od: 0.15 },
    { energy: 284, absorption: 0.25, od: 0.22 },
    { energy: 285, absorption: 0.35, od: 0.32 },
    { energy: 286, absorption: 0.48, od: 0.45 },
    { energy: 287, absorption: 0.62, od: 0.58 },
    { energy: 288, absorption: 0.78, od: 0.74 },
    { energy: 289, absorption: 0.92, od: 0.88 },
  ];
  dataset.columnMappings = {
    energy: "energy",
    absorption: "mu",
    od: "od",
  };
  dataset.normalizationScope = "unified";
  dataset.normalizationRegions = {
    pre: [280, 281.5],
    post: [287.5, 289],
  };
  return dataset;
}

describe("computeUploadDatasetDiagnostics", () => {
  it("returns null when no spectrum rows exist", () => {
    const file = new File(["x"], "empty.csv", { type: "text/csv" });
    const dataset = createEmptyDatasetState(file);
    expect(computeUploadDatasetDiagnostics(dataset)).toBeNull();
  });

  it("recomputes normalization distance when post-edge window moves", () => {
    const tightPost = sampleDataset();
    const widePost = sampleDataset();
    widePost.normalizationRegions.post = [286, 289];

    const tight = computeUploadDatasetDiagnostics(tightPost);
    const wide = computeUploadDatasetDiagnostics(widePost);

    if (tight == null || wide == null) {
      throw new Error("expected diagnostics for both normalization windows");
    }

    const tightDistance = tight.qualityScores.perChannel.od
      .normalizationTargetDistance;
    const wideDistance = wide.qualityScores.perChannel.od
      .normalizationTargetDistance;

    if (tightDistance == null || wideDistance == null) {
      throw new Error("expected finite normalization distances");
    }
    expect(wideDistance).toBeGreaterThan(tightDistance);
  });
});
