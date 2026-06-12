import type { ReactElement } from "react";
import { blogPostJsonLd } from "~/lib/content/blog-json-ld";
import type { BlogEntry } from "~/lib/content/blog-loader";

function serializeBlogJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Emits JSON-LD `BreadcrumbList` and `Article` script tags for a blog post.
 *
 * Server-only: must not be imported from client components.
 */
export function BlogPostJsonLdScript({
  entry,
}: {
  entry: BlogEntry;
}): ReactElement {
  const { breadcrumbList, article } = blogPostJsonLd(entry);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeBlogJsonLd(breadcrumbList),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeBlogJsonLd(article) }}
      />
    </>
  );
}
