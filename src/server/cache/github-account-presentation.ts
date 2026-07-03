import { cachePublicCatalogRead } from "~/server/cache/public-catalog-cache";
import { decryptOAuthToken } from "~/server/auth/oauth-token-crypto";

/** GitHub login and profile URLs resolved from a linked OAuth account. */
export interface GitHubAccountPresentation {
  login: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
}

/**
 * Fetches GitHub login and profile URLs using the stored OAuth access token.
 *
 * Returns null fields when the token is missing, decryption fails, or the GitHub API
 * responds with a non-success status.
 */
export async function resolveGitHubAccountPresentation(account: {
  access_token: string | null;
}): Promise<GitHubAccountPresentation> {
  if (!account.access_token) {
    return { login: null, profileUrl: null, avatarUrl: null };
  }

  const accessToken = decryptOAuthToken(account.access_token);
  if (!accessToken) {
    return { login: null, profileUrl: null, avatarUrl: null };
  }

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!response.ok) {
      return { login: null, profileUrl: null, avatarUrl: null };
    }
    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("login" in body) ||
      typeof body.login !== "string"
    ) {
      return { login: null, profileUrl: null, avatarUrl: null };
    }
    const login = body.login;
    const profileUrl =
      "html_url" in body && typeof body.html_url === "string"
        ? body.html_url
        : `https://github.com/${login}`;
    const avatarUrl =
      "avatar_url" in body && typeof body.avatar_url === "string"
        ? body.avatar_url
        : null;
    return { login, profileUrl, avatarUrl };
  } catch {
    return { login: null, profileUrl: null, avatarUrl: null };
  }
}

/**
 * Signals that a GitHub presentation must not be stored in `unstable_cache`.
 */
class GitHubPresentationNotCacheable extends Error {
  readonly presentation: GitHubAccountPresentation;

  constructor(presentation: GitHubAccountPresentation) {
    super("GitHub presentation is not cacheable");
    this.name = "GitHubPresentationNotCacheable";
    this.presentation = presentation;
  }
}

/**
 * Returns GitHub presentation for public profile reads, caching only successful lookups.
 *
 * Empty results (decryption failure or API error) bypass the cache so a relinked or
 * refreshed OAuth token is not hidden behind a negative cache entry.
 */
export async function getCachedGitHubAccountPresentation(
  providerAccountId: string,
  accessToken: string | null,
): Promise<GitHubAccountPresentation> {
  if (!accessToken) {
    return { login: null, profileUrl: null, avatarUrl: null };
  }

  const cachedLoader = cachePublicCatalogRead(
    `github-presentation:${providerAccountId}`,
    ["github-presentation", providerAccountId],
    async () => {
      const presentation = await resolveGitHubAccountPresentation({
        access_token: accessToken,
      });
      if (!presentation.login) {
        throw new GitHubPresentationNotCacheable(presentation);
      }
      return presentation;
    },
    3600,
  );

  try {
    return await cachedLoader();
  } catch (error) {
    if (error instanceof GitHubPresentationNotCacheable) {
      return error.presentation;
    }
    throw error;
  }
}
