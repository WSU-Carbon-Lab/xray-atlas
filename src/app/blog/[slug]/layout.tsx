import type { ReactElement, ReactNode } from "react";
import { BlogPostJsonLdScript } from "~/components/blog/blog-json-ld-script";
import {
  getBlogEntryBySlug,
  isListableBlogEntry,
} from "~/lib/content/blog-loader";

interface BlogPostLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Blog post segment layout: injects JSON-LD at the route boundary so script tags
 * are not composed inside the post page fragment passed through client providers.
 */
export default async function BlogPostLayout({
  children,
  params,
}: BlogPostLayoutProps): Promise<ReactElement> {
  const { slug } = await params;
  const entry = await getBlogEntryBySlug(slug);

  if (
    !entry ||
    (entry.frontmatter.draft && process.env.NODE_ENV === "production") ||
    (!isListableBlogEntry(entry) && process.env.NODE_ENV === "production")
  ) {
    return <>{children}</>;
  }

  return (
    <>
      <BlogPostJsonLdScript entry={entry} />
      {children}
    </>
  );
}
