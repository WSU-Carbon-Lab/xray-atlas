import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildZenodoDepositMetadata,
  formatZenodoCreatorName,
  normalizeZenodoOrcid,
  resolveZenodoCreatorFromContributor,
  sortZenodoCreatorsByCitationOrder,
  zenodoCreatorCitationSortKey,
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
    atlasExperimentUrl: "https://xrayatlas.example/d/k7m2xq4n",
    atlasDatasetId: "k7m2xq4n",
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
    sample: {},
    ...overrides,
  };
}

describe("zenodoCreatorCitationSortKey / sortZenodoCreatorsByCitationOrder", () => {
  it("orders lead experimentalist, curator, others, then PI last", () => {
    expect(zenodoCreatorCitationSortKey(["ProjectLeader"])).toBe(0);
    expect(zenodoCreatorCitationSortKey(["DataCurator"])).toBe(1);
    expect(zenodoCreatorCitationSortKey(["DataCollector"])).toBe(2);
    expect(zenodoCreatorCitationSortKey(["Supervisor"])).toBe(1_000_000);
    expect(zenodoCreatorCitationSortKey(["DataCurator", "Supervisor"])).toBe(
      1_000_000,
    );
  });

  it("sorts creators into lead → curator → collector → PI", () => {
    const sorted = sortZenodoCreatorsByCitationOrder([
      {
        creator: { name: "Pi, Ada", orcid: "0000-0000-0000-0004" },
        roles: ["Supervisor"],
        firstSeenIndex: 0,
      },
      {
        creator: { name: "Curator, Cam", orcid: "0000-0000-0000-0002" },
        roles: ["DataCurator"],
        firstSeenIndex: 1,
      },
      {
        creator: { name: "Lead, Lee", orcid: "0000-0000-0000-0001" },
        roles: ["ProjectLeader"],
        firstSeenIndex: 2,
      },
      {
        creator: { name: "Collector, Cole", orcid: "0000-0000-0000-0003" },
        roles: ["DataCollector"],
        firstSeenIndex: 3,
      },
    ]);
    expect(sorted.map((creator) => creator.name)).toEqual([
      "Lead, Lee",
      "Curator, Cam",
      "Collector, Cole",
      "Pi, Ada",
    ]);
  });
});

describe("resolveZenodoCreatorFromContributor", () => {
  it("uses the Atlas profile name when pending prefs allow names", () => {
    expect(
      resolveZenodoCreatorFromContributor({
        orcidId: "0000-0002-1825-0097",
        claimStatus: "pending",
        userName: "Jane Doe",
        displayPreferences: {
          pending: "name_only",
          accepted: "name_and_avatar",
          unclaimed: "orcid_only",
        },
      }),
    ).toEqual({
      name: "Doe, Jane",
      orcid: "0000-0002-1825-0097",
    });
  });

  it("keeps ORCID labeling when pending prefs are orcid_only", () => {
    expect(
      resolveZenodoCreatorFromContributor({
        orcidId: "0000-0002-1825-0097",
        claimStatus: "pending",
        userName: "Jane Doe",
        displayPreferences: {
          pending: "orcid_only",
          accepted: "name_and_avatar",
          unclaimed: "orcid_only",
        },
      }),
    ).toEqual({
      name: "ORCID 0000-0002-1825-0097",
      orcid: "0000-0002-1825-0097",
    });
  });

  it("uses the Atlas profile name after the claim is accepted", () => {
    expect(
      resolveZenodoCreatorFromContributor({
        orcidId: "0000-0002-1825-0097",
        claimStatus: "accepted",
        userName: "Jane Doe",
      }),
    ).toEqual({
      name: "Doe, Jane",
      orcid: "0000-0002-1825-0097",
    });
  });

  it("reverts to ORCID labeling when unclaimed with orcid_only prefs", () => {
    expect(
      resolveZenodoCreatorFromContributor({
        orcidId: "0000-0002-1825-0097",
        claimStatus: "unclaimed",
        userName: "Jane Doe",
      }).name,
    ).toBe("ORCID 0000-0002-1825-0097");
  });
});

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
      "X-ray Atlas NEXAFS Dataset: Polystyrene, C(K), TEY, 5.3.2.2, ALS",
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

  it("embeds sample preparation in description and notes", () => {
    const metadata = buildZenodoDepositMetadata(
      sampleSnapshot({
        sample: {
          processMethod: "Dry",
          substrate: "Silicon nitride",
          patterningLayer: "CuI",
        },
      }),
      { communityId: "xrayatlas" },
    );
    expect(metadata.description).toContain(
      "Sample: process Dry; substrate Silicon nitride; patterning layer CuI",
    );
    expect(metadata.notes).toContain("patterning layer CuI");
    expect(metadata.notes).toContain("Atlas experiment id:");
  });
});
