import Link from "next/link";
import type { ReactElement } from "react";
import { BlogFeaturedAuthor } from "~/components/blog/blog-author-byline";
import { BlogTile } from "~/components/blog/blog-tile";
import { getBlogCategory } from "~/lib/content/blog-categories";
import type { BlogEntry } from "~/lib/content/blog-loader";
import {
  formatBlogDate,
  resolveBlogHeroImageUrl,
} from "~/lib/content/blog-presentation";

function BlogPostImage({
  entry,
  className,
}: {
  entry: BlogEntry;
  className?: string;
}): ReactElement {
  if (entry.frontmatter.heroImage) {
    const src = resolveBlogHeroImageUrl(entry.frontmatter.heroImage);
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <BlogTile
      slug={entry.slug}
      title={entry.frontmatter.title}
      className={className}
    />
  );
}

function categoryKicker(entry: BlogEntry): string {
  return (
    getBlogCategory(entry.frontmatter.category)?.kicker ??
    entry.frontmatter.category
  );
}

/** Large featured card for the newest post on blog index and category pages. */
export function FeaturedPostCard({
  entry,
}: {
  entry: BlogEntry;
}): ReactElement {
  return (
    <article className="border-border bg-surface overflow-hidden rounded-2xl border">
      <Link
        href={`/blog/${entry.slug}`}
        className="grid no-underline lg:grid-cols-2"
      >
        <div className="relative min-h-52 overflow-hidden lg:min-h-full">
          <BlogPostImage
            entry={entry}
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-accent font-semibold tracking-[0.16em] uppercase">
              {categoryKicker(entry)}
            </span>
            <time dateTime={entry.frontmatter.date} className="text-muted">
              {formatBlogDate(entry.frontmatter.date, { relative: true })}
            </time>
          </div>
          <h2 className="font-display text-foreground text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {entry.frontmatter.title}
          </h2>
          <p className="text-muted text-base leading-7">
            {entry.frontmatter.description}
          </p>
          <BlogFeaturedAuthor authors={entry.frontmatter.authors} />
          <span className="text-accent text-sm font-medium">Read post</span>
        </div>
      </Link>
    </article>
  );
}

/** Compact grid card for secondary posts on blog index and category pages. */
export function GridPostCard({ entry }: { entry: BlogEntry }): ReactElement {
  return (
    <article className="border-border bg-surface overflow-hidden rounded-xl border">
      <Link href={`/blog/${entry.slug}`} className="block no-underline">
        <div className="aspect-[16/10] overflow-hidden">
          <BlogPostImage entry={entry} className="h-full w-full" />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-accent font-semibold tracking-[0.14em] uppercase">
              {categoryKicker(entry)}
            </span>
            <time dateTime={entry.frontmatter.date} className="text-muted">
              {formatBlogDate(entry.frontmatter.date, { relative: true })}
            </time>
          </div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            {entry.frontmatter.title}
          </h2>
          <p className="text-muted line-clamp-3 text-sm leading-6">
            {entry.frontmatter.description}
          </p>
        </div>
      </Link>
    </article>
  );
}
