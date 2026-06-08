import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildOptimisticInstrumentSteward,
  canAddBeamlineScientist,
  instrumentStewardProfileHref,
  instrumentStewardsForAvatarDisplay,
  isInstrumentStewardSearchHitSelected,
  mergeInstrumentStewardIntoFacilityMap,
  mergeInstrumentStewardsIntoFacilityMap,
  resolveInstrumentConnectorSectionView,
  toggleInstrumentStewardSearchHitSelection,
  type InstrumentStewardPublic,
  type InstrumentStewardSearchHit,
} from "./instrument-steward";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const sampleSteward: InstrumentStewardPublic = {
  instrumentId: "fac_inst",
  userId: "0000-0001-2345-6789",
  name: "Ada Scientist",
  image: null,
  assignedAt: "2026-06-08T12:00:00.000Z",
  claimIssueUrl: null,
  notes: null,
};

const secondSteward: InstrumentStewardPublic = {
  instrumentId: "fac_inst",
  userId: "0000-0002-2345-6789",
  name: "Bob Scientist",
  image: null,
  assignedAt: "2026-06-08T13:00:00.000Z",
  claimIssueUrl: null,
  notes: null,
};

describe("resolveInstrumentConnectorSectionView", () => {
  it("shows claim and connector requests when workspace is not ready", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "not_ready",
      workspaceSlug: undefined,
      stewards: [],
    });
    expect(view.hasWorkspace).toBe(false);
    expect(view.showClaimBeamline).toBe(true);
    expect(view.showRequestConnector).toBe(true);
    expect(view.showNoWorkspaceNarrative).toBe(true);
    expect(view.showWorkspaceLink).toBe(false);
  });

  it("keeps claim visible and connector request when stewards are assigned without workspace", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "not_ready",
      workspaceSlug: undefined,
      stewards: [sampleSteward],
    });
    expect(view.showClaimBeamline).toBe(true);
    expect(view.showRequestConnector).toBe(true);
    expect(view.showSteward).toBe(true);
    expect(view.showNoWorkspaceNarrative).toBe(true);
  });

  it("shows workspace link and hides connector request for beta readiness", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "beta",
      workspaceSlug: "als-5322",
      stewards: [],
    });
    expect(view.hasWorkspace).toBe(true);
    expect(view.showWorkspaceLink).toBe(true);
    expect(view.showClaimBeamline).toBe(true);
    expect(view.showRequestConnector).toBe(false);
    expect(view.showNoWorkspaceNarrative).toBe(false);
    expect(view.showSteward).toBe(false);
  });

  it("hides connector request for ready readiness", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "ready",
      workspaceSlug: "als-5322",
      stewards: [sampleSteward],
    });
    expect(view.hasWorkspace).toBe(true);
    expect(view.showRequestConnector).toBe(false);
    expect(view.showClaimBeamline).toBe(true);
    expect(view.showSteward).toBe(true);
  });

  it("hides workspace link when slug is missing despite beta readiness", () => {
    const view = resolveInstrumentConnectorSectionView({
      readiness: "beta",
      workspaceSlug: undefined,
      stewards: [],
    });
    expect(view.showWorkspaceLink).toBe(false);
    expect(view.hasWorkspace).toBe(true);
    expect(view.showRequestConnector).toBe(false);
    expect(view.showClaimBeamline).toBe(true);
  });
});

describe("canAddBeamlineScientist", () => {
  it("allows administrators regardless of steward membership", () => {
    expect(
      canAddBeamlineScientist({
        sessionUserId: "0000-0009-9999-9999",
        canManageUsers: true,
        stewards: [],
      }),
    ).toBe(true);
  });

  it("allows listed stewards when not an administrator", () => {
    expect(
      canAddBeamlineScientist({
        sessionUserId: sampleSteward.userId,
        canManageUsers: false,
        stewards: [sampleSteward],
      }),
    ).toBe(true);
  });

  it("denies unauthenticated and non-steward viewers", () => {
    expect(
      canAddBeamlineScientist({
        sessionUserId: null,
        canManageUsers: false,
        stewards: [sampleSteward],
      }),
    ).toBe(false);
    expect(
      canAddBeamlineScientist({
        sessionUserId: "0000-0009-9999-9999",
        canManageUsers: false,
        stewards: [sampleSteward],
      }),
    ).toBe(false);
  });
});

describe("instrumentStewardProfileHref", () => {
  it("encodes ORCID segments for profile routes", () => {
    expect(instrumentStewardProfileHref("0000-0001-2345-6789")).toBe(
      "/users/0000-0001-2345-6789",
    );
  });
});

describe("mergeInstrumentStewardIntoFacilityMap", () => {
  it("appends a steward to the instrument bucket", () => {
    const merged = mergeInstrumentStewardIntoFacilityMap(
      { fac_inst: [sampleSteward] },
      secondSteward,
    );
    expect(merged.fac_inst?.length).toBe(2);
    expect(merged.fac_inst?.[1]?.userId).toBe(secondSteward.userId);
  });

  it("returns the same map reference content when user id already exists", () => {
    const initial = { fac_inst: [sampleSteward] };
    const merged = mergeInstrumentStewardIntoFacilityMap(initial, sampleSteward);
    expect(merged).toEqual(initial);
    expect(merged.fac_inst?.length).toBe(1);
  });

  it("creates a new instrument bucket when none exists", () => {
    const merged = mergeInstrumentStewardIntoFacilityMap({}, sampleSteward);
    expect(merged.fac_inst).toEqual([sampleSteward]);
  });
});

describe("buildOptimisticInstrumentSteward", () => {
  it("uses display name for Atlas profiles and null name for ORCID-only hits", () => {
    const atlasHit = buildOptimisticInstrumentSteward("inst-1", {
      orcid: sampleSteward.userId,
      displayName: "Ada Scientist",
      imageUrl: "https://cdn.example/ada.png",
      hasAtlasProfile: true,
    });
    expect(atlasHit.instrumentId).toBe("inst-1");
    expect(atlasHit.name).toBe("Ada Scientist");
    expect(atlasHit.image).toBe("https://cdn.example/ada.png");

    const orcidHit = buildOptimisticInstrumentSteward("inst-1", {
      orcid: "0000-0003-1111-2222",
      displayName: "Registry Name",
      imageUrl: null,
      hasAtlasProfile: false,
    });
    expect(orcidHit.name).toBe(null);
    expect(orcidHit.userId).toBe("0000-0003-1111-2222");
  });
});

describe("mergeInstrumentStewardsIntoFacilityMap", () => {
  it("merges multiple stewards without duplicate user ids", () => {
    const thirdSteward: InstrumentStewardPublic = {
      instrumentId: "fac_inst",
      userId: "0000-0003-2345-6789",
      name: "Carol Scientist",
      image: null,
      assignedAt: "2026-06-08T14:00:00.000Z",
      claimIssueUrl: null,
      notes: null,
    };
    const merged = mergeInstrumentStewardsIntoFacilityMap(
      { fac_inst: [sampleSteward] },
      [secondSteward, thirdSteward, sampleSteward],
    );
    expect(merged.fac_inst?.length).toBe(3);
    expect(merged.fac_inst?.map((row) => row.userId)).toEqual([
      sampleSteward.userId,
      secondSteward.userId,
      thirdSteward.userId,
    ]);
  });
});

describe("toggleInstrumentStewardSearchHitSelection", () => {
  const atlasHit: InstrumentStewardSearchHit = {
    orcid: secondSteward.userId,
    displayName: secondSteward.name ?? secondSteward.userId,
    imageUrl: null,
    hasAtlasProfile: true,
  };
  const orcidHit: InstrumentStewardSearchHit = {
    orcid: "0000-0003-1111-2222",
    displayName: "Registry Name",
    imageUrl: null,
    hasAtlasProfile: false,
  };

  it("adds a hit when not selected and removes it when toggled again", () => {
    const afterAdd = toggleInstrumentStewardSearchHitSelection([], atlasHit);
    expect(afterAdd).toEqual([atlasHit]);
    expect(isInstrumentStewardSearchHitSelected(afterAdd, atlasHit.orcid)).toBe(
      true,
    );

    const afterRemove = toggleInstrumentStewardSearchHitSelection(
      afterAdd,
      atlasHit,
    );
    expect(afterRemove).toEqual([]);
    expect(
      isInstrumentStewardSearchHitSelected(afterRemove, atlasHit.orcid),
    ).toBe(false);
  });

  it("deduplicates by ORCID when the same hit is toggled twice in one add pass", () => {
    const once = toggleInstrumentStewardSearchHitSelection([], atlasHit);
    const twice = toggleInstrumentStewardSearchHitSelection(once, atlasHit);
    expect(twice).toEqual([]);
  });

  it("keeps distinct ORCIDs in selection order", () => {
    const merged = toggleInstrumentStewardSearchHitSelection(
      toggleInstrumentStewardSearchHitSelection([], atlasHit),
      orcidHit,
    );
    expect(merged.map((row) => row.orcid)).toEqual([
      atlasHit.orcid,
      orcidHit.orcid,
    ]);
  });
});

describe("beamline scientist add picker cache flow", () => {
  it("documents batch optimistic merge then onSuccess reconciliation", () => {
    const searchHits = [
      {
        orcid: secondSteward.userId,
        displayName: secondSteward.name ?? secondSteward.userId,
        imageUrl: null,
        hasAtlasProfile: true,
      },
      {
        orcid: "0000-0003-1111-2222",
        displayName: "Registry Name",
        imageUrl: null,
        hasAtlasProfile: false,
      },
    ];
    const facilityCache = { fac_inst: [sampleSteward] };

    const optimisticRows = searchHits.map((hit) =>
      buildOptimisticInstrumentSteward("fac_inst", hit),
    );
    const afterMutate = mergeInstrumentStewardsIntoFacilityMap(
      facilityCache,
      optimisticRows,
    );
    expect(afterMutate.fac_inst?.length).toBe(3);

    const serverRow: InstrumentStewardPublic = {
      ...secondSteward,
      assignedAt: "2026-06-08T14:00:00.000Z",
    };
    const afterSuccess = mergeInstrumentStewardIntoFacilityMap(
      afterMutate,
      serverRow,
    );
    expect(afterSuccess.fac_inst?.length).toBe(3);
  });

  it("skips duplicate optimistic rows when the same user is picked twice", () => {
    const searchHit = {
      orcid: sampleSteward.userId,
      displayName: sampleSteward.name ?? sampleSteward.userId,
      imageUrl: null,
      hasAtlasProfile: true,
    };
    const facilityCache = { fac_inst: [sampleSteward] };
    const optimistic = buildOptimisticInstrumentSteward("fac_inst", searchHit);
    const merged = mergeInstrumentStewardIntoFacilityMap(
      facilityCache,
      optimistic,
    );
    expect(merged).toEqual(facilityCache);
    expect(merged.fac_inst?.length).toBe(1);
  });
});

describe("instrumentStewardsForAvatarDisplay", () => {
  it("returns an empty list when no stewards are assigned", () => {
    expect(instrumentStewardsForAvatarDisplay([])).toEqual([]);
    expect(instrumentStewardsForAvatarDisplay(null)).toEqual([]);
    expect(instrumentStewardsForAvatarDisplay(undefined)).toEqual([]);
  });

  it("maps stewards to stacked avatar users with beamline scientist labels", () => {
    const users = instrumentStewardsForAvatarDisplay([
      {
        ...sampleSteward,
        image: " https://cdn.example/ada.png ",
      },
    ]);
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

  it("maps multiple stewards in order and deduplicates by user id", () => {
    const users = instrumentStewardsForAvatarDisplay([
      sampleSteward,
      secondSteward,
      sampleSteward,
    ]);
    expect(users.length).toBe(2);
    expect(users[0]?.id).toBe(sampleSteward.userId);
    expect(users[1]?.id).toBe(secondSteward.userId);
  });

  it("uses ORCID-only placeholder styling when steward name is missing", () => {
    const users = instrumentStewardsForAvatarDisplay([
      {
        ...sampleSteward,
        name: null,
      },
    ]);
    expect(users[0]?.name).toBe("0000-0001-2345-6789");
    expect(users[0]?.isAtlasProfile).toBe(false);
    expect(users[0]?.avatarPlaceholder).toBe("person");
  });
});
