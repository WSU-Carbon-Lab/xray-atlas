import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/sandbox/",
          "/sign-in/",
          "/cli/",
          "/contribute/",
          "/users/",
        ],
      },
    ],
    sitemap: "https://xrayatlas.wsu.edu/sitemap.xml",
  };
}
