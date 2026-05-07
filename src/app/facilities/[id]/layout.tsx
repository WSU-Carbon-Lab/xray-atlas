import type { Metadata } from "next";
import { db } from "~/server/db";

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

  return {
    title: `${facility.name} facility`,
    description: `${facility.name}${locationPhrase} with ${instrumentCount} registered instrument${instrumentCount === 1 ? "" : "s"} in X-ray Atlas.`,
    alternates: {
      canonical: `/facilities/${facility.id}`,
    },
    openGraph: {
      title: `${facility.name} | X-ray Atlas`,
      description: `${facility.name}${locationPhrase} with ${instrumentCount} registered instrument${instrumentCount === 1 ? "" : "s"}.`,
      url: `/facilities/${facility.id}`,
    },
  };
}

export default function FacilityDetailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
