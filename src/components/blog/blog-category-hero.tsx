import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
import Link from "next/link";
import type { ReactElement } from "react";
import { CtaLink } from "~/components/content/embeds/cta-link";
import {
  BLOG_CATEGORIES,
  blogCategoryHref,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";
import type { BlogEntry } from "~/lib/content/blog-loader";
import { formatBlogDate } from "~/lib/content/blog-presentation";

const BLOG_STANDING_DESCRIPTION =
  "Announcements and engineering notes from the X-ray Atlas team.";

/**
 * Claude-style blog masthead with category navigation and a recent-post strip.
 *
 * Shared by `/blog` and `/blog/category/[category]`. When `activeCategory` is set,
 * that category link uses foreground styling; otherwise all category links are muted.
 */
export function BlogCategoryHero({
  activeCategory = null,
  recentPosts,
}: {
  activeCategory?: BlogCategorySlug | null;
  recentPosts: BlogEntry[];
}): ReactElement {
  const stripPosts = recentPosts.slice(0, 3);

  return (
    <section className="mb-12 space-y-10">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
            Blog
          </h1>
          <p className="text-muted text-lg leading-8">
            {BLOG_STANDING_DESCRIPTION}
          </p>
          <CtaLink href="/browse/nexafs">Browse the catalog</CtaLink>
        </div>

        <nav aria-label="Blog categories" className="space-y-1">
          {BLOG_CATEGORIES.map((category) => {
            const isActive = activeCategory === category.slug;
            return (
              <Link
                key={category.slug}
                href={blogCategoryHref(category.slug)}
                className={cn(
                  "font-display group flex items-center justify-between gap-4 py-1 text-5xl leading-none font-normal tracking-tight no-underline transition-colors sm:text-6xl",
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                <span>{category.label}</span>
                <ArrowRightIcon
                  className={cn(
                    "size-8 shrink-0 transition-transform sm:size-10",
                    isActive
                      ? "translate-x-0 opacity-100"
                      : "opacity-0 group-hover:translate-x-1 group-hover:opacity-60",
                  )}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {stripPosts.length >= 2 ? (
        <div className="border-border divide-border grid divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stripPosts.map((entry) => (
            <Link
              key={entry.slug}
              href={`/blog/${entry.slug}`}
              className="hover:bg-surface/60 block px-0 py-4 no-underline transition-colors first:sm:pl-0 sm:px-6 sm:py-5"
            >
              <time
                dateTime={entry.frontmatter.date}
                className="text-muted text-xs tracking-wide uppercase"
              >
                {formatBlogDate(entry.frontmatter.date, { relative: true })}
              </time>
              <p className="text-foreground mt-2 text-sm leading-6 font-medium sm:text-base">
                {entry.frontmatter.title}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
