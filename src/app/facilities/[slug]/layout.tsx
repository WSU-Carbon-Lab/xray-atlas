import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  canonicalFacilitySlugFromName,
  slugifyFacilityName,
} from "~/lib/facility-slug";
import { isFacilityUuidSegment } from "~/lib/facility-route";
import {
  getCachedFacilityPublicDetail,
  resolveCachedFacilityRoute,
} from "~/server/cache/facility-public-cache";
import type { FacilityType } from "~/prisma/browser";

function facilityTypeLabel(t: FacilityType): string {
  switch (t) {
    case "SYNCHROTRON":
      return "Synchrotron";
    case "FREE_ELECTRON_LASER":
      return "Free Electron Laser";
    case "LAB_SOURCE":
      return "Lab Source";
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: routeSlug } = await params;

  const facility = await resolveCachedFacilityRoute(routeSlug);

  if (!facility) {
    return {
      title: "Facility not found",
      robots: { index: false, follow: false },
    };
  }

  const canonicalSlug = canonicalFacilitySlugFromName(facility.name);
  const location = [facility.city, facility.country].filter(Boolean).join(", ");
  const locationPhrase = location ? ` in ${location}` : "";
  const typeShort = facilityTypeLabel(facility.facilitytype);

  const detail = await getCachedFacilityPublicDetail(facility.id);
  const instrumentCount = detail?._count.instruments ?? 0;
  const instrumentNames = (detail?.instruments ?? [])
    .slice(0, 2)
    .map((instrument) => instrument.name.trim())
    .filter(Boolean);
  const instrumentPhrase =
    instrumentNames.length > 0
      ? ` Notable instruments: ${instrumentNames.join(" and ")}.`
      : "";

  const description = `${facility.name} (${typeShort} facility)${locationPhrase}. ${instrumentCount} registered instrument${instrumentCount === 1 ? "" : "s"} in X-ray Atlas.${instrumentPhrase}`;

  return {
    title: `${facility.name} facility`,
    description,
    alternates: {
      canonical: `/facilities/${canonicalSlug}`,
    },
    openGraph: {
      title: `${facility.name} | X-ray Atlas`,
      description,
      url: `/facilities/${canonicalSlug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${facility.name} | X-ray Atlas`,
      description,
    },
  };
}

export default async function FacilityDetailLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug: routeSlug } = await params;
  const facility = await resolveCachedFacilityRoute(routeSlug);

  if (!facility) {
    notFound();
  }

  const canonicalSlug = canonicalFacilitySlugFromName(facility.name);
  const normalizedRouteSlug = slugifyFacilityName(routeSlug);

  if (
    isFacilityUuidSegment(routeSlug) ||
    normalizedRouteSlug !== canonicalSlug
  ) {
    redirect(`/facilities/${canonicalSlug}`);
  }

  return children;
}
