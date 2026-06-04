import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { mergeTeamMembersIntoDatasetAttributions } from "./attribution-team-merge";
import type { DatasetAttributionEntry } from "./nexafs-attribution";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const UPLOADER = "0000-0002-6371-2123";
const PEER = "0000-0001-1111-1111";
const COLLECTOR = "0000-0003-3333-3333";

function entry(
  orcid: string,
  role: DatasetAttributionEntry["role"],
  overrides: Partial<DatasetAttributionEntry> = {},
): DatasetAttributionEntry {
  return {
    clientId: overrides.clientId ?? crypto.randomUUID(),
    orcid,
    role,
    displayName: overrides.displayName ?? null,
    userId: overrides.userId ?? (orcid === UPLOADER ? UPLOADER : null),
    isClaimed: overrides.isClaimed ?? orcid === UPLOADER,
    hasContributionAgreement: overrides.hasContributionAgreement ?? false,
    imageUrl: overrides.imageUrl ?? null,
  };
}

describe("mergeTeamMembersIntoDatasetAttributions", () => {
  it("merges team members without replacing existing attributions", () => {
    const current = [entry(UPLOADER, "DataCurator", { displayName: "Me" })];
    const result = mergeTeamMembersIntoDatasetAttributions({
      currentAttributions: current,
      teamMembers: [
        {
          orcid: PEER,
          contributorType: "DataCollector",
          displayName: "Peer",
          userId: null,
          isClaimed: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
      ],
      uploaderOrcid: UPLOADER,
      uploaderDisplayName: "Me",
      uploaderImageUrl: null,
      uploaderHasContributionAgreement: true,
    });
    expect(result.length).toBe(2);
    expect(
      result.some(
        (row) => row.orcid === PEER && row.role === "DataCollector",
      ),
    ).toBe(true);
    expect(
      result.some(
        (row) => row.orcid === UPLOADER && row.role === "DataCurator",
      ),
    ).toBe(true);
  });

  it("appends uploader as DataCurator when absent from team and current list", () => {
    const result = mergeTeamMembersIntoDatasetAttributions({
      currentAttributions: [],
      teamMembers: [
        {
          orcid: COLLECTOR,
          contributorType: "DataCollector",
          displayName: "Collector",
          userId: null,
          isClaimed: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
      ],
      uploaderOrcid: UPLOADER,
      uploaderDisplayName: "Uploader",
      uploaderImageUrl: null,
      uploaderHasContributionAgreement: true,
    });
    expect(result.length).toBe(2);
    expect(
      result.some(
        (row) => row.orcid === UPLOADER && row.role === "DataCurator",
      ),
    ).toBe(true);
  });

  it("upgrades uploader team role to DataCurator when they are on the roster", () => {
    const result = mergeTeamMembersIntoDatasetAttributions({
      currentAttributions: [],
      teamMembers: [
        {
          orcid: UPLOADER,
          contributorType: "ProjectLeader",
          displayName: "PI",
          userId: UPLOADER,
          isClaimed: true,
          hasContributionAgreement: true,
          imageUrl: null,
        },
        {
          orcid: PEER,
          contributorType: "Researcher",
          displayName: "Peer",
          userId: null,
          isClaimed: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
      ],
      uploaderOrcid: UPLOADER,
      uploaderDisplayName: "PI",
      uploaderImageUrl: null,
      uploaderHasContributionAgreement: true,
    });
    expect(
      result.some(
        (row) => row.orcid === UPLOADER && row.role === "DataCurator",
      ),
    ).toBe(true);
    expect(
      result.some(
        (row) => row.orcid === UPLOADER && row.role === "ProjectLeader",
      ),
    ).toBe(false);
  });

  it("skips non-uploader DataCurator rows from the team", () => {
    const result = mergeTeamMembersIntoDatasetAttributions({
      currentAttributions: [entry(UPLOADER, "DataCurator")],
      teamMembers: [
        {
          orcid: PEER,
          contributorType: "DataCurator",
          displayName: "Other curator",
          userId: PEER,
          isClaimed: true,
          hasContributionAgreement: false,
          imageUrl: null,
        },
        {
          orcid: COLLECTOR,
          contributorType: "DataCollector",
          displayName: "Collector",
          userId: null,
          isClaimed: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
      ],
      uploaderOrcid: UPLOADER,
      uploaderDisplayName: "Me",
      uploaderImageUrl: null,
      uploaderHasContributionAgreement: true,
    });
    expect(
      result.some(
        (row) => row.orcid === PEER && row.role === "DataCurator",
      ),
    ).toBe(false);
    expect(
      result.some(
        (row) => row.orcid === COLLECTOR && row.role === "DataCollector",
      ),
    ).toBe(true);
  });

  it("merges PI and experiment lead roles from a synced roster", () => {
    const result = mergeTeamMembersIntoDatasetAttributions({
      currentAttributions: [entry(UPLOADER, "DataCurator")],
      teamMembers: [
        {
          orcid: PEER,
          contributorType: "Supervisor",
          displayName: "PI",
          userId: null,
          isClaimed: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
        {
          orcid: COLLECTOR,
          contributorType: "ProjectLeader",
          displayName: "Experiment lead",
          userId: null,
          isClaimed: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
      ],
      uploaderOrcid: UPLOADER,
      uploaderDisplayName: "Me",
      uploaderImageUrl: null,
      uploaderHasContributionAgreement: true,
    });

    expect(
      result.some(
        (row) => row.orcid === PEER && row.role === "Supervisor",
      ),
    ).toBe(true);
    expect(
      result.some(
        (row) => row.orcid === COLLECTOR && row.role === "ProjectLeader",
      ),
    ).toBe(true);
  });

  it("dedupes duplicate orcid and role pairs after merge", () => {
    const result = mergeTeamMembersIntoDatasetAttributions({
      currentAttributions: [
        entry(PEER, "DataCollector", { displayName: "Existing" }),
      ],
      teamMembers: [
        {
          orcid: PEER,
          contributorType: "DataCollector",
          displayName: "From team",
          userId: null,
          isClaimed: false,
          hasContributionAgreement: false,
          imageUrl: null,
        },
      ],
      uploaderOrcid: UPLOADER,
      uploaderDisplayName: "Me",
      uploaderImageUrl: null,
      uploaderHasContributionAgreement: false,
    });
    const collectorRows = result.filter(
      (row) => row.orcid === PEER && row.role === "DataCollector",
    );
    expect(collectorRows.length).toBe(1);
    expect(collectorRows[0]?.displayName).toBe("Existing");
  });
});
