import { site } from "~/app/brand";
import {
  blogCategoryHref,
  getBlogCategory,
} from "~/lib/content/blog-categories";
import type { BlogEntry } from "~/lib/content/blog-loader";

interface BlogJsonLdBreadcrumbItem {
  name: string;
  item?: string;
}

/**
 * Builds JSON-LD `BreadcrumbList` and `Article` objects for a blog post page.
 */
export function blogPostJsonLd(entry: BlogEntry): {
  breadcrumbList: Record<string, unknown>;
  article: Record<string, unknown>;
} {
  const category = getBlogCategory(entry.frontmatter.category);
  const postUrl = `${site.url}/blog/${entry.slug}`;
  const categoryUrl = category
    ? `${site.url}${blogCategoryHref(category.slug)}`
    : undefined;

  const breadcrumbItems: BlogJsonLdBreadcrumbItem[] = [
    { name: "Home", item: site.url },
    { name: "Blog", item: `${site.url}/blog` },
  ];

  if (category) {
    breadcrumbItems.push({
      name: category.label,
      item: categoryUrl,
    });
  }

  breadcrumbItems.push({ name: entry.frontmatter.title });

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.item ? { item: crumb.item } : {}),
    })),
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.frontmatter.title,
    description: entry.frontmatter.description,
    datePublished: entry.frontmatter.date,
    author: entry.frontmatter.authors.map((name) => ({
      "@type": "Person",
      name,
    })),
    mainEntityOfPage: postUrl,
    url: postUrl,
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
  };

  return { breadcrumbList, article };
}
