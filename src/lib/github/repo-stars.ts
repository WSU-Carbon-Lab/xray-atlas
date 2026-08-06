/**
 * Fetches the public stargazer count for the Atlas GitHub repository.
 * Server-side only so optional `GITHUB_API_TOKEN` can raise rate limits.
 */

import { XRAY_ATLAS_GITHUB_REPO } from "~/lib/github-beamline-issues";
import {
  GITHUB_FETCH_REVALIDATE_SECONDS,
  githubApiHeaders,
} from "~/lib/github/github-api";

interface GitHubRepoResponse {
  stargazers_count?: number;
}

/**
 * Loads `stargazers_count` for `repo` (default Atlas). Returns `null` when the
 * GitHub API is unavailable or the payload is malformed.
 */
export async function fetchGitHubRepoStars(
  repo: string = XRAY_ATLAS_GITHUB_REPO,
): Promise<number | null> {
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
}
