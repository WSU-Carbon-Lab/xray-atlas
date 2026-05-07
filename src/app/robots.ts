import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/sandbox/", "/sign-in/", "/contribute/"],
      },
    ],
    sitemap: "https://xrayatlas.wsu.edu/sitemap.xml",
  };
}
