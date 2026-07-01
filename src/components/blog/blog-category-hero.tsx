import Link from "next/link";
import type { ReactElement } from "react";
import { BlogCategoryNav } from "~/components/blog/blog-category-nav";
import { CtaLink } from "~/components/content/embeds/cta-link";
import { type BlogCategorySlug } from "~/lib/content/blog-categories";
import type { BlogEntry } from "~/lib/content/blog-loader";
import { formatBlogDate } from "~/lib/content/blog-date-format";

const BLOG_STANDING_DESCRIPTION =
  "Announcements and engineering notes from the X-ray Atlas team.";

/**
 * Claude-style blog masthead with category navigation and a recent-post strip.
 *
 * Shared by `/blog` and `/blog/category/[category]`. On the blog index, pass
 * `categoryNavMode="hash"` so category picks filter via `location.hash` without
 * a full navigation. On category pages, `activeCategory` highlights the current
 * category and shows an **All posts** link back to `/blog`.
 */
export function BlogCategoryHero({
  activeCategory = null,
  categoryNavMode = "route",
  recentPosts,
  now,
}: {
  activeCategory?: BlogCategorySlug | null;
  categoryNavMode?: "hash" | "route";
  recentPosts: BlogEntry[];
  now?: Date;
}): ReactElement {
  const stripPosts = recentPosts.slice(0, 3);

  return (
    <section className="mb-12 space-y-10">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:items-start md:gap-8 lg:gap-10">
        <div className="space-y-4 md:space-y-5 lg:max-w-md">
          <div className="space-y-3 md:space-y-4">
            <h1 className="font-display text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-[2.75rem] lg:text-5xl">
              Blog
            </h1>
            <div className="bg-accent/70 h-0.5 w-12 rounded-full" aria-hidden />
            <p className="text-muted max-w-prose text-base leading-7 md:text-[0.9375rem] md:leading-6 lg:text-lg lg:leading-8">
              {BLOG_STANDING_DESCRIPTION}
            </p>
          </div>
          <div className="pt-1">
            <CtaLink href="/browse/nexafs">Browse the catalog</CtaLink>
          </div>
        </div>

        <BlogCategoryNav mode={categoryNavMode} activeCategory={activeCategory} />
      </div>

      {stripPosts.length >= 2 ? (
        <div className="border-border divide-border grid divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stripPosts.map((entry) => (
            <Link
              key={entry.slug}
              href={`/blog/${entry.slug}`}
              className="hover:bg-surface/60 block px-4 py-4 no-underline transition-colors sm:px-6 sm:py-5"
            >
              <time
                dateTime={entry.frontmatter.date}
                className="text-muted text-xs tracking-wide uppercase"
              >
                {formatBlogDate(entry.frontmatter.date, { relative: true, now })}
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
