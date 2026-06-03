import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  contributorFlagsForClaimStatus,
  defaultAttributionPreferencesForRoleSlugs,
  isPendingAttributionForOrcid,
  resolveAttributionPublicDisplay,
  userHasAdminOrMaintainerLineageRole,
} from "./dataset-attribution-claim";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const ORCID = "0000-0002-6371-2123";
const NAME = "Ada Lovelace";
const IMAGE = "https://example.com/ada.jpg";

describe("resolveAttributionPublicDisplay", () => {
  it("shows ORCID only for pending attributions by default", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "pending",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: {
        showNameOnPendingAttributions: false,
        autoAcceptAttributions: false,
      },
      targetRoleSlugs: ["contributor"],
    });
    expect(resolved.displayLabel).toBe(ORCID);
    expect(resolved.displayName).toBe(null);
    expect(resolved.imageUrl).toBe(null);
    expect(resolved.isOrcidOnlyLabel).toBe(true);
  });

  it("shows name without avatar when pending and show-name pref is enabled", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "pending",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: {
        showNameOnPendingAttributions: true,
        autoAcceptAttributions: false,
      },
      targetRoleSlugs: ["contributor"],
    });
    expect(resolved.displayLabel).toBe(NAME);
    expect(resolved.displayName).toBe(NAME);
    expect(resolved.imageUrl).toBe(null);
    expect(resolved.showProfileImage).toBe(false);
  });

  it("shows full profile for pending administrator attributions", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "pending",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: {
        showNameOnPendingAttributions: false,
        autoAcceptAttributions: false,
      },
      targetRoleSlugs: ["administrator"],
    });
    expect(resolved.displayLabel).toBe(NAME);
    expect(resolved.imageUrl).toBe(IMAGE);
    expect(resolved.showProfileImage).toBe(true);
  });

  it("shows ORCID only after decline or unclaim", () => {
    for (const claimStatus of ["declined", "unclaimed"] as const) {
      const resolved = resolveAttributionPublicDisplay({
        orcid: ORCID,
        claimStatus,
        storedDisplayName: NAME,
        storedImageUrl: IMAGE,
        targetPreferences: {
          showNameOnPendingAttributions: true,
          autoAcceptAttributions: true,
        },
        targetRoleSlugs: ["administrator"],
      });
      expect(resolved.displayLabel).toBe(ORCID);
      expect(resolved.isOrcidOnlyLabel).toBe(true);
    }
  });

  it("shows accepted attribution with name and image", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "accepted",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: {
        showNameOnPendingAttributions: false,
        autoAcceptAttributions: false,
      },
      targetRoleSlugs: [],
    });
    expect(resolved.displayLabel).toBe(NAME);
    expect(resolved.imageUrl).toBe(IMAGE);
  });
});

describe("defaultAttributionPreferencesForRoleSlugs", () => {
  it("enables show-name-on-pending for maintainers", () => {
    const prefs = defaultAttributionPreferencesForRoleSlugs(["maintainer"]);
    expect(prefs.showNameOnPendingAttributions).toBe(true);
    expect(prefs.autoAcceptAttributions).toBe(false);
  });
});

describe("userHasAdminOrMaintainerLineageRole", () => {
  it("detects administrator and maintainer slugs only", () => {
    expect(userHasAdminOrMaintainerLineageRole(["administrator"])).toBe(true);
    expect(userHasAdminOrMaintainerLineageRole(["maintainer"])).toBe(true);
    expect(userHasAdminOrMaintainerLineageRole(["contributor"])).toBe(false);
  });
});

describe("contributorFlagsForClaimStatus", () => {
  it("marks accepted rows as claimed and visible", () => {
    const flags = contributorFlagsForClaimStatus("accepted", ORCID);
    expect(flags.isclaimed).toBe(true);
    expect(flags.ispublicprofilevisible).toBe(true);
    expect(flags.detachedat).toBe(null);
  });
});

describe("isPendingAttributionForOrcid", () => {
  it("matches session ORCID on pending rows only", () => {
    expect(
      isPendingAttributionForOrcid({
        orcid: ORCID,
        sessionOrcid: ORCID,
        claimStatus: "pending",
      }),
    ).toBe(true);
    expect(
      isPendingAttributionForOrcid({
        orcid: ORCID,
        sessionOrcid: ORCID,
        claimStatus: "accepted",
      }),
    ).toBe(false);
  });
});
