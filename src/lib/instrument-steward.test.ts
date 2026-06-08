import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  instrumentStewardProfileHref,
  instrumentStewardsForAvatarDisplay,
  resolveInstrumentConnectorSectionView,
} from "./instrument-steward";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveInstrumentConnectorSectionView", () => {
  it("keeps claim actions visible when a steward is assigned", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "not_ready",
      workspaceSlug: undefined,
      steward: {
        instrumentId: "fac_inst",
        userId: "0000-0001-2345-6789",
        name: "Ada Scientist",
        image: null,
        assignedAt: "2026-06-08T12:00:00.000Z",
        claimIssueUrl: null,
        notes: null,
      },
    });
    expect(view.showClaimActions).toBe(true);
    expect(view.showSteward).toBe(true);
    expect(view.showNoWorkspaceNarrative).toBe(true);
  });

  it("shows workspace link and claim actions for beta readiness", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "beta",
      workspaceSlug: "als-5322",
      steward: null,
    });
    expect(view.showWorkspaceLink).toBe(true);
    expect(view.showClaimActions).toBe(true);
    expect(view.showNoWorkspaceNarrative).toBe(false);
  });

  it("hides workspace link when slug is missing despite beta readiness", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "beta",
      workspaceSlug: undefined,
      steward: null,
    });
    expect(view.showWorkspaceLink).toBe(false);
    expect(view.showClaimActions).toBe(true);
  });
});

describe("instrumentStewardProfileHref", () => {
  it("encodes ORCID segments for profile routes", () => {
    expect(instrumentStewardProfileHref("0000-0001-2345-6789")).toBe(
      "/users/0000-0001-2345-6789",
    );
  });
});

describe("instrumentStewardsForAvatarDisplay", () => {
  it("returns an empty list when no steward is assigned", () => {
    expect(instrumentStewardsForAvatarDisplay(null)).toEqual([]);
    expect(instrumentStewardsForAvatarDisplay(undefined)).toEqual([]);
  });

  it("maps a steward to one stacked avatar user with beamline scientist labels", () => {
    const users = instrumentStewardsForAvatarDisplay({
      instrumentId: "fac_inst",
      userId: "0000-0001-2345-6789",
      name: "Ada Scientist",
      image: " https://cdn.example/ada.png ",
      assignedAt: "2026-06-08T12:00:00.000Z",
      claimIssueUrl: null,
      notes: null,
    });
    expect(users).toEqual([
      {
        id: "0000-0001-2345-6789",
        orcid: "0000-0001-2345-6789",
        name: "Ada Scientist",
        image: "https://cdn.example/ada.png",
        isAtlasProfile: true,
        avatarPlaceholder: "initials",
        hoverRoleLabel: "Beamline scientist",
        tooltipSubtitle: "Beamline scientist",
        avatarStackKey: "0000-0001-2345-6789",
      },
    ]);
  });

  it("uses ORCID-only placeholder styling when steward name is missing", () => {
    const users = instrumentStewardsForAvatarDisplay({
      instrumentId: "fac_inst",
      userId: "0000-0001-2345-6789",
      name: null,
      image: null,
      assignedAt: "2026-06-08T12:00:00.000Z",
      claimIssueUrl: null,
      notes: null,
    });
    expect(users[0]?.name).toBe("0000-0001-2345-6789");
    expect(users[0]?.isAtlasProfile).toBe(false);
    expect(users[0]?.avatarPlaceholder).toBe("person");
  });
});
