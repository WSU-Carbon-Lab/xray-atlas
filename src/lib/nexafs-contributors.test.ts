import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { dedupeNexafsContributorsByOrcid } from "./nexafs-contributors";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const ORCID = "0000-0002-6371-2123";

describe("dedupeNexafsContributorsByOrcid", () => {
  it("merges DataCurator and DataCollector rows for the same ORCID", () => {
    const result = dedupeNexafsContributorsByOrcid([
      {
        id: ORCID,
        orcid: ORCID,
        userId: ORCID,
        name: "Uploader",
        image: null,
        isClaimed: true,
        isPublicProfileVisible: true,
        role: "DataCurator",
      },
      {
        id: ORCID,
        orcid: ORCID,
        userId: ORCID,
        name: "Uploader",
        image: null,
        isClaimed: true,
        isPublicProfileVisible: true,
        role: "DataCollector",
      },
    ]);

    expect(result.length).toBe(1);
    expect(result[0]?.orcid).toBe(ORCID);
    expect(result[0]?.roles).toEqual(["DataCurator", "DataCollector"]);
    expect(result[0]?.id).toBe(ORCID);
  });

  it("keeps distinct ORCIDs separate", () => {
    const result = dedupeNexafsContributorsByOrcid([
      {
        id: "0000-0001-1111-1111",
        orcid: "0000-0001-1111-1111",
        userId: "0000-0001-1111-1111",
        name: "A",
        image: null,
        isClaimed: true,
        isPublicProfileVisible: true,
        roles: ["DataCurator"],
      },
      {
        id: "0000-0002-2222-2222",
        orcid: "0000-0002-2222-2222",
        userId: null,
        name: null,
        image: null,
        isClaimed: false,
        isPublicProfileVisible: false,
        roles: ["DataCollector"],
      },
    ]);

    expect(result.length).toBe(2);
  });
});
