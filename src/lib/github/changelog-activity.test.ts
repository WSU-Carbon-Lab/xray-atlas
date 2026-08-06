import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  collectHumanContributors,
  githubRepoMergedPullsUrl,
  isGitHubBotLogin,
} from "./changelog-activity";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("isGitHubBotLogin", () => {
  it("treats empty and whitespace logins as bots", () => {
    expect(isGitHubBotLogin("")).toBe(true);
    expect(isGitHubBotLogin("   ")).toBe(true);
  });

  it("detects [bot] and -bot suffixes", () => {
    expect(isGitHubBotLogin("some-app[bot]")).toBe(true);
    expect(isGitHubBotLogin("release-bot")).toBe(true);
  });

  it("detects known bot allowlist entries", () => {
    expect(isGitHubBotLogin("dependabot[bot]")).toBe(true);
    expect(isGitHubBotLogin("Dependabot")).toBe(true);
    expect(isGitHubBotLogin("github-actions[bot]")).toBe(true);
    expect(isGitHubBotLogin("cursor[bot]")).toBe(true);
  });

  it("keeps human logins", () => {
    expect(isGitHubBotLogin("harlanheilman")).toBe(false);
    expect(isGitHubBotLogin("WSU-Carbon-Lab")).toBe(false);
  });
});

describe("collectHumanContributors", () => {
  it("deduplicates author and commit authors case-insensitively", () => {
    const contributors = collectHumanContributors(
      {
        login: "Alice",
        avatarUrl: "https://example.com/a.png",
        url: "https://github.com/Alice",
      },
      [
        {
          login: "alice",
          avatarUrl: "https://example.com/a2.png",
          url: "https://github.com/alice",
        },
        {
          login: "Bob",
          avatarUrl: "https://example.com/b.png",
          url: "https://github.com/Bob",
        },
      ],
    );

    expect(contributors.map((c) => c.login)).toEqual(["Alice", "Bob"]);
  });

  it("excludes bot author and bot commit authors", () => {
    const contributors = collectHumanContributors(
      { login: "dependabot[bot]" },
      [
        { login: "github-actions[bot]" },
        { login: "carol", url: "https://github.com/carol" },
      ],
    );

    expect(contributors).toEqual([
      {
        login: "carol",
        avatarUrl: "https://avatars.githubusercontent.com/carol",
        profileUrl: "https://github.com/carol",
      },
    ]);
  });

  it("returns an empty list when only bots contributed", () => {
    expect(
      collectHumanContributors({ login: "renovate[bot]" }, [
        { login: "dependabot[bot]" },
      ]),
    ).toEqual([]);
  });
});

describe("githubRepoMergedPullsUrl", () => {
  it("points at merged PRs into main for the Atlas repo", () => {
    const url = new URL(githubRepoMergedPullsUrl());
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/WSU-Carbon-Lab/xray-atlas/pulls");
    expect(url.searchParams.get("q")).toBe("is:pr is:merged base:main");
  });
});
