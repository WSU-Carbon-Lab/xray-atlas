import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildZenodoDepositMetadata,
  formatZenodoCreatorName,
  normalizeZenodoOrcid,
  type ZenodoMetadataExperimentSnapshot,
} from "~/server/zenodo/build-zenodo-metadata";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: string) => void;
  toBeUndefined: () => void;
  not: {
    toContain: (expected: string) => void;
  };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function sampleSnapshot(
  overrides: Partial<ZenodoMetadataExperimentSnapshot> = {},
): ZenodoMetadataExperimentSnapshot {
  return {
    experimentId: "11111111-1111-1111-1111-111111111111",
    canonicalSlug: "polystyrene-c-k-tey-1",
    moleculeDisplayName: "Polystyrene",
    moleculeIupacName: "poly(styrene)",
    moleculeSlug: "polystyrene",
    chemicalFormula: "C8H8",
    edgeTargetAtom: "C",
    edgeCoreState: "K",
    instrumentName: "5.3.2.2",
    facilityName: "ALS",
    experimentTypeLabel: "TEY",
    atlasExperimentUrl:
      "https://xrayatlas.example/molecules/polystyrene?nexafsExperiment=11111111-1111-1111-1111-111111111111",
    creators: [
      { name: "Doe, Jane", orcid: "0000-0002-1825-0097" },
      { name: "Smith, John" },
    ],
    relatedIdentifiers: [
      {
        identifier: "10.1000/source-paper",
        relation: "isSupplementTo",
        scheme: "doi",
      },
    ],
    ...overrides,
  };
}

describe("formatZenodoCreatorName", () => {
  it("converts Given Family to Family, Given", () => {
    expect(formatZenodoCreatorName("Jane Doe")).toBe("Doe, Jane");
  });

  it("strips leading @ from handle-like names", () => {
    expect(formatZenodoCreatorName("@Jane Doe")).toBe("Doe, Jane");
  });
});

describe("normalizeZenodoOrcid", () => {
  it("strips ORCID URL prefixes", () => {
    expect(normalizeZenodoOrcid("https://orcid.org/0000-0002-1825-0097")).toBe(
      "0000-0002-1825-0097",
    );
  });

  it("rejects malformed values", () => {
    expect(normalizeZenodoOrcid("not-an-orcid")).toBeUndefined();
  });
});

describe("buildZenodoDepositMetadata", () => {
  it("builds dataset metadata with community and related identifiers", () => {
    const metadata = buildZenodoDepositMetadata(sampleSnapshot(), {
      communityId: "xrayatlas",
    });
    expect(metadata.upload_type).toBe("dataset");
    expect(metadata.access_right).toBe("open");
    expect(metadata.license).toBe("cc-by-4.0");
    expect(metadata.communities).toEqual([{ identifier: "xrayatlas" }]);
    expect(metadata.title).toBe(
      "NEXAFS dataset: Polystyrene, C(K), TEY, 5.3.2.2, ALS",
    );
    expect(metadata.description).toContain("xrayatlas.example");
    expect(metadata.description).not.toContain(" @ ");
    expect(metadata.creators[0]?.orcid).toBe("0000-0002-1825-0097");
    expect(metadata.related_identifiers?.[0]?.identifier).toBe(
      "10.1000/source-paper",
    );
    expect(metadata.related_identifiers?.[0]?.relation).toBe("isSupplementTo");
  });

  it("omits related_identifiers when none are present", () => {
    const metadata = buildZenodoDepositMetadata(
      sampleSnapshot({ relatedIdentifiers: [] }),
      { communityId: "xrayatlas" },
    );
    expect(metadata.related_identifiers).toBeUndefined();
  });
});
