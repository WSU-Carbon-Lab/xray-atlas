import { type MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: "https://xrayatlas.wsu.edu",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://xrayatlas.wsu.edu/browse",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://xrayatlas.wsu.edu/browse/molecules",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://xrayatlas.wsu.edu/browse/nexafs",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://xrayatlas.wsu.edu/contribute",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://xrayatlas.wsu.edu/facilities",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://xrayatlas.wsu.edu/about",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: "https://xrayatlas.wsu.edu/wiki/home",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: "https://xrayatlas.wsu.edu/wiki/data-representation",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: "https://xrayatlas.wsu.edu/wiki/platform-features",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: "https://xrayatlas.wsu.edu/wiki/contributions",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
  ];
}
