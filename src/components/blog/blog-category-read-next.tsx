import Link from "next/link";
import type { ReactElement } from "react";
import {
  blogCategoryHref,
  type BlogCategoryDefinition,
} from "~/lib/content/blog-categories";
import type { BlogEntry } from "~/lib/content/blog-loader";
import { formatBlogDate } from "~/lib/content/blog-presentation";

function ReadNextList({ posts }: { posts: BlogEntry[] }): ReactElement {
  return (
    <ul className="space-y-4">
      {posts.map((entry) => (
        <li key={entry.slug}>
          <Link
            href={`/blog/${entry.slug}`}
            className="group block no-underline"
          >
            <time
              dateTime={entry.frontmatter.date}
              className="text-muted text-xs"
            >
              {formatBlogDate(entry.frontmatter.date)}
            </time>
            <span className="text-foreground group-hover:text-accent mt-0.5 block text-sm leading-snug font-medium">
              {entry.frontmatter.title}
            </span>
            <span className="text-muted mt-1 line-clamp-2 text-xs leading-5">
              {entry.frontmatter.description}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Surfaces other posts in the same category beside or below the current article.
 *
 * The rail variant renders a compact sticky list for xl+ layouts; inline renders a
 * mobile-only section beneath the article body.
 */
export function BlogCategoryReadNext({
  posts,
  category,
  variant,
}: {
  posts: BlogEntry[];
  category: BlogCategoryDefinition;
  variant: "rail" | "inline";
}): ReactElement | null {
  if (posts.length === 0) {
    return null;
  }

  const headingId =
    variant === "rail" ? "blog-read-next-rail" : "blog-read-next-inline";

  if (variant === "rail") {
    return (
      <section aria-labelledby={headingId}>
        <h2
          id={headingId}
          className="text-foreground mb-3 text-sm font-medium"
        >
          Read next in {category.label}
        </h2>
        <ReadNextList posts={posts} />
        <Link
          href={blogCategoryHref(category.slug)}
          className="text-accent mt-4 inline-block text-sm font-medium no-underline hover:underline"
        >
          View all in {category.label}
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="border-border mt-12 border-t pt-8 xl:hidden"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={headingId}
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          More in {category.label}
        </h2>
        <Link
          href={blogCategoryHref(category.slug)}
          className="text-accent text-sm font-medium no-underline hover:underline"
        >
          View all
        </Link>
      </div>
      <ReadNextList posts={posts} />
    </section>
  );
}
