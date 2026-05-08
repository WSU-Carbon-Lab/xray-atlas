import type { Metadata } from "next";
import { db } from "~/server/db";
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
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const facility = await db.facilities.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      facilitytype: true,
      instruments: {
        select: { name: true },
        orderBy: { name: "asc" },
        take: 2,
      },
      _count: { select: { instruments: true } },
    },
  });

  if (!facility) {
    return {
      title: "Facility not found",
      robots: { index: false, follow: false },
    };
  }

  const location = [facility.city, facility.country].filter(Boolean).join(", ");
  const locationPhrase = location ? ` in ${location}` : "";
  const instrumentCount = facility._count.instruments;
  const typeShort = facilityTypeLabel(facility.facilitytype);
  const instrumentNames = facility.instruments.map((i) => i.name.trim()).filter(Boolean);
  const instrumentPhrase =
    instrumentNames.length > 0
      ? ` Notable instruments: ${instrumentNames.join(" and ")}.`
      : "";

  const description = `${facility.name} (${typeShort} facility)${locationPhrase}. ${instrumentCount} registered instrument${instrumentCount === 1 ? "" : "s"} in X-ray Atlas.${instrumentPhrase}`;

  return {
    title: `${facility.name} facility`,
    description,
    alternates: {
      canonical: `/facilities/${facility.id}`,
    },
    openGraph: {
      title: `${facility.name} | X-ray Atlas`,
      description,
      url: `/facilities/${facility.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${facility.name} | X-ray Atlas`,
      description,
    },
  };
}

export default function FacilityDetailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
