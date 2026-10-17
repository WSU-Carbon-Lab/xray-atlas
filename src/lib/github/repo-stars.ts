/**
 * Fetches the public stargazer count for the Atlas GitHub repository.
 * Server-side only so optional `GITHUB_API_TOKEN` can raise rate limits.
 * Header and footer call this during the same render; `React.cache` collapses
 * those calls onto one in-flight request, and the Next.js fetch cache keeps
 * the response for `GITHUB_FETCH_REVALIDATE_SECONDS`.
 */

import { cache } from "react";
import { XRAY_ATLAS_GITHUB_REPO } from "~/lib/github-beamline-issues";
import {
  GITHUB_FETCH_REVALIDATE_SECONDS,
  githubApiHeaders,
} from "~/lib/github/github-api";

interface GitHubRepoResponse {
  stargazers_count?: number;
}

const fetchGitHubRepoStarsCached = cache(
  async (repo: string): Promise<number | null> => {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: githubApiHeaders(),
        next: { revalidate: GITHUB_FETCH_REVALIDATE_SECONDS },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as GitHubRepoResponse;
      return typeof payload.stargazers_count === "number"
        ? payload.stargazers_count
        : null;
    } catch {
      return null;
    }
  },
);

/**
 * Loads `stargazers_count` for `repo` (default Atlas). Returns `null` when the
 * GitHub API is unavailable or the payload is malformed. Calls in the same
 * server render with the same `repo` share one request.
 */
export async function fetchGitHubRepoStars(
  repo: string = XRAY_ATLAS_GITHUB_REPO,
): Promise<number | null> {
  return fetchGitHubRepoStarsCached(repo);
}
