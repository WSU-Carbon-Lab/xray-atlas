import { orcidOidcUserinfoUrl } from "~/server/auth/orcid-oidc-config";

export interface OrcidUserinfoProfile {
  sub: string;
  name?: string;
  family_name?: string;
  given_name?: string;
  email?: string;
}

function displayNameFromUserinfo(profile: OrcidUserinfoProfile): string | null {
  if (profile.name && profile.name.trim().length > 0) {
    return profile.name.trim();
  }
  const combined = `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim();
  return combined.length > 0 ? combined : null;
}

/**
 * Fetches the ORCID userinfo profile for a bearer access token (spec section 5.4).
 *
 * @param accessToken - OAuth access token from the linked ORCID account.
 * @returns Parsed userinfo fields, or `null` on HTTP/network failure.
 */
export async function fetchOrcidUserinfo(
  accessToken: string,
): Promise<OrcidUserinfoProfile | null> {
  try {
    const response = await fetch(orcidOidcUserinfoUrl(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return null;
    }
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) {
      return null;
    }
    const record = body as Record<string, unknown>;
    const sub = record.sub;
    if (typeof sub !== "string") {
      return null;
    }
    return {
      sub,
      name: typeof record.name === "string" ? record.name : undefined,
      family_name:
        typeof record.family_name === "string" ? record.family_name : undefined,
      given_name:
        typeof record.given_name === "string" ? record.given_name : undefined,
      email: typeof record.email === "string" ? record.email : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * JIT-enriches `user.name` from ORCID userinfo when the stored name is empty.
 *
 * Email is not persisted on `user` (spec section 2.2); userinfo email is ignored here.
 *
 * @param db - Prisma client.
 * @param userId - Bare ORCID iD (`next_auth.user.id`).
 * @param accessToken - ORCID OAuth access token for the user.
 */
export async function enrichUserProfileFromOrcidUserinfo(
  db: {
    user: {
      findUnique: (args: {
        where: { id: string };
        select: { name: true };
      }) => Promise<{ name: string | null } | null>;
      update: (args: {
        where: { id: string };
        data: { name: string };
      }) => Promise<unknown>;
    };
  },
  userId: string,
  accessToken: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user || (user.name && user.name.trim().length > 0)) {
    return;
  }

  const profile = await fetchOrcidUserinfo(accessToken);
  if (!profile) {
    return;
  }

  const displayName = displayNameFromUserinfo(profile);
  if (!displayName) {
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: { name: displayName },
  });
}
