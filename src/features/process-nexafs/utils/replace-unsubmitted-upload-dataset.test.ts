import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { createEmptyDatasetState } from "../types";
import {
  applyIncomingSpectrumOntoUnsubmittedDataset,
  findReplaceableUnsubmittedDataset,
  spectrumUploadIdentity,
  upsertDatasetById,
} from "./replace-unsubmitted-upload-dataset";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeUndefined: () => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function datasetFromName(fileName: string): ReturnType<
  typeof createEmptyDatasetState
> {
  const file = new File(["energy,mu\n280,1"], fileName, {
    type: "text/csv",
  });
  const dataset = createEmptyDatasetState(file);
  dataset.fileName = fileName;
  return dataset;
}

describe("spectrumUploadIdentity", () => {
  it("lowercases and trims display names", () => {
    expect(spectrumUploadIdentity("  N2200 1.xlsx  ")).toBe("n2200 1.xlsx");
  });
});

describe("findReplaceableUnsubmittedDataset", () => {
  it("matches an unsubmitted tab by fileName ignoring case", () => {
    const existing = datasetFromName("N2200 1 - N2200_C_K_edge_TEY_ANSTO_SXR.xlsx");
    existing.moleculeId = "mol-1";
    const found = findReplaceableUnsubmittedDataset(
      [existing],
      "n2200 1 - n2200_c_k_edge_tey_ansto_sxr.xlsx",
    );
    expect(found?.id).toBe(existing.id);
  });

  it("skips datasets that already have a persisted experiment id", () => {
    const existing = datasetFromName("sample.csv");
    existing.persistedExperimentId = "exp-1";
    expect(
      findReplaceableUnsubmittedDataset([existing], "sample.csv"),
    ).toBeUndefined();
  });
});

describe("applyIncomingSpectrumOntoUnsubmittedDataset", () => {
  it("keeps contributor metadata and the existing id on replace", () => {
    const existing = datasetFromName("sample.csv");
    existing.moleculeId = "mol-keep";
    existing.instrumentId = "inst-keep";
    existing.edgeId = "edge-keep";
    existing.attributions = [
      {
        clientId: "attr-1",
        orcid: "0000-0001-2345-6789",
        role: "DataCurator",
        displayName: "A",
        userId: null,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
    ];

    const incoming = datasetFromName("sample.csv");
    incoming.spectrumPoints = [
      { energy: 280, absorption: 1, theta: 55, phi: 0 },
    ];
    incoming.instrumentId = "inst-new";

    const merged = applyIncomingSpectrumOntoUnsubmittedDataset(
      incoming,
      existing,
    );
    expect(merged.id).toBe(existing.id);
    expect(merged.moleculeId).toBe("mol-keep");
    expect(merged.instrumentId).toBe("inst-keep");
    expect(merged.edgeId).toBe("edge-keep");
    expect(merged.attributions).toEqual(existing.attributions);
    expect(merged.spectrumPoints).toEqual(incoming.spectrumPoints);
  });
});

describe("upsertDatasetById", () => {
  it("replaces the matching id instead of appending", () => {
    const first = datasetFromName("a.csv");
    const second = datasetFromName("b.csv");
    const replacement = { ...first, fileName: "a-updated.csv" };
    const next = upsertDatasetById([first, second], replacement);
    expect(next).toHaveLength(2);
    expect(next[0]?.fileName).toBe("a-updated.csv");
    expect(next[1]?.id).toBe(second.id);
  });
});
