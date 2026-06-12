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
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] md:items-start md:gap-8 lg:gap-10">
        <div className="space-y-4 md:space-y-5 lg:max-w-md">
          <div className="space-y-3 md:space-y-4">
            <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-[2.75rem] lg:text-5xl">
              Blog
            </h1>
            <div
              className="bg-accent/70 h-0.5 w-12 rounded-full"
              aria-hidden
            />
            <p className="text-muted max-w-prose text-base leading-7 md:text-[0.9375rem] md:leading-6 lg:text-lg lg:leading-8">
              {BLOG_STANDING_DESCRIPTION}
            </p>
          </div>
          <div className="pt-1">
            <CtaLink href="/browse/nexafs">Browse the catalog</CtaLink>
          </div>
        </div>

        <nav
          aria-label="Blog categories"
          className="space-y-0.5 md:space-y-1 md:pt-1"
        >
          {BLOG_CATEGORIES.map((category) => {
            const isActive = activeCategory === category.slug;
            return (
              <Link
                key={category.slug}
                href={blogCategoryHref(category.slug)}
                className={cn(
                  "font-display group flex items-center justify-between gap-3 py-1 text-3xl leading-none font-normal tracking-tight no-underline transition-colors sm:text-4xl md:text-[2rem] lg:text-5xl xl:text-6xl",
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                <span>{category.label}</span>
                <ArrowRightIcon
                  className={cn(
                    "size-6 shrink-0 transition-transform sm:size-7 md:size-7 lg:size-8 xl:size-10",
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
