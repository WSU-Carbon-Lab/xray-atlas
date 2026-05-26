import type { PrismaClient } from "~/prisma/client";
import {
  isLegacyUserUuidSegment,
  orcidUserIdSchema,
} from "~/lib/orcid";

export { isLegacyUserUuidSegment } from "~/lib/orcid";

/**
 * Returns whether `segment` is a bare ORCID iD suitable for direct `user.id` lookup.
 */
export function isOrcidUserIdSegment(segment: string): boolean {
  return orcidUserIdSchema.safeParse(segment).success;
}

/**
 * Resolves a public user route segment to the canonical ORCID user id, including legacy UUID redirects.
 *
 * @returns Canonical `user.id` (ORCID iD), or `null` when the segment does not map to a user.
 */
export async function resolveUserIdFromRouteSegment(
  db: PrismaClient,
  segment: string,
): Promise<string | null> {
  if (isLegacyUserUuidSegment(segment)) {
    const legacy = await db.userLegacyIdRedirect.findUnique({
      where: { legacyUuid: segment },
    });
    return legacy?.orcidId ?? null;
  }
  const parsed = orcidUserIdSchema.safeParse(segment);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
