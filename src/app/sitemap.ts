import { type MetadataRoute } from "next";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import { db } from "~/server/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseUrl = "https://xrayatlas.wsu.edu";

  const [molecules, facilities] = await Promise.all([
    db.molecules.findMany({
      select: {
        id: true,
        createdat: true,
        moleculesynonyms: {
          select: { synonym: true, order: true },
          orderBy: [{ order: "asc" }, { synonym: "asc" }],
          take: 1,
        },
      },
      take: 1000,
    }),
    db.facilities.findMany({
      select: { id: true },
      take: 1000,
    }),
  ]);

  const moleculeEntries: MetadataRoute.Sitemap = molecules.map((molecule) => {
    const primarySynonym = molecule.moleculesynonyms[0]?.synonym?.trim() ?? molecule.id;
    const slug = slugifyMoleculeSynonym(primarySynonym);
    return {
      url: `${baseUrl}/molecules/${slug}`,
      lastModified: molecule.createdat ?? now,
      changeFrequency: "weekly",
      priority: 0.75,
    };
  });

  const facilityEntries: MetadataRoute.Sitemap = facilities.map((facility) => ({
    url: `${baseUrl}/facilities/${facility.id}`,
  lastModified: now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/browse/molecules`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/browse/nexafs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/browse/facilities`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/wiki/home`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/wiki/data-representation`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/wiki/platform-features`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/wiki/contributions`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/wiki/data-insights`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    ...moleculeEntries,
    ...facilityEntries,
  ];
}
