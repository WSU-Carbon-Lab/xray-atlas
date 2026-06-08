import type { PrismaClient } from "~/prisma/client";
import {
  canonicalFacilitySlugFromName,
  slugifyFacilityName,
} from "~/lib/facility-slug";

const FACILITY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns whether `segment` matches a facility primary-key UUID shape.
 */
export function isFacilityUuidSegment(segment: string): boolean {
  return FACILITY_UUID_RE.test(segment);
}

/**
 * Builds the canonical public facility detail path for `slug`, optionally scrolling to
 * `instrumentId` via the `#instrument-{id}` fragment.
 */
export function facilityDetailHref(
  slug: string,
  instrumentId?: string,
): string {
  const base = `/facilities/${encodeURIComponent(slug)}`;
  if (!instrumentId) {
    return base;
  }
  return `${base}#instrument-${encodeURIComponent(instrumentId)}`;
}

/**
 * Builds the canonical facility detail path from a facility display `name`.
 */
export function facilityDetailHrefFromName(
  name: string,
  instrumentId?: string,
): string {
  return facilityDetailHref(
    canonicalFacilitySlugFromName(name),
    instrumentId,
  );
}

const facilityRouteSelect = {
  id: true,
  name: true,
  city: true,
  country: true,
  facilitytype: true,
} as const;

export type FacilityRouteRecord = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  facilitytype: "SYNCHROTRON" | "FREE_ELECTRON_LASER" | "LAB_SOURCE";
};

/**
 * Resolves a `/facilities/[segment]` route parameter to a facility row by UUID or by
 * slug derived from the unique facility `name`.
 *
 * @returns The matching facility, or `null` when `segment` does not resolve.
 */
export async function resolveFacilityByRouteSegment(
  db: PrismaClient,
  segment: string,
): Promise<FacilityRouteRecord | null> {
  if (isFacilityUuidSegment(segment)) {
    return db.facilities.findUnique({
      where: { id: segment },
      select: facilityRouteSelect,
    });
  }

  const normalizedSlug = slugifyFacilityName(segment);
  const facilities = await db.facilities.findMany({
    select: facilityRouteSelect,
  });

  const matches = facilities.filter(
    (facility) => slugifyFacilityName(facility.name) === normalizedSlug,
  );

  if (matches.length === 0) {
    return null;
  }

  return matches[0] ?? null;
}
