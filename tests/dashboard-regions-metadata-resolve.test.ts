import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  mergeLinkedMoleculeIntoRegionsMetadata,
  resolveLinkedMoleculeForScan,
  resolveRegionsMetadataForScan,
  resolveRegionsMetadataForScanWithIngestionFallback,
  type DashboardRegionsStepMetadata,
} from "~/lib/dashboard-processing-session";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const scanA = "beamtime/scan-a.hdr";
const scanB = "beamtime/scan-b.hdr";

const sampleRegionsMetadata = (
  scanId: string,
  sampleLo: number,
): DashboardRegionsStepMetadata => ({
  scanId,
  sampleRegions: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      sampleLo,
      sampleHi: sampleLo + 1,
      spotLabel: "pure",
      role: "pure",
    },
  ],
  izeroBounds: { izeroLo: 10, izeroHi: 11 },
  pureRegionId: "11111111-1111-4111-8111-111111111111",
  weightingMode: "poisson_mle",
});

describe("resolveRegionsMetadataForScan", () => {
  it("prefers per-scan cache over legacy top-level regions", () => {
    const resolved = resolveRegionsMetadataForScan(
      {
        regionsCache: {
          [scanA]: sampleRegionsMetadata(scanA, 2),
        },
        regions: sampleRegionsMetadata(scanB, 99),
      },
      scanA,
    );
    expect(resolved?.sampleRegions?.[0]?.sampleLo).toBe(2);
  });

  it("falls back to legacy regions when scanId matches", () => {
    const legacy = sampleRegionsMetadata(scanA, 5);
    const resolved = resolveRegionsMetadataForScan({ regions: legacy }, scanA);
    expect(resolved?.sampleRegions?.[0]?.sampleLo).toBe(5);
  });

  it("returns undefined when legacy regions belong to another scan", () => {
    const resolved = resolveRegionsMetadataForScan(
      { regions: sampleRegionsMetadata(scanB, 7) },
      scanA,
    );
    expect(resolved).toBeUndefined();
  });

  it("returns undefined when no cache entry or legacy row exists", () => {
    const resolved = resolveRegionsMetadataForScan({}, scanA);
    expect(resolved).toBeUndefined();
  });
});

describe("resolveRegionsMetadataForScanWithIngestionFallback", () => {
  it("falls back to preview ingestion cache normalization windows", () => {
    const resolved = resolveRegionsMetadataForScanWithIngestionFallback(
      {
        regionsCache: {
          [scanA]: {
            scanId: scanA,
            sampleRegions: sampleRegionsMetadata(scanA, 2).sampleRegions,
            izeroBounds: { izeroLo: 10, izeroHi: 11 },
            weightingMode: "poisson_mle",
          },
        },
        preview: {
          spectra: [],
          standardOverlays: [],
          compareScanIds: [],
          compareTraceKeys: [],
          atlasExperiments: [],
          ingestionCache: {
            [scanA]: {
              scanId: scanA,
              computedAt: "2026-01-01T00:00:00.000Z",
              weightingMode: "poisson_mle",
              normalization: {
                preLo: 270,
                preHi: 280,
                postLo: 320,
                postHi: 330,
              },
              energyEv: [280],
              od: [0.1],
              odErr: [0.01],
            },
          },
        },
      },
      scanA,
    );
    expect(resolved?.normalization?.preLo).toBe(270);
    expect(resolved?.normalization?.postHi).toBe(330);
  });
});

describe("resolveLinkedMoleculeForScan", () => {
  it("prefers per-scan regions cache molecule fields", () => {
    const resolved = resolveLinkedMoleculeForScan(
      {
        regionsCache: {
          [scanA]: {
            scanId: scanA,
            linkedMoleculeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            linkedMoleculeLabel: "Y6",
            linkedMoleculeFormula: "C82H86N4O2S5",
            weightingMode: "poisson_mle",
          },
        },
        preview: {
          spectra: [
            {
              scanId: scanB,
              scanLabel: "scan-b",
              keptAt: "2026-01-01T00:00:00.000Z",
              moleculeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              moleculeName: "Other",
            },
          ],
          standardOverlays: [],
          compareScanIds: [],
          compareTraceKeys: [],
          atlasExperiments: [],
        },
      },
      scanA,
    );
    expect(resolved.linkedMoleculeId).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(resolved.linkedMoleculeLabel).toBe("Y6");
    expect(resolved.linkedMoleculeFormula).toBe("C82H86N4O2S5");
  });

  it("falls back to preview spectrum entry when regions cache lacks molecule", () => {
    const resolved = resolveLinkedMoleculeForScan(
      {
        preview: {
          spectra: [
            {
              scanId: scanA,
              scanLabel: "scan-a",
              keptAt: "2026-01-01T00:00:00.000Z",
              moleculeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              moleculeName: "PCBM",
            },
          ],
          standardOverlays: [],
          compareScanIds: [],
          compareTraceKeys: [],
          atlasExperiments: [],
        },
      },
      scanA,
    );
    expect(resolved.linkedMoleculeId).toBe(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(resolved.linkedMoleculeLabel).toBe("PCBM");
  });
});

describe("mergeLinkedMoleculeIntoRegionsMetadata", () => {
  it("preserves existing region locators when merging molecule fields", () => {
    const base = sampleRegionsMetadata(scanA, 4);
    const merged = mergeLinkedMoleculeIntoRegionsMetadata(
      scanA,
      base,
      "poisson_mle",
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        label: "Y6",
        formula: "C82H86N4O2S5",
      },
    );
    expect(merged.sampleRegions?.[0]?.sampleLo).toBe(4);
    expect(merged.linkedMoleculeId).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(merged.linkedMoleculeFormula).toBe("C82H86N4O2S5");
  });

  it("writes molecule-only payload without dropping scan key", () => {
    const merged = mergeLinkedMoleculeIntoRegionsMetadata(
      scanA,
      undefined,
      "poisson_mle",
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        label: "PCBM",
      },
    );
    expect(merged.scanId).toBe(scanA);
    expect(merged.weightingMode).toBe("poisson_mle");
    expect(merged.linkedMoleculeLabel).toBe("PCBM");
    expect(merged.sampleRegions).toBeUndefined();
  });

  it("clears stored molecule linkage when selection is null", () => {
    const merged = mergeLinkedMoleculeIntoRegionsMetadata(
      scanA,
      {
        scanId: scanA,
        linkedMoleculeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        linkedMoleculeLabel: "Y6",
        weightingMode: "poisson_mle",
      },
      "poisson_mle",
      null,
    );
    expect(merged.linkedMoleculeId).toBeUndefined();
    expect(merged.linkedMoleculeLabel).toBeUndefined();
  });
});
