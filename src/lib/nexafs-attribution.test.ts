import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  datasetAttributionRowsForAvatarDisplay,
  datasetAttributionsEqual,
  datasetAttributionsFromContributorDtos,
  datasetAttributionsForAvatarDisplay,
  datasetAttributionsToSetAttributionInput,
  dedupeDatasetAttributions,
  filterValidOrcidAttributions,
  listAttributionRoleOptions,
} from "./nexafs-attribution";
import { DATACITE_CONTRIBUTOR_TYPES } from "./datacite-contributor-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const ORCID = "0000-0002-6371-2123";

describe("dedupeDatasetAttributions", () => {
  it("merges duplicate orcid and role rows", () => {
    const result = dedupeDatasetAttributions([
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCollector",
        displayName: null,
        userId: null,
        isClaimed: false,
        hasContributionAgreement: false,
        imageUrl: null,
      },
      {
        clientId: "b",
        orcid: ORCID,
        role: "DataCollector",
        displayName: "Name",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
    ]);
    expect(result.length).toBe(1);
    expect(result[0]?.displayName).toBe("Name");
    expect(result[0]?.isClaimed).toBe(true);
  });

  it("keeps same orcid with different contributor types", () => {
    const result = dedupeDatasetAttributions([
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCurator",
        displayName: "Uploader",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
      {
        clientId: "b",
        orcid: ORCID,
        role: "Researcher",
        displayName: "Uploader",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
    ]);
    expect(result.length).toBe(2);
  });
});

describe("filterValidOrcidAttributions", () => {
  it("drops legacy user UUIDs mistaken for ORCIDs", () => {
    const legacyUuid = "05f4c269-2d65-41f1-a8e1-db19fbb87e4b";
    const result = filterValidOrcidAttributions([
      {
        clientId: "legacy",
        orcid: legacyUuid,
        role: "DataCollector",
        displayName: null,
        userId: legacyUuid,
        isClaimed: false,
        hasContributionAgreement: false,
        imageUrl: null,
      },
      {
        clientId: "valid",
        orcid: ORCID,
        role: "DataCurator",
        displayName: "Uploader",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
    ]);
    expect(result.length).toBe(1);
    expect(result[0]?.orcid).toBe(ORCID);
  });

});

describe("datasetAttributionRowsForAvatarDisplay", () => {
  it("returns one avatar per attribution row including same ORCID with different roles", () => {
    const displays = datasetAttributionRowsForAvatarDisplay([
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCurator",
        displayName: "Uploader",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
      {
        clientId: "b",
        orcid: ORCID,
        role: "DataCollector",
        displayName: "Uploader",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
      {
        clientId: "c",
        orcid: "0000-0001-1111-1111",
        role: "Researcher",
        displayName: "Peer",
        userId: null,
        isClaimed: false,
        hasContributionAgreement: false,
        imageUrl: null,
      },
    ]);
    expect(displays.length).toBe(3);
    expect(displays[0]?.stackKey).toBe(`${ORCID}:DataCurator`);
    expect(displays[1]?.stackKey).toBe(`${ORCID}:DataCollector`);
    expect(displays[2]?.stackKey).toBe("0000-0001-1111-1111:Researcher");
  });
});

describe("datasetAttributionsForAvatarDisplay", () => {
  it("returns one avatar per distinct ORCID", () => {
    const displays = datasetAttributionsForAvatarDisplay([
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCurator",
        displayName: "Uploader",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: "https://example.com/a.jpg",
      },
      {
        clientId: "b",
        orcid: "0000-0001-1111-1111",
        role: "DataCollector",
        displayName: "Collector",
        userId: null,
        isClaimed: false,
        hasContributionAgreement: false,
        imageUrl: null,
      },
    ]);
    expect(displays.length).toBe(2);
    expect(displays[0]?.orcid).toBe(ORCID);
    expect(displays[1]?.orcid).toBe("0000-0001-1111-1111");
    expect(displays[0]?.image).toBe("https://example.com/a.jpg");
  });

  it("uses ORCID label and no image when isOrcidOnlyDisplay is set", () => {
    const displays = datasetAttributionsForAvatarDisplay([
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCollector",
        displayName: null,
        userId: ORCID,
        isClaimed: false,
        hasContributionAgreement: false,
        imageUrl: "https://example.com/hidden.jpg",
        isOrcidOnlyDisplay: true,
      },
    ]);
    expect(displays.length).toBe(1);
    expect(displays[0]?.displayName).toBe(ORCID);
    expect(displays[0]?.image).toBe(null);
    expect(displays[0]?.isOrcidOnlyDisplay).toBe(true);
    expect(displays[0]?.avatarPlaceholder).toBe("person");
  });

  it("uses Person placeholder without image when avatarPlaceholder is person", () => {
    const displays = datasetAttributionsForAvatarDisplay([
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCollector",
        displayName: "Ada Lovelace",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: "https://example.com/hidden.jpg",
        isOrcidOnlyDisplay: false,
        avatarPlaceholder: "person",
      },
    ]);
    expect(displays[0]?.displayName).toBe("Ada Lovelace");
    expect(displays[0]?.image).toBe(null);
    expect(displays[0]?.avatarPlaceholder).toBe("person");
  });
});

describe("datasetAttributionsFromContributorDtos", () => {
  it("maps server contributor rows to editor entries", () => {
    const entries = datasetAttributionsFromContributorDtos([
      {
        id: "contrib-1",
        orcid: ORCID,
        role: "DataCurator",
        userId: ORCID,
        displayName: "Uploader",
        image: null,
        isClaimed: true,
        claimStatus: "accepted",
        isPublicProfileVisible: true,
        hasContributionAgreement: true,
        isOrcidOnlyDisplay: false,
        avatarPlaceholder: "initials",
      },
    ]);
    expect(entries.length).toBe(1);
    expect(entries[0]?.clientId).toBe("contrib-1");
    expect(entries[0]?.orcid).toBe(ORCID);
    expect(entries[0]?.role).toBe("DataCurator");
    expect(entries[0]?.isOrcidOnlyDisplay).toBe(false);
  });
});

describe("datasetAttributionsToSetAttributionInput", () => {
  it("emits orcid and role pairs for setAttributions", () => {
    const payload = datasetAttributionsToSetAttributionInput([
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCollector",
        displayName: null,
        userId: null,
        isClaimed: false,
        hasContributionAgreement: false,
        imageUrl: null,
      },
    ]);
    expect(payload).toEqual([{ orcid: ORCID, role: "DataCollector" }]);
  });
});

describe("datasetAttributionsEqual", () => {
  it("treats duplicate rows as equal after dedupe", () => {
    const left = [
      {
        clientId: "a",
        orcid: ORCID,
        role: "DataCollector" as const,
        displayName: null,
        userId: null,
        isClaimed: false,
        hasContributionAgreement: false,
        imageUrl: null,
      },
    ];
    const right = [
      ...left,
      {
        clientId: "b",
        orcid: ORCID,
        role: "DataCollector" as const,
        displayName: "Name",
        userId: ORCID,
        isClaimed: true,
        hasContributionAgreement: true,
        imageUrl: null,
      },
    ];
    expect(datasetAttributionsEqual(left, right)).toBe(true);
  });
});

describe("listAttributionRoleOptions", () => {
  it("includes every DataCite 4.7 contributor type", () => {
    const options = listAttributionRoleOptions();
    expect(options.length).toBe(DATACITE_CONTRIBUTOR_TYPES.length);
  });

  it("marks DataCurator as required at upload", () => {
    const curator = listAttributionRoleOptions().find(
      (o) => o.contributorType === "DataCurator",
    );
    expect(curator?.requiredAtUpload).toBe(true);
    expect(curator?.tier).toBe("primary");
  });
});
