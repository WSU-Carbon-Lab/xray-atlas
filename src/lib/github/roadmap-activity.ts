/**
 * Fetches open GitHub issues, pull requests, and discussions for the roadmap page.
 * Results are cached per Next.js revalidation window; optional token raises rate limits.
 */

import { env } from "~/env.js";
import { XRAY_ATLAS_GITHUB_REPO } from "~/lib/github-beamline-issues";

const REVALIDATE_SECONDS = 600;
const PAGE_SIZE = 10;

export interface GitHubRoadmapLabel {
  name: string;
  color: string;
}

export interface GitHubRoadmapItem {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  labels: GitHubRoadmapLabel[];
  authorLogin: string | null;
}

export interface GitHubRoadmapActivity {
  issues: GitHubRoadmapItem[];
  pullRequests: GitHubRoadmapItem[];
  discussions: GitHubRoadmapItem[];
  fetchedAt: string;
  discussionsUnavailable: boolean;
}

interface GitHubRestIssue {
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  pull_request?: unknown;
  labels: Array<{ name: string; color: string }>;
  user: { login: string } | null;
}

interface GitHubRestPull {
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  labels: Array<{ name: string; color: string }>;
  user: { login: string } | null;
}

interface GitHubGraphQlResponse {
  data?: {
    repository?: {
      discussions?: {
        nodes: Array<{
          number: number;
          title: string;
          url: string;
          updatedAt: string;
          author: { login: string } | null;
        }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

function parseRepoSlug(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid GitHub repository slug: ${repo}`);
  }
  return { owner, name };
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = env.GITHUB_API_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function toRoadmapItem(
  item: GitHubRestIssue | GitHubRestPull,
): GitHubRoadmapItem {
  return {
    number: item.number,
    title: item.title,
    url: item.html_url,
    updatedAt: item.updated_at,
    labels: item.labels.map((label) => ({
      name: label.name,
      color: label.color,
    })),
    authorLogin: item.user?.login ?? null,
  };
}

async function fetchOpenIssues(
  owner: string,
  name: string,
): Promise<GitHubRoadmapItem[]> {
  const url = new URL(`https://api.github.com/repos/${owner}/${name}/issues`);
  url.searchParams.set("state", "open");
  url.searchParams.set("per_page", String(PAGE_SIZE));
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");

  const response = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GitHubRestIssue[];
  return payload
    .filter((issue) => issue.pull_request === undefined)
    .map(toRoadmapItem);
}

async function fetchOpenPullRequests(
  owner: string,
  name: string,
): Promise<GitHubRoadmapItem[]> {
  const url = new URL(`https://api.github.com/repos/${owner}/${name}/pulls`);
  url.searchParams.set("state", "open");
  url.searchParams.set("per_page", String(PAGE_SIZE));
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");

  const response = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GitHubRestPull[];
  return payload.map(toRoadmapItem);
}

async function fetchDiscussions(
  owner: string,
  name: string,
): Promise<{ items: GitHubRoadmapItem[]; unavailable: boolean }> {
  const query = `
    query RoadmapDiscussions($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(
          first: ${PAGE_SIZE}
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            number
            title
            url
            updatedAt
            author {
              login
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      ...githubHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { owner, name },
    }),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    return { items: [], unavailable: true };
  }

  const payload = (await response.json()) as GitHubGraphQlResponse;
  if (payload.errors?.length) {
    return { items: [], unavailable: true };
  }

  const nodes = payload.data?.repository?.discussions?.nodes ?? [];
  return {
    unavailable: false,
    items: nodes.map((node) => ({
      number: node.number,
      title: node.title,
      url: node.url,
      updatedAt: node.updatedAt,
      labels: [],
      authorLogin: node.author?.login ?? null,
    })),
  };
}

/**
 * Loads recent open GitHub activity for `XRAY_ATLAS_GITHUB_REPO`, tolerating partial
 * failures (for example when repository discussions are disabled).
 */
export async function fetchGitHubRoadmapActivity(): Promise<GitHubRoadmapActivity> {
  const { owner, name } = parseRepoSlug(XRAY_ATLAS_GITHUB_REPO);

  const [issues, pullRequests, discussionsResult] = await Promise.all([
    fetchOpenIssues(owner, name),
    fetchOpenPullRequests(owner, name),
    fetchDiscussions(owner, name),
  ]);

  return {
    issues,
    pullRequests,
    discussions: discussionsResult.items,
    discussionsUnavailable: discussionsResult.unavailable,
    fetchedAt: new Date().toISOString(),
  };
}

export function githubRepoIssuesUrl(): string {
  return `https://github.com/${XRAY_ATLAS_GITHUB_REPO}/issues`;
}

export function githubRepoPullsUrl(): string {
  return `https://github.com/${XRAY_ATLAS_GITHUB_REPO}/pulls`;
}

export function githubRepoDiscussionsUrl(): string {
  return `https://github.com/${XRAY_ATLAS_GITHUB_REPO}/discussions`;
}
