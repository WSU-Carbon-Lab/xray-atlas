/**
 * Fetches recently merged pull requests for the roadmap changelog section.
 * Uses REST (same reliability path as open roadmap activity) and attributes
 * human GitHub contributors per PR; excludes bot accounts.
 */

import { XRAY_ATLAS_GITHUB_REPO } from "~/lib/github-beamline-issues";
import {
  GITHUB_FETCH_REVALIDATE_SECONDS,
  githubApiHeaders,
  parseGithubRepoSlug,
} from "~/lib/github/github-api";

const PAGE_SIZE = 25;

/** Logins treated as non-human even when they lack a `[bot]` suffix. */
const BOT_LOGIN_ALLOWLIST = new Set([
  "dependabot",
  "dependabot[bot]",
  "github-actions",
  "github-actions[bot]",
  "renovate",
  "renovate[bot]",
  "cursor",
  "cursor[bot]",
  "copilot",
  "copilot-swe-agent[bot]",
  "web-flow",
]);

export interface GitHubChangelogContributor {
  login: string;
  avatarUrl: string;
  profileUrl: string;
}

export interface GitHubChangelogEntry {
  number: number;
  title: string;
  url: string;
  mergedAt: string;
  contributors: GitHubChangelogContributor[];
}

export interface GitHubChangelogActivity {
  entries: GitHubChangelogEntry[];
  fetchedAt: string;
  unavailable: boolean;
}

/** Minimal GitHub actor fields used when attributing changelog contributors. */
export interface GitHubChangelogActor {
  login: string;
  avatarUrl?: string;
  url?: string;
}

interface GitHubRestPullUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubRestPull {
  number: number;
  title: string;
  html_url: string;
  merged_at: string | null;
  user: GitHubRestPullUser | null;
}

/**
 * Reports whether `login` should be omitted from human contributor attribution.
 */
export function isGitHubBotLogin(login: string): boolean {
  const normalized = login.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  if (BOT_LOGIN_ALLOWLIST.has(normalized)) {
    return true;
  }
  return normalized.endsWith("[bot]") || normalized.endsWith("-bot");
}

function contributorFromActor(
  actor: GitHubChangelogActor | null | undefined,
): GitHubChangelogContributor | null {
  if (!actor?.login || isGitHubBotLogin(actor.login)) {
    return null;
  }
  const login = actor.login;
  const avatarTrimmed = actor.avatarUrl?.trim();
  const urlTrimmed = actor.url?.trim();
  return {
    login,
    avatarUrl:
      avatarTrimmed && avatarTrimmed.length > 0
        ? avatarTrimmed
        : `https://avatars.githubusercontent.com/${encodeURIComponent(login)}`,
    profileUrl:
      urlTrimmed && urlTrimmed.length > 0
        ? urlTrimmed
        : `https://github.com/${encodeURIComponent(login)}`,
  };
}

/**
 * Builds a deduplicated human contributor list from a PR author and optional commit authors.
 */
export function collectHumanContributors(
  author: GitHubChangelogActor | null | undefined,
  commitAuthors: ReadonlyArray<GitHubChangelogActor | null | undefined> = [],
): GitHubChangelogContributor[] {
  const byLogin = new Map<string, GitHubChangelogContributor>();

  const push = (actor: GitHubChangelogActor | null | undefined): void => {
    const contributor = contributorFromActor(actor);
    if (!contributor) {
      return;
    }
    const key = contributor.login.toLowerCase();
    if (!byLogin.has(key)) {
      byLogin.set(key, contributor);
    }
  };

  push(author);
  for (const commitAuthor of commitAuthors) {
    push(commitAuthor);
  }

  return [...byLogin.values()];
}

function toChangelogEntry(pull: GitHubRestPull): GitHubChangelogEntry | null {
  if (!pull.merged_at) {
    return null;
  }

  const author = pull.user
    ? {
        login: pull.user.login,
        avatarUrl: pull.user.avatar_url,
        url: pull.user.html_url,
      }
    : null;

  return {
    number: pull.number,
    title: pull.title,
    url: pull.html_url,
    mergedAt: pull.merged_at,
    contributors: collectHumanContributors(author),
  };
}

/**
 * Loads recently merged pull requests into `main` for `XRAY_ATLAS_GITHUB_REPO`.
 * Partial API failures yield `unavailable: true` and an empty entry list.
 */
export async function fetchGitHubChangelogActivity(): Promise<GitHubChangelogActivity> {
  const { owner, name } = parseGithubRepoSlug(XRAY_ATLAS_GITHUB_REPO);
  const fetchedAt = new Date().toISOString();

  try {
    const url = new URL(`https://api.github.com/repos/${owner}/${name}/pulls`);
    url.searchParams.set("state", "closed");
    url.searchParams.set("base", "main");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", String(PAGE_SIZE));

    const response = await fetch(url, {
      headers: githubApiHeaders(),
      next: { revalidate: GITHUB_FETCH_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return { entries: [], unavailable: true, fetchedAt };
    }

    const payload = (await response.json()) as GitHubRestPull[];
    if (!Array.isArray(payload)) {
      return { entries: [], unavailable: true, fetchedAt };
    }

    const entries = payload
      .map(toChangelogEntry)
      .filter((entry): entry is GitHubChangelogEntry => entry !== null);

    return {
      entries,
      unavailable: false,
      fetchedAt,
    };
  } catch {
    return { entries: [], unavailable: true, fetchedAt };
  }
}

/**
 * Builds the GitHub closed-and-merged pull requests URL for the Atlas repository.
 */
export function githubRepoMergedPullsUrl(): string {
  return `https://github.com/${XRAY_ATLAS_GITHUB_REPO}/pulls?q=is%3Apr+is%3Amerged+base%3Amain`;
}
