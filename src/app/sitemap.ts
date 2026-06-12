import { type MetadataRoute } from "next";
import { site } from "~/app/brand";
import { canonicalFacilitySlugFromName } from "~/lib/facility-slug";
import { BLOG_CATEGORIES } from "~/lib/content/blog-categories";
import { getBlogEntries, isListableBlogEntry } from "~/lib/content/blog-loader";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import { db } from "~/server/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseUrl = site.url;

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
      select: { id: true, name: true },
      take: 1000,
    }),
  ]);

  const moleculeEntries: MetadataRoute.Sitemap = molecules.map((molecule) => {
    const primarySynonym =
      molecule.moleculesynonyms[0]?.synonym?.trim() ?? molecule.id;
    const slug = slugifyMoleculeSynonym(primarySynonym);
    return {
      url: `${baseUrl}/molecules/${slug}`,
      lastModified: molecule.createdat ?? now,
      changeFrequency: "weekly",
      priority: 0.75,
    };
  });

  const facilityEntries: MetadataRoute.Sitemap = facilities.map((facility) => ({
    url: `${baseUrl}/facilities/${canonicalFacilitySlugFromName(facility.name)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  const blogEntries = await getBlogEntries();
  const blogSitemapEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...BLOG_CATEGORIES.map((category) => ({
      url: `${baseUrl}/blog/category/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
    ...blogEntries
      .filter(isListableBlogEntry)
      .map((entry) => ({
        url: `${baseUrl}/blog/${entry.slug}`,
        lastModified: new Date(`${entry.frontmatter.date}T12:00:00.000Z`),
        changeFrequency: "monthly" as const,
        priority: 0.65,
      })),
  ];

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
      url: `${baseUrl}/wiki`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/wiki/nexafs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/wiki/nexafs/terminology`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/wiki/nexafs/quantities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/wiki/nexafs/optical-constants`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/wiki/atlas`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/wiki/atlas/data-model`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/wiki/atlas/uploading-data`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/wiki/atlas/quality-metrics`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/wiki/atlas/contributing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    ...moleculeEntries,
    ...facilityEntries,
    ...blogSitemapEntries,
  ];
}
