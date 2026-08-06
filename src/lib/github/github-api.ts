/**
 * Shared GitHub REST/GraphQL request helpers for public Atlas repository reads.
 * Uses optional `GITHUB_API_TOKEN` to raise rate limits; caches via Next revalidate.
 */

import { env } from "~/env.js";
import { XRAY_ATLAS_GITHUB_REPO } from "~/lib/github-beamline-issues";

/** Default Next.js fetch revalidation window for GitHub metadata (10 minutes). */
export const GITHUB_FETCH_REVALIDATE_SECONDS = 600;

/**
 * Splits `owner/name` repository slugs into owner and repository name parts.
 */
export function parseGithubRepoSlug(repo: string): {
  owner: string;
  name: string;
} {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid GitHub repository slug: ${repo}`);
  }
  return { owner, name };
}

/**
 * Builds GitHub API headers, attaching `GITHUB_API_TOKEN` when configured.
 */
export function githubApiHeaders(): HeadersInit {
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

/**
 * Canonical Atlas repository slug used by GitHub UI helpers.
 */
export function atlasGithubRepoSlug(): string {
  return XRAY_ATLAS_GITHUB_REPO;
}
