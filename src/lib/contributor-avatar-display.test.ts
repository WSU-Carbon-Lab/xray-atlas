import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  contributorRoleLabelsForDisplay,
  moleculeContributorAvatarUsers,
  nexafsContributorAvatarUsers,
} from "./contributor-avatar-display";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("contributorRoleLabelsForDisplay", () => {
  it("joins DataCite role labels", () => {
    expect(
      contributorRoleLabelsForDisplay(["DataCurator", "DataCollector"]),
    ).toBe("Data curator (uploader), Data collector");
  });
});

describe("nexafsContributorAvatarUsers", () => {
  it("dedupes by ORCID and attaches role subtitle", () => {
    const users = nexafsContributorAvatarUsers([
      {
        orcid: "0000-0002-1825-0097",
        name: "Ada Lovelace",
        isPublicProfileVisible: true,
        roles: ["DataCurator"],
      },
      {
        orcid: "0000-0002-1825-0097",
        name: "Ada Lovelace",
        isPublicProfileVisible: true,
        roles: ["DataCollector"],
      },
    ]);
    expect(users).toHaveLength(1);
    expect(users[0]?.tooltipSubtitle).toBe(
      "Data curator (uploader), Data collector",
    );
  });
});

describe("moleculeContributorAvatarUsers", () => {
  it("maps contributor rows to avatar users with labels", () => {
    const users = moleculeContributorAvatarUsers({
      contributors: [
        {
          id: "mc-1",
          userId: "0000-0001-2345-6789",
          contributionType: "linked",
          contributedAt: "2024-01-01T00:00:00.000Z",
          user: {
            id: "0000-0001-2345-6789",
            name: "Test User",
            image: null,
            orcid: "0000-0001-2345-6789",
          },
        },
      ],
      createdBy: null,
    });
    expect(users).toHaveLength(1);
    expect(users[0]?.hoverRoleLabel).toBe("Linked molecule to X-ray Atlas");
    expect(users[0]?.avatarPlaceholder).toBe("initials");
    expect(users[0]?.isAtlasProfile).toBe(true);
  });

  it("normalizes profile image URLs for stacked avatars", () => {
    const users = moleculeContributorAvatarUsers({
      contributors: [
        {
          id: "mc-2",
          userId: "0000-0002-1825-0097",
          contributionType: "linked",
          contributedAt: "2024-01-01T00:00:00.000Z",
          user: {
            id: "0000-0002-1825-0097",
            name: "Ada Lovelace",
            image: "  https://cdn.example/avatar.png  ",
            orcid: "0000-0002-1825-0097",
          },
        },
      ],
      createdBy: null,
    });
    expect(users[0]?.image).toBe("https://cdn.example/avatar.png");
    expect(users[0]?.avatarPlaceholder).toBe("initials");
  });
});
