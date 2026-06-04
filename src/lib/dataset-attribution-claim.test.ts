import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  attributionDisplayModeLabel,
  attributionResearcherAvatarProps,
  autoAcceptModeLabel,
  contributorFlagsForClaimStatus,
  defaultAttributionPreferencesForRoleSlugs,
  effectiveAttributionDisplayPreferences,
  isPendingAttributionForOrcid,
  parseAttributionDisplayPreferences,
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

const defaultPrefs = defaultAttributionPreferencesForRoleSlugs(["contributor"]);

describe("resolveAttributionPublicDisplay", () => {
  it("shows ORCID only for pending attributions by default", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "pending",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: defaultPrefs,
      targetRoleSlugs: ["contributor"],
    });
    expect(resolved.displayLabel).toBe(ORCID);
    expect(resolved.displayName).toBe(null);
    expect(resolved.imageUrl).toBe(null);
    expect(resolved.isOrcidOnlyLabel).toBe(true);
  });

  it("shows name without avatar when pending display pref is name_only", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "pending",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: {
        autoAcceptMode: "off",
        displayPreferences: {
          pending: "name_only",
          accepted: "name_and_avatar",
          unclaimed: "orcid_only",
        },
      },
      targetRoleSlugs: ["contributor"],
    });
    expect(resolved.displayLabel).toBe(NAME);
    expect(resolved.displayName).toBe(NAME);
    expect(resolved.imageUrl).toBe(null);
    expect(resolved.showProfileImage).toBe(false);
    expect(resolved.avatarPlaceholder).toBe("person");
  });

  it("shows full profile for pending administrator attributions", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "pending",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: defaultPrefs,
      targetRoleSlugs: ["administrator"],
    });
    expect(resolved.displayLabel).toBe(NAME);
    expect(resolved.imageUrl).toBe(IMAGE);
    expect(resolved.showProfileImage).toBe(true);
  });

  it("honors unclaimed display preference for declined and unclaimed rows", () => {
    for (const claimStatus of ["declined", "unclaimed"] as const) {
      const resolved = resolveAttributionPublicDisplay({
        orcid: ORCID,
        claimStatus,
        storedDisplayName: NAME,
        storedImageUrl: IMAGE,
        targetPreferences: {
          autoAcceptMode: "off",
          displayPreferences: {
            pending: "orcid_only",
            accepted: "name_and_avatar",
            unclaimed: "name_only",
          },
        },
        targetRoleSlugs: [],
      });
      expect(resolved.displayLabel).toBe(NAME);
      expect(resolved.displayName).toBe(NAME);
      expect(resolved.showProfileImage).toBe(false);
    }
  });

  it("shows accepted attribution with name and image by default", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "accepted",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: defaultPrefs,
      targetRoleSlugs: [],
    });
    expect(resolved.displayLabel).toBe(NAME);
    expect(resolved.imageUrl).toBe(IMAGE);
  });

  it("respects accepted orcid_only display preference", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "accepted",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: {
        autoAcceptMode: "off",
        displayPreferences: {
          pending: "orcid_only",
          accepted: "orcid_only",
          unclaimed: "orcid_only",
        },
      },
      targetRoleSlugs: [],
    });
    expect(resolved.displayLabel).toBe(ORCID);
    expect(resolved.isOrcidOnlyLabel).toBe(true);
  });
});

describe("defaultAttributionPreferencesForRoleSlugs", () => {
  it("uses name_and_avatar pending display for maintainers", () => {
    const prefs = defaultAttributionPreferencesForRoleSlugs(["maintainer"]);
    expect(prefs.displayPreferences.pending).toBe("name_and_avatar");
    expect(prefs.autoAcceptMode).toBe("off");
  });

  it("defaults contributors to orcid_only pending display", () => {
    const prefs = defaultAttributionPreferencesForRoleSlugs(["contributor"]);
    expect(prefs.displayPreferences.pending).toBe("orcid_only");
  });
});

describe("effectiveAttributionDisplayPreferences", () => {
  it("locks pending display for administrator roles", () => {
    const effective = effectiveAttributionDisplayPreferences(
      {
        pending: "orcid_only",
        accepted: "name_only",
        unclaimed: "orcid_only",
      },
      ["administrator"],
    );
    expect(effective.pending).toBe("name_and_avatar");
    expect(effective.accepted).toBe("name_only");
  });
});

describe("parseAttributionDisplayPreferences", () => {
  it("falls back to defaults on invalid JSON", () => {
    const parsed = parseAttributionDisplayPreferences({ pending: "invalid" });
    expect(parsed.pending).toBe("orcid_only");
    expect(parsed.accepted).toBe("name_and_avatar");
  });
});

describe("attributionResearcherAvatarProps", () => {
  it("returns Person placeholder props for ORCID-only display", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "pending",
      storedDisplayName: "Hidden Name",
      storedImageUrl: "https://example.com/a.jpg",
      targetPreferences: {
        autoAcceptMode: "off",
        displayPreferences: {
          pending: "orcid_only",
          accepted: "name_and_avatar",
          unclaimed: "orcid_only",
        },
      },
      targetRoleSlugs: [],
    });
    const props = attributionResearcherAvatarProps({ orcid: ORCID, resolved });
    expect(props.isOrcidOnlyDisplay).toBe(true);
    expect(props.displayName).toBe(ORCID);
    expect(props.imageUrl).toBe(null);
    expect(props.isAtlasProfile).toBe(false);
    expect(props.placeholder).toBe("person");
  });

  it("returns Person placeholder without profile image for name_only display", () => {
    const resolved = resolveAttributionPublicDisplay({
      orcid: ORCID,
      claimStatus: "accepted",
      storedDisplayName: NAME,
      storedImageUrl: IMAGE,
      targetPreferences: {
        autoAcceptMode: "off",
        displayPreferences: {
          pending: "orcid_only",
          accepted: "name_only",
          unclaimed: "orcid_only",
        },
      },
      targetRoleSlugs: [],
    });
    const props = attributionResearcherAvatarProps({ orcid: ORCID, resolved });
    expect(props.isOrcidOnlyDisplay).toBe(false);
    expect(props.displayName).toBe(NAME);
    expect(props.imageUrl).toBe(null);
    expect(props.isAtlasProfile).toBe(false);
    expect(props.placeholder).toBe("person");
  });
});

describe("attributionDisplayModeLabel", () => {
  it("labels display modes for UI chips", () => {
    expect(attributionDisplayModeLabel("orcid_only")).toBe("ORCID only");
    expect(autoAcceptModeLabel("all")).toBe("All new");
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
