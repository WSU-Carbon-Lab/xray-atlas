import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildAttributionTeamRosterFromSlots,
  filterGeneralTeamMembersForEditor,
} from "./attribution-team-roster-sync";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const PI = "0000-0001-1111-1111";
const LEAD = "0000-0002-2222-2222";
const COLLECTOR = "0000-0003-3333-3333";

describe("buildAttributionTeamRosterFromSlots", () => {
  it("adds Supervisor for the PI slot and removes other PI slot roles", () => {
    const roster = buildAttributionTeamRosterFromSlots({
      members: [
        {
          orcid: "0000-0009-9999-9999",
          contributorType: "ProjectLeader",
          displayName: "Legacy PI",
        },
        {
          orcid: COLLECTOR,
          contributorType: "DataCollector",
          displayName: "Collector",
        },
      ],
      piOrcid: PI,
      experimentLeadOrcid: null,
    });

    expect(
      roster.some(
        (row) => row.orcid === PI && row.contributorType === "Supervisor",
      ),
    ).toBe(true);
    expect(
      roster.some(
        (row) =>
          row.orcid === "0000-0009-9999-9999" &&
          (row.contributorType === "ProjectLeader" ||
            row.contributorType === "Supervisor"),
      ),
    ).toBe(false);
  });

  it("ensures experiment lead has ProjectLeader without dropping other researchers", () => {
    const roster = buildAttributionTeamRosterFromSlots({
      members: [
        {
          orcid: COLLECTOR,
          contributorType: "Researcher",
          displayName: "Other researcher",
        },
      ],
      piOrcid: null,
      experimentLeadOrcid: LEAD,
    });

    expect(
      roster.some(
        (row) => row.orcid === LEAD && row.contributorType === "ProjectLeader",
      ),
    ).toBe(true);
    expect(
      roster.some(
        (row) =>
          row.orcid === COLLECTOR && row.contributorType === "Researcher",
      ),
    ).toBe(true);
  });

  it("replaces legacy Researcher on the experiment-lead ORCID with ProjectLeader", () => {
    const roster = buildAttributionTeamRosterFromSlots({
      members: [
        {
          orcid: LEAD,
          contributorType: "Researcher",
          displayName: "Legacy lead",
        },
      ],
      piOrcid: null,
      experimentLeadOrcid: LEAD,
    });

    expect(
      roster.some(
        (row) => row.orcid === LEAD && row.contributorType === "ProjectLeader",
      ),
    ).toBe(true);
    expect(
      roster.some(
        (row) => row.orcid === LEAD && row.contributorType === "Researcher",
      ),
    ).toBe(false);
  });

  it("dedupes duplicate orcid and role pairs", () => {
    const roster = buildAttributionTeamRosterFromSlots({
      members: [
        {
          orcid: COLLECTOR,
          contributorType: "DataCollector",
          displayName: "Keep",
        },
        {
          orcid: COLLECTOR,
          contributorType: "DataCollector",
          displayName: "Drop",
        },
      ],
      piOrcid: PI,
      experimentLeadOrcid: LEAD,
    });

    const collectorRows = roster.filter(
      (row) =>
        row.orcid === COLLECTOR && row.contributorType === "DataCollector",
    );
    expect(collectorRows.length).toBe(1);
    expect(collectorRows[0]?.displayName).toBe("Keep");
  });
});

describe("filterGeneralTeamMembersForEditor", () => {
  it("hides slot-owned Supervisor and ProjectLeader rows from the general list", () => {
    const filtered = filterGeneralTeamMembersForEditor({
      members: [
        {
          orcid: PI,
          contributorType: "Supervisor",
          displayName: "Supervisor",
        },
        {
          orcid: LEAD,
          contributorType: "ProjectLeader",
          displayName: "Lead",
        },
        {
          orcid: COLLECTOR,
          contributorType: "DataCollector",
          displayName: "Collector",
        },
      ],
      piOrcid: PI,
      experimentLeadOrcid: LEAD,
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.orcid).toBe(COLLECTOR);
  });
});
