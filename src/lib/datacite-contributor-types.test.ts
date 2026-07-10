import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  CONTRIBUTOR_ROLE_PICKER_TIER_ORDER,
  DATACITE_CONTRIBUTOR_TYPES,
  contributorCitationSortKey,
  groupContributorRoleOptionsByTier,
  listDataCiteContributorRoleOptions,
} from "./datacite-contributor-types";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  toBeDefined: () => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("listDataCiteContributorRoleOptions", () => {
  it("assigns every DataCite type exactly one picker tier", () => {
    const options = listDataCiteContributorRoleOptions();
    expect(options.length).toBe(DATACITE_CONTRIBUTOR_TYPES.length);
    for (const type of DATACITE_CONTRIBUTOR_TYPES) {
      const match = options.find((o) => o.contributorType === type);
      expect(match?.tier).toBeDefined();
    }
  });

  it("places beamtime and PI-like roles in the primary tier", () => {
    const primary = listDataCiteContributorRoleOptions()
      .filter((o) => o.tier === "primary")
      .map((o) => o.contributorType);
    for (const type of [
      "DataCurator",
      "DataCollector",
      "ProjectLeader",
      "Supervisor",
      "Researcher",
    ] as const) {
      expect(primary).toContain(type);
    }
  });

  it("uses Supervisor and Lead experimenter labels for slot roles", () => {
    const options = listDataCiteContributorRoleOptions();
    const supervisor = options.find((o) => o.contributorType === "Supervisor");
    const projectLeader = options.find(
      (o) => o.contributorType === "ProjectLeader",
    );
    expect(supervisor?.label).toBe("Supervisor");
    expect(supervisor?.subtitle).toBe(undefined);
    expect(projectLeader?.label).toBe("Lead experimenter");
  });
});

describe("groupContributorRoleOptionsByTier", () => {
  it("returns non-empty sections in primary, common, extended order", () => {
    const sections = groupContributorRoleOptionsByTier(
      listDataCiteContributorRoleOptions(),
    );
    expect(sections.map((s) => s.tier)).toEqual([
      ...CONTRIBUTOR_ROLE_PICKER_TIER_ORDER,
    ]);
    expect(sections[0]?.tier).toBe("primary");
    expect(sections[0]?.options.length).toBeGreaterThan(0);
  });
});

describe("contributorCitationSortKey", () => {
  it("ranks lead experimentalist, curator, then PI last", () => {
    expect(contributorCitationSortKey(["ProjectLeader"])).toBe(0);
    expect(contributorCitationSortKey(["DataCurator"])).toBe(1);
    expect(contributorCitationSortKey(["Supervisor"])).toBe(1_000_000);
    expect(contributorCitationSortKey(["ProjectLeader", "Supervisor"])).toBe(
      1_000_000,
    );
  });
});
